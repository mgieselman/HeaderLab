#!/usr/bin/env python3
"""Deterministic publish workflow for HeaderLab.

Steps:
1) Validate tools and branch
2) Run local validation commands
3) Run review gates (code-review, security-review, doc-sync)
4) Optionally commit pending changes
5) Push to main
6) Monitor GitHub Actions workflows to completion
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, List, Set

POLL_SECONDS = 10
TIMEOUT_SECONDS = 600
LIVE_SITE_URL = "https://headerlab.gieselman.com"
LIVE_SITE_TIMEOUT_SECONDS = 300
LIVE_SITE_POLL_SECONDS = 15
REQUIRED_TOOLS = ["git", "npm", "gh"]
VALIDATION_COMMANDS: List[List[str]] = [
    ["npm", "run", "lint"],
    ["npx", "tsc", "--noEmit"],
    ["npm", "test"],
    ["npm", "run", "build"],
    ["npm", "run", "size"],
]

WORKFLOW_NAMES = {"test", "build and deploy headerlab"}

# Files always allowed to change without being listed in a plan file.
ALWAYS_ALLOWED = {
    "package-lock.json",
}

# Directories whose contents are always allowed to change.
ALWAYS_ALLOWED_DIRS = (
    "docs/plans/",
)

# Outlook add-in <Permissions> levels, ordered least → most permissive.
# These are the only valid values in the XML manifest; the unified manifest
# uses Graph-style permission names which are compared separately.
PERMISSION_ORDER = ["Restricted", "ReadItem", "ReadWriteItem", "ReadWriteMailbox"]

# Secret-pattern regexes scanned over diffs.
SECRET_PATTERNS = [
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS access key ID"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "PEM private key"),
    (re.compile(r"xox[baprs]-[0-9a-zA-Z-]{10,}"), "Slack token"),
    (re.compile(r"ghp_[A-Za-z0-9]{36}"), "GitHub personal access token"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{82}"), "GitHub fine-grained PAT"),
    (re.compile(r"AIza[0-9A-Za-z_\-]{35}"), "Google API key"),
    (re.compile(r"sk-[A-Za-z0-9]{32,}"), "OpenAI/Anthropic-style secret key"),
]


def run(cmd: List[str], check: bool = True, capture: bool = False) -> subprocess.CompletedProcess[str]:
    print("+ " + " ".join(cmd))
    return subprocess.run(
        cmd,
        check=check,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
    )


def fail(message: str, code: int = 1) -> None:
    print(message)
    sys.exit(code)


def ensure_tools() -> None:
    missing = [tool for tool in REQUIRED_TOOLS if shutil.which(tool) is None]
    if missing:
        fail("Missing required tools: " + ", ".join(missing), 2)


def current_branch() -> str:
    result = run(["git", "branch", "--show-current"], capture=True)
    return (result.stdout or "").strip()


def ensure_main_branch() -> None:
    branch = current_branch()
    if branch != "main":
        fail(f"Refusing to publish from branch '{branch}'. Switch to main first.", 2)


def has_uncommitted_changes() -> bool:
    result = run(["git", "status", "--porcelain"], capture=True)
    return bool((result.stdout or "").strip())


def validate_local() -> None:
    print("Running local validation...")
    for command in VALIDATION_COMMANDS:
        return_code = run(command, check=False).returncode
        if return_code != 0:
            fail("Validation failed on: " + " ".join(command), return_code)


# ---------- diff helpers ----------

def diff_files_vs_origin() -> List[str]:
    """Files differing from origin/main, including uncommitted changes."""
    run(["git", "fetch", "origin", "main"], check=False, capture=True)
    tracked = run(
        ["git", "diff", "--name-only", "origin/main...HEAD"],
        check=False,
        capture=True,
    )
    working = run(
        ["git", "diff", "--name-only", "HEAD"],
        check=False,
        capture=True,
    )
    untracked = run(
        ["git", "ls-files", "--others", "--exclude-standard"],
        check=False,
        capture=True,
    )
    files: Set[str] = set()
    for output in (tracked.stdout, working.stdout, untracked.stdout):
        for line in (output or "").splitlines():
            line = line.strip()
            if not line:
                continue
            # Filter git warnings that leak in because run() merges stderr into stdout.
            if line.startswith("warning:") or line.startswith("hint:") or line.startswith("error:"):
                continue
            files.add(line)
    return sorted(files)


def diff_text_vs_origin() -> str:
    run(["git", "fetch", "origin", "main"], check=False, capture=True)
    parts: List[str] = []
    for cmd in (
        ["git", "diff", "origin/main...HEAD"],
        ["git", "diff", "HEAD"],
    ):
        result = run(cmd, check=False, capture=True)
        parts.append(result.stdout or "")
    return "\n".join(parts)


# ---------- gate 1: code-review ----------

PATH_LIKE = re.compile(r"`([A-Za-z0-9_./\\-]+)`")


def collect_planned_paths(repo_root: Path) -> Set[str]:
    """Extract backtick-wrapped paths from every plan file under docs/plans/."""
    plans_dir = repo_root / "docs" / "plans"
    paths: Set[str] = set()
    if not plans_dir.is_dir():
        return paths
    for plan in plans_dir.glob("*.md"):
        text = plan.read_text(encoding="utf-8", errors="replace")
        for match in PATH_LIKE.findall(text):
            # Heuristic: must look like a relative path with an extension
            # or start with .github/ src/ public/ docs/, or be a dotfile
            # name (.gitignore, .eslintrc, etc).
            if "/" in match or any(
                match.startswith(prefix) for prefix in (".github", "src/", "public/", "docs/")
            ):
                paths.add(match)
            elif "." in match[1:]:
                paths.add(match)
            elif match.startswith(".") and len(match) > 1:
                paths.add(match)
    return paths


def is_path_allowed(path: str, allowed: Set[str]) -> bool:
    if path in ALWAYS_ALLOWED:
        return True
    if any(path.startswith(prefix) for prefix in ALWAYS_ALLOWED_DIRS):
        return True
    if path in allowed:
        return True
    # Allow if any planned path is the same after directory normalization
    for candidate in allowed:
        if candidate == path:
            return True
    return False


def gate_code_review(diff_files: List[str], repo_root: Path) -> None:
    print("\n=== Gate: code-review ===")
    if not diff_files:
        print("No diff vs origin/main. Skipping.")
        return
    planned = collect_planned_paths(repo_root)
    if not planned:
        fail(
            "Code-review gate: no plan files found under docs/plans/. "
            "Add a plan file declaring the files this change touches.",
            3,
        )
    unexpected = [f for f in diff_files if not is_path_allowed(f, planned)]
    if unexpected:
        print("Unexpected files in diff (not declared in any docs/plans/*.md):")
        for f in unexpected:
            print(f"  - {f}")
        print("Action: add these paths to the active plan file (in backticks), or revert them.")
        fail("Code-review gate failed.", 3)
    print(f"Code-review gate passed: {len(diff_files)} file(s), all declared in plans.")


# ---------- gate 2: security-review ----------

def parse_xml_permissions(path: Path) -> str | None:
    if not path.is_file():
        return None
    try:
        tree = ET.parse(path)
        root = tree.getroot()
        # Strip namespace if present.
        for elem in root.iter():
            if elem.tag.endswith("Permissions"):
                return (elem.text or "").strip()
    except ET.ParseError:
        return None
    return None


def parse_xml_permissions_from_blob(content: str) -> str | None:
    if not content:
        return None
    try:
        root = ET.fromstring(content)
        for elem in root.iter():
            if elem.tag.endswith("Permissions"):
                return (elem.text or "").strip()
    except ET.ParseError:
        return None
    return None


def permission_rank(level: str | None) -> int:
    if level is None:
        return -1
    try:
        return PERMISSION_ORDER.index(level)
    except ValueError:
        # Unknown permission level — treat as more permissive than any known one.
        return len(PERMISSION_ORDER)


def parse_csp_connect_src(json_text: str) -> Set[str]:
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError:
        return set()
    csp = (data.get("globalHeaders") or {}).get("Content-Security-Policy", "")
    hosts: Set[str] = set()
    for directive in csp.split(";"):
        parts = directive.strip().split()
        if not parts or parts[0].lower() != "connect-src":
            continue
        for token in parts[1:]:
            hosts.add(token)
    return hosts


def file_at_origin(path: str) -> str | None:
    """Return file contents at origin/main, or None if absent."""
    result = run(
        ["git", "show", f"origin/main:{path}"],
        check=False,
        capture=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout


def gate_security_review(diff_files: List[str], diff_text: str, repo_root: Path, message: str | None) -> None:
    print("\n=== Gate: security-review ===")
    permission_upgrade_acked = bool(message and "[permission-upgrade]" in message)

    # 2a. npm audit on production deps
    audit = run(["npm", "audit", "--omit=dev", "--audit-level=high"], check=False, capture=True)
    if audit.returncode != 0:
        print(audit.stdout or "")
        fail("npm audit found high/critical vulnerabilities in production deps.", 4)
    print("npm audit clean (high/critical) on production deps.")

    # 2b. secret patterns in diff
    secret_hits: List[str] = []
    for pattern, label in SECRET_PATTERNS:
        for match in pattern.findall(diff_text):
            secret_hits.append(f"{label}: {match[:8]}...")
    if secret_hits:
        print("Possible secrets detected in diff:")
        for hit in secret_hits:
            print(f"  - {hit}")
        fail("Security-review gate: refusing to publish with apparent secrets in diff.", 4)
    print("No secret patterns matched in diff.")

    # 2c. manifest <Permissions> non-regression
    for manifest_name in ("Manifest.xml", "ManifestDebugLocal.xml"):
        manifest_path = repo_root / manifest_name
        new_level = parse_xml_permissions(manifest_path)
        old_blob = file_at_origin(manifest_name)
        old_level = parse_xml_permissions_from_blob(old_blob) if old_blob else None
        if new_level is None:
            print(f"  {manifest_name}: no <Permissions> element found (skipping check)")
            continue
        if old_level is None:
            print(f"  {manifest_name}: no baseline at origin/main, current = {new_level}")
            continue
        if permission_rank(new_level) > permission_rank(old_level):
            if permission_upgrade_acked:
                print(
                    f"  {manifest_name}: {old_level} -> {new_level} (UPGRADE acknowledged via [permission-upgrade])"
                )
            else:
                fail(
                    f"Security-review gate: {manifest_name} <Permissions> upgraded from "
                    f"'{old_level}' to '{new_level}' (more permissive). "
                    "Add [permission-upgrade] to the commit message if intentional.",
                    4,
                )
        else:
            print(f"  {manifest_name}: {old_level} -> {new_level} (no regression)")

    # 2d. CSP connect-src non-regression
    for csp_name in ("staticwebapp.config.json", "public/staticwebapp.config.json"):
        csp_path = repo_root / csp_name
        if not csp_path.is_file():
            continue
        new_hosts = parse_csp_connect_src(csp_path.read_text(encoding="utf-8"))
        old_blob = file_at_origin(csp_name)
        if old_blob is None:
            print(f"  {csp_name}: no baseline at origin/main, current connect-src = {sorted(new_hosts)}")
            continue
        old_hosts = parse_csp_connect_src(old_blob)
        if not old_hosts:
            # Baseline had no CSP / no connect-src — adding one is tightening, not regression.
            print(
                f"  {csp_name}: baseline had no connect-src; new = {sorted(new_hosts)} (tightening, accepted)"
            )
            continue
        added = new_hosts - old_hosts
        if added:
            fail(
                f"Security-review gate: {csp_name} connect-src added new hosts: {sorted(added)}",
                4,
            )
        print(f"  {csp_name}: connect-src non-regression OK ({len(new_hosts)} host(s))")


# ---------- gate 3: doc-sync ----------

DOC_FILES = ("README.md", "PRIVACY.md", "SECURITY.md", "CLAUDE.md", "PLAN.md")


def gate_doc_sync(diff_files: List[str], message: str | None) -> None:
    print("\n=== Gate: doc-sync ===")
    src_changed = any(f.startswith("src/Scripts/") for f in diff_files)
    if not src_changed:
        print("No src/Scripts/ changes — skipping.")
        return
    if message and "[no-docs]" in message:
        print("Commit message contains [no-docs] — skipping.")
        return
    docs_in_diff = [f for f in diff_files if f in DOC_FILES]
    if not docs_in_diff:
        print(
            "src/Scripts/ changed but no top-level doc file is in the diff "
            f"({', '.join(DOC_FILES)})."
        )
        print("Either update the relevant doc(s) or include [no-docs] in the commit message.")
        fail("Doc-sync gate failed.", 5)
    print(f"Doc-sync gate passed: docs touched = {docs_in_diff}")


# ---------- existing flow ----------

def commit_if_needed(message: str | None) -> None:
    if not has_uncommitted_changes():
        print("Working tree is clean. No commit needed.")
        return

    if not message:
        fail("Working tree has changes. Re-run with --message to commit before publish.", 2)

    print("Committing pending changes...")
    run(["git", "add", "-A"])
    return_code = run(["git", "commit", "-m", message], check=False).returncode
    if return_code != 0:
        fail("Commit failed.", return_code)


def push_main() -> str:
    print("Pushing to origin/main...")
    run(["git", "push", "origin", "main"])
    result = run(["git", "rev-parse", "HEAD"], capture=True)
    return (result.stdout or "").strip()


def get_recent_push_runs(commit_sha: str) -> List[dict[str, Any]]:
    result = run(
        [
            "gh",
            "run",
            "list",
            "--commit",
            commit_sha,
            "--event",
            "push",
            "--limit",
            "10",
            "--json",
            "databaseId,name,status,conclusion,displayTitle,createdAt,headSha,url",
        ],
        capture=True,
    )

    runs = json.loads(result.stdout or "[]")
    filtered: List[dict[str, Any]] = []
    for run_data in runs:
        name = str(run_data.get("name", "")).strip().lower()
        if name in WORKFLOW_NAMES:
            filtered.append(run_data)
    return filtered


def dump_failed_run_logs(run_data: dict[str, Any]) -> None:
    """Fetch the failing-step logs for a CI run so Claude can diagnose."""
    run_id = run_data.get("databaseId")
    if run_id is None:
        return
    name = run_data.get("name", "?")
    conclusion = run_data.get("conclusion", "?")
    url = run_data.get("url") or ""
    print(f"\n--- Failed run logs: {name} ({conclusion}) ---")
    if url:
        print(f"URL: {url}")
    result = run(
        ["gh", "run", "view", str(run_id), "--log-failed"],
        check=False,
        capture=True,
    )
    output = (result.stdout or "").strip()
    if output:
        # Cap very long logs so we don't dump megabytes.
        lines = output.splitlines()
        if len(lines) > 400:
            head = lines[:200]
            tail = lines[-200:]
            output = "\n".join(head + [f"... [{len(lines) - 400} lines elided] ..."] + tail)
        print(output)
    else:
        print("(no --log-failed output; run view failed or logs not yet available)")
    print(f"--- end logs for run {run_id} ---\n")


def monitor_ci(commit_sha: str) -> None:
    print("Monitoring GitHub Actions workflows...")
    deadline = time.time() + TIMEOUT_SECONDS
    expected = set(WORKFLOW_NAMES)

    while time.time() < deadline:
        runs = get_recent_push_runs(commit_sha)
        if not runs:
            print(f"No push workflows found yet for commit {commit_sha[:7]}. Waiting...")
            time.sleep(POLL_SECONDS)
            continue

        observed_names = {str(r.get("name", "")).strip().lower() for r in runs}
        missing = expected - observed_names

        print("Current workflow status:")
        for run_data in runs:
            print(f"- {run_data.get('name')}: {run_data.get('status')} / {run_data.get('conclusion')}")

        if missing:
            print("Still waiting for workflows: " + ", ".join(sorted(missing)))
            time.sleep(POLL_SECONDS)
            continue

        incomplete = [r for r in runs if r.get("status") != "completed"]
        if incomplete:
            time.sleep(POLL_SECONDS)
            continue

        failed = [r for r in runs if r.get("conclusion") != "success"]
        if failed:
            print("CI workflow failures detected:")
            for run_data in failed:
                print(f"- {run_data.get('name')} ({run_data.get('conclusion')})")
            for run_data in failed:
                dump_failed_run_logs(run_data)
            print(
                "Read the failure output above, fix the root cause locally, then re-run "
                "the publish skill with a new commit message."
            )
            sys.exit(1)

        print("All relevant workflows completed successfully.")
        return

    fail("Timed out waiting for workflow completion.", 1)


# ---------- live-site verification ----------

_SSL_CTX = ssl.create_default_context()


def http_get(url: str, timeout: int = 20) -> tuple[int, dict[str, str], str]:
    req = urllib.request.Request(url, headers={"User-Agent": "headerlab-publish/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, headers, body
    except urllib.error.HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        headers = {k.lower(): v for k, v in (exc.headers.items() if exc.headers else [])}
        return exc.code, headers, body


_ASSET_RE = re.compile(r'(?:src|href)="(/assets/[A-Za-z0-9_.\-]+\.js)"')


def verify_live_site(commit_sha: str) -> None:
    print(f"\n=== Live-site verification ({LIVE_SITE_URL}) ===")
    short_sha = commit_sha[:7]
    deadline = time.time() + LIVE_SITE_TIMEOUT_SECONDS
    last_reason = "no attempt yet"

    while time.time() < deadline:
        try:
            status, headers, body = http_get(f"{LIVE_SITE_URL}/headerlab.html")
            if status != 200:
                last_reason = f"/headerlab.html returned HTTP {status}"
                time.sleep(LIVE_SITE_POLL_SECONDS)
                continue

            csp = headers.get("content-security-policy", "")
            if "graph.microsoft.com" in csp or "login.microsoftonline" in csp:
                last_reason = "stale CSP still references Graph/login hosts"
                time.sleep(LIVE_SITE_POLL_SECONDS)
                continue

            assets = sorted(set(_ASSET_RE.findall(body)))
            if not assets:
                last_reason = "could not find any JS asset reference in /headerlab.html"
                time.sleep(LIVE_SITE_POLL_SECONDS)
                continue

            # __VERSION__ is bundled into whichever chunk imports Diagnostics.ts —
            # not necessarily the entry chunk. Scan every asset and pass if any
            # of them contains the just-pushed commit's short SHA.
            sha_seen = False
            asset_errors: List[str] = []
            for asset in assets:
                asset_status, _, asset_body = http_get(f"{LIVE_SITE_URL}{asset}")
                if asset_status != 200:
                    asset_errors.append(f"{asset} HTTP {asset_status}")
                    continue
                if short_sha in asset_body:
                    sha_seen = True
                    print(f"  Found {short_sha} in {asset}")
                    break

            if not sha_seen:
                if asset_errors:
                    last_reason = (
                        f"commit SHA {short_sha} not found in any of {len(assets)} asset(s); "
                        f"some failed to fetch: {asset_errors}"
                    )
                else:
                    last_reason = (
                        f"commit SHA {short_sha} not found in any of {len(assets)} asset(s) "
                        "(likely CDN propagation lag)"
                    )
                time.sleep(LIVE_SITE_POLL_SECONDS)
                continue

            print(f"Live site serves commit {short_sha} with tightened CSP. Verified.")
            return
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_reason = f"network error: {exc}"
            time.sleep(LIVE_SITE_POLL_SECONDS)

    fail(
        f"Live-site verification timed out after {LIVE_SITE_TIMEOUT_SECONDS}s. "
        f"Last reason: {last_reason}.",
        6,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate, push, and monitor CI for HeaderLab.")
    parser.add_argument(
        "--message",
        help="Commit message to use if local changes exist before publishing.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run all gates and validation but do not commit, push, or monitor CI.",
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="Skip the lint/test/build/size suite (used for fast gate-only dry runs).",
    )
    return parser.parse_args()


def repo_root() -> Path:
    result = run(["git", "rev-parse", "--show-toplevel"], capture=True)
    return Path((result.stdout or "").strip())


def main() -> None:
    args = parse_args()
    ensure_tools()
    ensure_main_branch()

    root = repo_root()

    if not args.skip_validation:
        validate_local()
    else:
        print("Skipping local validation (--skip-validation).")

    diff_files = diff_files_vs_origin()
    diff_text = diff_text_vs_origin()

    print(f"\nFiles in diff vs origin/main ({len(diff_files)}):")
    for f in diff_files:
        print(f"  {f}")

    gate_code_review(diff_files, root)
    gate_security_review(diff_files, diff_text, root, args.message)
    gate_doc_sync(diff_files, args.message)

    if args.dry_run:
        print("\nDry run complete. Skipping commit, push, and CI monitor.")
        return

    commit_if_needed(args.message)
    pushed_sha = push_main()
    monitor_ci(pushed_sha)
    verify_live_site(pushed_sha)
    print("Publish complete.")


if __name__ == "__main__":
    main()
