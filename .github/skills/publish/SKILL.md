---
name: publish
description: 'Run deterministic publish automation: local validation, review gates (code-review / security-review / doc-sync), optional commit, push to main, monitor CI, fetch failure logs if CI breaks, and verify the live site serves the new commit.'
argument-hint: 'Optional commit message, e.g. Fix Other section layout'
user-invocable: true
---

# Publish Skill

Runs the publish workflow through a script so execution is repeatable and deterministic.

## Rule 1: No publish without full validation

The script will not push unless **every** local validation command and **every** review gate passes. There is no override flag for live publishing — if a gate fires, fix the underlying issue (or update the active plan file) and re-run.

## What This Skill Runs

Script path:

```bash
python3 .github/scripts/publish.py
```

With commit message for pending changes:

```bash
python3 .github/scripts/publish.py --message "Your commit message"
```

Dry-run (gates + validation, no commit / push / CI monitor / live-site verify):

```bash
python3 .github/scripts/publish.py --dry-run
```

Fast gate-only dry-run (skip the lint/test/build/size suite):

```bash
python3 .github/scripts/publish.py --dry-run --skip-validation
```

## Behavior

The script performs these steps in order:

1. Verify required tools (`git`, `npm`, `gh`) are available.
2. Verify current branch is `main`.
3. Run local validation (unless `--skip-validation`):
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm test`
   - `npm run build`
   - `npm run size`
4. Run review gates against the diff vs `origin/main` (committed + uncommitted + untracked):
   - **Code-review gate** — every changed file must be declared (in backticks) inside some `docs/plans/*.md`. `package-lock.json` and anything under `docs/plans/` are auto-allowed. Unexpected files block publish; remedy is to add them to the plan or revert.
   - **Security-review gate** —
     - `npm audit --omit=dev --audit-level=high` must report no high/critical vulnerabilities.
     - Diff is scanned for AWS keys, PEM private keys, Slack tokens, GitHub PATs, Google API keys, and `sk-` prefixed secrets.
     - `Manifest.xml` and `ManifestDebugLocal.xml` `<Permissions>` must not regress (become more permissive) vs `origin/main`. Order: `Restricted < ReadItem < ReadWriteItem < ReadMailbox < ReadWriteMailbox`.
     - `staticwebapp.config.json` and `public/staticwebapp.config.json` CSP `connect-src` must not add hosts vs `origin/main`. A baseline with no CSP is treated as "tightening allowed."
   - **Doc-sync gate** — if any `src/Scripts/` file is in the diff, at least one of `README.md`, `PRIVACY.md`, `SECURITY.md`, `CLAUDE.md`, `PLAN.md` must also be in the diff. Override by including `[no-docs]` in the commit message.
5. If repo is dirty and `--message` is provided:
   - `git add -A`
   - `git commit -m <message>`
6. Push to `origin/main`.
7. Monitor GitHub Actions push runs (`Test`, `Build and Deploy HeaderLab`) until complete.
   - If any run fails, the script automatically invokes `gh run view <id> --log-failed` for each failed workflow, prints the output inline (trimmed to 400 lines total if larger), and exits non-zero.
8. Verify the live site:
   - Polls `https://headerlab.gieselman.com/headerlab.html` (up to 5 min, 15 s between attempts).
   - Expects HTTP 200.
   - Confirms the `Content-Security-Policy` response header does not regress (no `graph.microsoft.com` / `login.microsoftonline`).
   - Extracts the first JS asset reference, fetches it, and confirms the just-pushed commit's 7-character SHA appears in the bundle (from the `__VERSION__` Vite define baked in at build time). This proves the new build — not a stale CDN copy — is serving.

## Failure-resolution loop (CI breakage)

This is the primary reason to run this skill under Claude: when CI fails after push, Claude acts on the output.

When step 7 surfaces a failure:

1. Read the `--log-failed` output already printed by the script; identify the failing command or assertion.
2. Investigate locally (reproduce the failure: run the failing command, inspect the relevant files). Do **not** re-push without reproducing.
3. Fix the root cause. If the fix requires editing files beyond what the current plan declares, update the plan file first (the code-review gate will otherwise block).
4. Re-run the publish skill with a new commit message describing the follow-up fix (e.g. `Fix failing lint on GetHeaders.ts after NAA removal`). Do **not** amend the previous commit — create a fresh one.
5. Repeat until CI is green and the live-site verification passes.

If step 8 (live-site verification) times out despite CI success, the most likely causes are Azure Static Web Apps CDN propagation lag (usually <2 min) or a divergence between the deployed artifact and expectations. Investigate `https://headerlab.gieselman.com` response headers manually with `curl -I` before re-pushing.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success (CI green and live site serves the new commit) |
| 1 | Generic failure (validation, CI, push, timeout) |
| 2 | Environment problem (missing tool, wrong branch, dirty tree without `--message`) |
| 3 | Code-review gate failed |
| 4 | Security-review gate failed |
| 5 | Doc-sync gate failed |
| 6 | Live-site verification failed or timed out |

## Failure Behavior

- Any failed local command stops immediately.
- Publishing from non-`main` branch is blocked.
- Dirty working tree without `--message` is blocked.
- Any review gate failure is fatal — no flag bypasses gates for live publish (Rule 1).
- CI failure prints `--log-failed` inline and exits non-zero.
- Live-site verification failure exits non-zero (code 6).

## Notes

- The code-review gate parses backtick-wrapped tokens out of every `docs/plans/*.md`. To onboard a new file into the allowed set, add its repo-relative path inside backticks anywhere in the active plan.
- The security-review gate compares against `origin/main`, so `git fetch origin main` runs implicitly before the diff snapshots are taken.
- Live-site verification uses `urllib` from the Python stdlib — no additional dependencies.
- For direct use outside skill invocation, run the script manually from repo root.
