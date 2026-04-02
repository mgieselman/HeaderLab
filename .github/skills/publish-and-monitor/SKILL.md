---
name: publish-and-monitor
description: 'Validate code locally (lint, test, type-check, build, bundle size), push to main if all passes, then monitor CI pipeline to completion. Use when: ready to publish changes and want automated validation + deployment confirmation.'
argument-hint: 'No arguments needed'
user-invocable: true
---

# Publish and Monitor Skill

Automates the complete release workflow: local validation → git push → CI pipeline monitoring.

## What it Does

1. **Local Validation** (all must pass):
   - Linting (ESLint)
   - Unit tests & integration tests (Vitest)
   - TypeScript type checking
   - Production build (Vite)
   - Bundle size limits (size-limit)

2. **Git Push** (only if validation passes):
   - Checks git status for uncommitted changes
   - Verifies you're on the `main` branch
   - Pushes to origin/main

3. **CI Pipeline Monitoring**:
   - Polls GitHub Actions workflows
   - Reports real-time status of Test and Build workflows
   - Waits for completion (pass/fail)
   - Identifies and suggests fixes for failures

## When to Use

- **Before publishing code** — ensures changes won't break CI/CD
- **After major refactoring** — validate everything works end-to-end
- **When deploying to production** — get confirmation that Azure deployment succeeded
- **Debugging CI issues** — monitor logs in real-time

## Workflow Steps

### Step 1: Pre-Validation Checks
```bash
git status  # Check for uncommitted changes
git branch  # Verify on main branch
```

If there are uncommitted changes, offer to stash or commit first.

### Step 2: Run Local Validation Suite
Run each command sequentially, stopping on first failure:

```bash
npm run lint              # ESLint - code style and quality
npm run lint:fix          # Auto-fix fixable lint issues (if lint fails)
npm test                  # Vitest + integrated type checking (includes pretest lint)
npm run build             # Vite production build
npm run size              # Bundle size limits validation
npm run build:size-check  # Alternative if size doesn't exist
```

**Note:** `npm test` runs `npm run lint` as pretest, so linting may run twice.

### Step 3: Report Validation Results

If all pass:
```
✅ All local validations passed
  - Linting: OK
  - Type checking: OK  
  - Tests: OK
  - Build: OK
  - Bundle size: OK
```

If any fail, show error details and **stop** (do not push).

### Step 4: Commit & Push

Prompt for commit message if needed:
```bash
git add .
git commit -m "Your message"  # Only if there are staged changes
git push origin main
```

Report push result:
```
✅ Code pushed to main
  Commit: <sha>
  Remote: https://github.com/microsoft/MHA
```

### Step 5: Monitor GitHub Actions

Poll GitHub Actions API to track workflows:
- **Test workflow** — runs lint, type-check, test, build, size
- **Build & Deploy workflow** — builds and deploys to Azure Static Web Apps

Commands to monitor (choose based on available tools):
```bash
# Check via GitHub CLI (if installed)
gh run list --branch main --limit 2

# Manual check
# Open https://github.com/microsoft/MHA/actions in browser
```

### Step 6: Wait for Completion & Report Results

Poll every 10 seconds until both workflows complete (timeout after 10 minutes).

Report final status:
```
🔄 Workflows in progress...
  - Test: Running (3/5 jobs completed)
  - Build: Queued

⏳ Waiting for completion...

✅ All workflows passed!
  Test workflow: PASSED (duration: 3m 2s)
  Build & Deploy: PASSED (deployed to Azure)
  Live site: https://headerlab.azurewebsites.net

📊 Summary:
  - Deployed to Azure Static Web Apps
  - All checks green
```

Or if failure:
```
❌ Test workflow failed
  Failed jobs: ESLint, Unit Tests
  Error: src/Scripts/ui/components/Test.ts - Unused variable 'x'
  
Suggested fix:
  1. Review failed job logs
  2. Make corrections locally
  3. Run 'npm test' to verify
  4. Push again (this will trigger new workflow run)
```

## Implementation Notes

### Environment Context
- Work from: `/Users/matt/src/Headerlab/`
- GitHub repo: microsoft/MHA (public)
- Default branch: `main`
- CI config: `.github/workflows/build.yml` and `test.yml`

### Critical Commands (All Must Succeed)

| Command | Purpose | Failure Handling |
|---------|---------|------------------|
| `npm run lint` | Code style & quality | Show linting errors; offer auto-fix |
| `npm test` | Unit & integration tests (includes lint) | Show failed tests; offer re-run with verbose output |
| `npm run build` | Production build verification | Show build errors |
| `npm run size` | Bundle size limits | Show size violations |
| `git status` | Check for uncommitted changes | Prompt to commit or stash |
| `git push origin main` | Push to GitHub | Verify branch is main; retry on network errors |

### GitHub Actions Polling
- Use GitHub CLI (`gh run list`, `gh run view <id>`) if available
- Fallback: Poll REST API via `curl` with GitHub token from environment
- If manual: Direct user to https://github.com/microsoft/MHA/actions to monitor

## Failure Scenarios & Recovery

### Scenario: Linting fails
- Show specific violations
- Offer to run `npm run lint:fix` for auto-fixable issues
- Require manual fixes for others
- Don't push until linting passes

### Scenario: Tests fail
- Show failed test names and error messages
- Offer to run `npm run test:debug` for verbose output
- Don't push until all tests pass

### Scenario: Build fails
- Show build error details
- Likely cause: TypeScript errors or import issues
- Suggest running `npx tsc --noEmit` for type checking

### Scenario: Bundle size exceeds limits
- Show which assets exceed limits
- Suggest reviewing `.size-limit.json` config
- Can be override-able if intentional

### Scenario: Git push blocked
- Verify branch is `main` (not another branch)
- Check for uncommitted changes
- Verify network connectivity
- Offer to retry

### Scenario: CI workflow timeout
- If workflows take >10 minutes, allow user to:
  - Check manually: `gh run list --branch main`
  - View in browser: https://github.com/microsoft/MHA/actions
  - Retry monitoring: run skill again later

## Success Criteria

✅ Skill succeeds when:
- All local validations pass
- Git push succeeds
- Both GitHub Actions workflows complete successfully
- User sees deployment confirmation

❌ Skill stops/fails when:
- Any local validation fails (lint, test, build, size)
- Git branch is not `main`
- Git push fails (network/permissions)
- CI workflow fails (must be manually investigated)

## References

- [GitHub Actions Status Check](https://docs.github.com/en/rest/actions/workflows)
- [GitHub CLI Workflows](https://cli.github.com/manual/gh_run)
- [HeaderLab CI Config](../../workflows/)
- [Build Command](../../../package.json)
