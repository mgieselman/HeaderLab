# Execute: Remove NAA/Graph Retrieval Path

Paste the prompt below into a new Claude session in VS Code (agent mode, Claude pinned — not Auto, running locally).

---

You are acting as a multi-role agent team on the HeaderLab repo. Your job is to remove the NAA/Graph header-retrieval path entirely, reduce the Outlook add-in manifest permission to `ReadItem`, and update supporting config, docs, CI, and the `/publish` skill. Target runtime is latest Outlook on iOS / Mac / Win / Web with Exchange Online (M365) — NAA/Graph provides no functional benefit in that environment and carries real costs (MSAL bundle, Azure AD app registration, OAuth consent, dual code paths, `HEADERLAB_NAA_CLIENT_ID` secret).

## Standing rules

1. **Validation gate**: no phase closes until `npm run lint`, `npm test`, `npm run build`, and `npm run size` all pass locally.
2. **Architect review loop**: every change batch goes through code + security review; address every finding or explicitly dismiss with rationale.
3. **No partial commits**: nothing is committed until Phase 5. Accumulate all changes in the working tree.
4. **Scope discipline**: no refactors, style cleanups, or "while I'm here" changes.
5. **Codex scope**: Phase 1 source/config/manifest changes only. Docs and skill work stay with Claude.
6. **Codex prompt discipline**: before each Codex run, write a structured prompt package to `docs/plans/codex-phase1.md` (or a feedback follow-up file). No ad-hoc instructions.

## Agent roles

- **Architect** (you, Claude): design review, code review, security review, orchestrator.
- **Coding** (Codex, invoked externally by the user): implements Phase 1.
- **Documentation** (you, Claude): Phase 3.
- **AI Skill Expert** (you, Claude): Phase 4.

## Handoff to Codex

You do not run Codex. When Phase 1 is ready, stop and tell the user: *"Codex prompt ready at `docs/plans/codex-phase1.md`. Run Codex against it, then return."* Wait for the user's confirmation before running Phase 2.

## Phases

### Phase 0 — Design review (Architect)

Produce a file inventory covering:

- **Delete**: `src/Scripts/services/retrieval/GetHeadersGraph.ts`, `src/Scripts/services/retrieval/GetHeadersGraph.test.ts`, `src/Scripts/config/naaClientId.ts`.
- **Modify**: `src/Scripts/services/retrieval/GetHeaders.ts`, `src/Scripts/services/retrieval/GetHeaders.test.ts`, `Manifest.xml`, `ManifestDebugLocal.xml`, `vite.config.ts`, `vitest.config.ts`, `package.json`, `package-lock.json`, `.github/workflows/build.yml`, `.github/workflows/test.yml`, `eslint.config.js`, `staticwebapp.config.json`, `public/staticwebapp.config.json`, `src/Scripts/services/Diagnostics.ts` (if it has NAA-specific keys), `manifest.json` (only if it references NAA).
- **Phase 3 docs (Architect): `README.md`, `PRIVACY.md`, `SECURITY.md`, `CLAUDE.md`, `PLAN.md`.
- **Phase 4 publish skill (Architect): `.github/scripts/publish.py`, `.github/skills/publish/SKILL.md`, `.claude/skills/publish/SKILL.md`, `.github/prompts/publish.prompt.md`.
- **Remove dependency**: `@azure/msal-browser`.
- Confirm `GetHeaders.send()` public signature is unchanged.
- Decide the single concise user-facing error message that replaces the composed "Graph fallback unavailable" string.

### Phase 1 — Coding (Codex)

Write the Codex prompt package at `docs/plans/codex-phase1.md` containing:

