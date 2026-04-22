---
mode: agent
description: 'Validate, gate, commit, push to main, monitor CI, and verify the live site serves the new commit.'
---

Run the HeaderLab publish workflow. The canonical behavior docs are at `.github/skills/publish/SKILL.md` — read that file first so you know the exit codes, gate semantics, failure-resolution loop, and live-site verification behavior before you begin.

## Primary invocation

If the working tree has pending changes the user wants to publish, derive a concise commit message from the conversation and call:

```bash
python3 .github/scripts/publish.py --message "<your commit message>"
```

If the working tree is already clean:

```bash
python3 .github/scripts/publish.py
```

## On failure

- **Review-gate failure** (exit 3, 4, 5): describe the gate and the offending files to the user. Do not bypass. Either fix the underlying issue or, if the change is legitimate scope, update the relevant file under `docs/plans/` to declare the paths, then re-run.
- **CI failure** (exit 1 during workflow monitoring): the script auto-runs `gh run view <id> --log-failed` for each failed workflow and prints the output inline. Read that output, reproduce the failure locally, fix the root cause, and re-run the publish prompt with a new commit message describing the follow-up. Do **not** amend the previous commit.
- **Live-site failure** (exit 6): usually Azure Static Web Apps CDN propagation lag. Verify manually with `curl -I https://headerlab.gieselman.com/headerlab.html` and wait a minute before re-publishing.

## Rules

- Never invoke with `--skip-validation` or `--dry-run` for a real publish.
- Never push from a non-`main` branch.
- Never amend a pushed commit to fix CI — create a new commit.

Success criterion: the script exits 0, meaning CI is green and the live site at `https://headerlab.gieselman.com` serves a bundle containing the just-pushed commit's short SHA.
