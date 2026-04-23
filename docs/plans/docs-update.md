# Documentation update — capture iOS-debug lessons

After landing the secret/message-bug fix (commit `174cfc8`), the project docs need to reflect what was learned across the multi-day iOS debugging arc so future work doesn't repeat the same mistakes.

## Files

- `CLAUDE.md` — add a new top-level **Header retrieval architecture** section documenting the API → Graph fallback chain, why the fallback is load-bearing on iOS, the build-time secret wiring (`MHA_NAA_CLIENT_ID` → `HEADERLAB_NAA_CLIENT_ID` workflow mapping), and explicit "do-not-touch" lessons (don't trust `isSetSupported` alone; XML `<Permissions>` only has 4 valid values; CSP must not apply to add-in pages). The retrieval bullet under `services/` now points at this section.
- `SECURITY.md` — expand the permission, CSP, and publish-gate bullets so the architectural rationale is visible alongside the user-facing claim. Documents the per-route CSP scoping decision and the publish.py gate enforcement.
- `README.md` — note the workflow-mapping option for the NAA secret (developers can use either name in the GitHub repo and adjust the workflow accordingly), point at the publish skill docs for the gate behavior, and explain the iOS-only nature of the Graph fallback dependency.
- `PLAN.md` — add a Phase 7 follow-ups subsection covering the two compounding bugs that kept Graph silent after the restore (secret name mismatch + message string-equality), with the lesson that diagnostic-string changes must audit downstream pattern-matching consumers.
- `PRIVACY.md` — already updated in earlier commits to mention the Graph fallback telemetry event and consent path; no further changes needed in this commit.

## Why now

This is the moment when memory of the debugging path is freshest. Capturing it now keeps the architectural decisions falsifiable later — a future maintainer who looks at `GetHeadersGraph.ts` and sees a plausible "this looks like dead code, the API path covers everything" path will be stopped by the CLAUDE.md note.

## No code change

This commit only touches `.md` files. No re-sideload, no behavior change. Doc-sync gate satisfied automatically.