1. Delete the three files above.
2. Simplify `GetHeaders.ts` to call only `GetHeadersAPI`; remove `pendingDetailedError` wrapping and Graph fallback branch.
3. Update `GetHeaders.test.ts`: drop Graph-fallback cases; keep/expand API cases (valid item success, no item selected, insufficient permission, API onError, API returns empty).
4. Remove `@azure/msal-browser` from `package.json`; regenerate `package-lock.json` with `npm install`.
5. Remove `__NAACLIENTID__` define and `defaultNaaClientId` from `vite.config.ts`.
6. Remove `HEADERLAB_NAA_CLIENT_ID` env var from `.github/workflows/build.yml`.
7. Set `<Permissions>ReadItem</Permissions>` in both `Manifest.xml` and `ManifestDebugLocal.xml`. Remove the stale "token bug" TODO.
8. Update `Manifest.xml` `<Description>` to remove "Graph API and NAA".
9. Tighten CSP `connect-src` in both `staticwebapp.config.json` files: remove `login.microsoftonline.com`, `login.windows.net`, `login.live.com`, `graph.microsoft.com`. Keep `dc.services.visualstudio.com` for App Insights.
10. Remove NAA-specific diagnostics keys from `Diagnostics.ts` if present (`noGraphReason`, `graphTokenFailure`, `graphGetHeadersFailure`).
11. Acceptance greps (must all return zero matches): `msal`, `naa`, `NAA`, `NestedAppAuth`, `NAACLIENTID`, `GetHeadersGraph`, `naaClientId`, `graph\.microsoft\.com`, `login\.microsoftonline\.com`.
12. Validation: `npm run lint && npm test && npm run build && npm run size` all green.
13. Style: CRLF line endings, 4-space indent, strict TS, one class per file, import ordering per eslint config.

Then stop and ask the user to run Codex.

### Phase 2 — Review (Architect)

After user confirms Codex finished:

- Run the acceptance greps yourself.
- Run full validation.
- Verify CSP tightened, manifest permission is `ReadItem`, MSAL gone from bundle, error path returns a helpful message, tests cover the five API cases.
- If findings exist, write a follow-up prompt at `docs/plans/codex-phase1-followup.md` and hand back to the user.
- Loop until clean.

### Phase 3 — Docs (Claude directly)

Update: `README.md` (remove NAA setup, `HEADERLAB_NAA_CLIENT_ID` secret row, Graph references), `PRIVACY.md` (remove Graph telemetry event and wording), `SECURITY.md` (remove NAA references), `CLAUDE.md` (update `services/retrieval/` bullet to single-path API-only), `PLAN.md` (reflect NAA removal).

Validate: `npm run lint` green, no dangling references to removed modules or secrets.

### Phase 4 — `/publish` skill enhancement (Claude directly)

Extend `.github/scripts/publish.py` and `.github/skills/publish/SKILL.md`:

- **Code-review gate**: verify `git diff origin/main` only touches files declared in an active plan file under `docs/plans/`; flag unexpected files.
- **Security-review gate**: `npm audit --production` fails on high/critical; grep diff for common secret patterns; confirm manifest `<Permissions>` and CSP `connect-src` did not regress.
- **Doc-sync gate**: if `src/Scripts/` changed but no corresponding doc file in the diff, fail unless commit message includes `[no-docs]`.
- Update `SKILL.md` to document the new gates and reaffirm Rule 1 (no publish without full validation).

Dry-run the skill (no push) to verify gates fire.

### Phase 5 — Publish (Claude directly)

1. Full local validation one more time.
2. Inspect `Pages/` output: tightened CSP present, no MSAL bundle.
3. Invoke `/publish` skill with commit message: `Remove NAA/Graph retrieval path; use Office API only with ReadItem permission`.
4. Confirm CI green and deployed site serves the new CSP.

## Rollback

No commits until Phase 5. If blocked at any phase: `git restore --staged --worktree . && git clean -fd`.

## Out of scope

UI copy/design, unrelated refactoring, dependency upgrades beyond MSAL removal, standalone web-app flow changes, renames of any kind.

---

Start now with Phase 0. Produce the file inventory, confirm it against the actual repo state, and present it for approval before writing the Codex prompt package.
