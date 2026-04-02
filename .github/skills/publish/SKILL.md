---
name: publish
description: 'Run deterministic publish automation: local validation, optional commit, push to main, and monitor CI workflows to completion.'
argument-hint: 'Optional commit message, e.g. Fix Other section layout'
user-invocable: true
---

# Publish Skill

Runs the publish workflow through a script so execution is repeatable and deterministic.

## What This Skill Runs

Script path:

```bash
python3 .github/scripts/publish.py
```

With commit message for pending changes:

```bash
python3 .github/scripts/publish.py --message "Your commit message"
```

## Behavior

The script performs these steps in order:

1. Verify required tools (`git`, `npm`, `gh`) are available.
2. Verify current branch is `main`.
3. Run local validation:
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run size`
4. If repo is dirty and `--message` is provided:
   - `git add -A`
   - `git commit -m <message>`
5. Push to `origin/main`.
6. Poll GitHub Actions push runs (`Test`, `Build and Deploy HeaderLab`) until complete.

## Success Criteria

- Local validation passes.
- Push succeeds.
- Relevant CI workflows complete successfully.

## Failure Behavior

- Any failed local command stops immediately.
- Publishing from non-`main` branch is blocked.
- Dirty working tree without `--message` is blocked.
- CI timeout/failure returns a non-zero exit code.

## Notes

- This skill is intentionally thin and wraps script behavior.
- For direct use outside skill invocation, run the script manually from repo root.
