---
name: publish
description: 'Validate, gate, commit, push to main, monitor CI, and verify the live site serves the new commit. Full behavior docs at .github/skills/publish/SKILL.md.'
argument-hint: 'Optional commit message, e.g. Fix Other section layout'
user-invocable: true
---

# Publish

Thin entry point for Claude Code. The canonical docs (flags, exit codes, gate list, failure-resolution loop, live-site verification) live at `.github/skills/publish/SKILL.md`. Read that file before starting if you need more than the quick-ref below.

## Quick-ref

Standard invocation (clean tree):

```bash
python3 .github/scripts/publish.py
```

With commit message for pending changes:

```bash
python3 .github/scripts/publish.py --message "Your commit message"
```

Dry-run (no push, no CI wait, no live-site check):

```bash
python3 .github/scripts/publish.py --dry-run
```

## What to do when things fail

- **Gate failure** (exit 3/4/5): fix the root cause or update `docs/plans/*.md` to declare the affected files, then re-run. Never bypass a gate.
- **CI failure** (exit 1 during monitor): the script auto-dumps `gh run view <id> --log-failed` inline. Read it, reproduce locally, fix, and re-run with a new commit message. Do not amend.
- **Live-site failure** (exit 6): usually CDN propagation lag. Check `curl -I https://headerlab.gieselman.com/headerlab.html` manually before re-pushing.

See `.github/skills/publish/SKILL.md` for the full spec.
