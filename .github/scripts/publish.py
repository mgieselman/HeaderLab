#!/usr/bin/env python3
"""Deterministic publish workflow for HeaderLab.

Steps:
1) Validate tools and branch
2) Run local validation commands
3) Optionally commit pending changes
4) Push to main
5) Monitor GitHub Actions workflows to completion
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from typing import Any, List

POLL_SECONDS = 10
TIMEOUT_SECONDS = 600
REQUIRED_TOOLS = ["git", "npm", "gh"]
VALIDATION_COMMANDS: List[List[str]] = [
    ["npm", "run", "lint"],
    ["npx", "tsc", "--noEmit"],
    ["npm", "test"],
    ["npm", "run", "build"],
    ["npm", "run", "size"],
]

WORKFLOW_NAMES = {"test", "build and deploy headerlab"}


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
            "databaseId,name,status,conclusion,displayTitle,createdAt,headSha",
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
            sys.exit(1)

        print("All relevant workflows completed successfully.")
        return

    fail("Timed out waiting for workflow completion.", 1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate, push, and monitor CI for HeaderLab.")
    parser.add_argument(
        "--message",
        help="Commit message to use if local changes exist before publishing.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_tools()
    ensure_main_branch()
    validate_local()
    commit_if_needed(args.message)
    pushed_sha = push_main()
    monitor_ci(pushed_sha)
    print("Publish complete.")


if __name__ == "__main__":
    main()
