# Codex Phase 1 — Remove NAA/Graph Retrieval Path

You are implementing Phase 1 of `docs/plans/remove-naa-graph.md`. The Architect (Claude) has completed the design review; this file is your work order. Do exactly what is listed here. Nothing more. No refactors, no style cleanups, no "while I'm here" changes.

## Context

HeaderLab currently has two retrieval paths for the Outlook add-in: Office.js API (`GetHeadersAPI`) and a Microsoft Graph fallback (`GetHeadersGraph`) that uses NAA (Nested App Auth) via MSAL. We are removing the Graph path entirely because the target runtime (latest Outlook on iOS / Mac / Win / Web against Exchange Online / M365) does not need it, and it costs an MSAL bundle, an Azure AD app registration, OAuth consent, dual code paths, and a `HEADERLAB_NAA_CLIENT_ID` secret.

After this phase:
- Only `GetHeadersAPI` is called.
- `@azure/msal-browser` is gone.
- Manifest permission drops from `ReadWriteMailbox` to `ReadItem`.
- CSP `connect-src` drops Microsoft login and Graph hosts.
- No commits — leave everything staged in the working tree.

## Standing rules

1. **No commits.** Leave the working tree dirty for Phase 2 review.
2. **Validation gate:** `npm run lint && npm test && npm run build && npm run size` must all pass before you are done.
3. **Style:** CRLF line endings, 4-space indent, double quotes, semicolons, strict TS, one class per file, import ordering per eslint config (builtins → external → internal → sibling/parent → index). Match the style of surrounding code.
4. **Scope discipline:** do only what is listed below. If you find something tempting to clean up, leave it.
5. **Public API preserved:** `GetHeaders.send(headersLoadedCallback, callbacks)` signature does not change.

## Tasks

### 1. Delete three files

```
src/Scripts/services/retrieval/GetHeadersGraph.ts
src/Scripts/services/retrieval/GetHeadersGraph.test.ts
src/Scripts/config/naaClientId.ts
```

### 2. Simplify `src/Scripts/services/retrieval/GetHeaders.ts`

- Drop the `GetHeadersGraph` import.
- Remove the `RetrievalError` interface and the `pendingDetailedError` / `wrappedCallbacks` wrapping.
- Remove the Graph fallback branch, the `errors.logMessage("API failed, trying Graph")` line, and the entire composed "Graph fallback unavailable" error message block.
- `send()` becomes: validate item, check permission, call `GetHeadersAPI.send(callbacks)` directly with the real callbacks, dispatch `headersLoadedCallback` on non-empty result, otherwise fall back to `"Failed to retrieve headers."` on `onError` if API didn't already surface one.
- To preserve the behavior where a detailed API error is not overwritten by the generic fallback, track whether `onError` has been called by wrapping only the `onError` callback to set a boolean flag — do not accumulate pending error state, do not compose any message. If the flag is set, skip the generic fallback call.
- The `errors` import is still needed only if you retain an `errors.log*` call. If all `errors` usage in this file is removed, also remove the import. Same for `diagnostics`.
- Keep the outer `try/catch` that surfaces `"Could not send header request"` on exception.

The final file should be significantly shorter. Public signature unchanged: `public static async send(headersLoadedCallback: (_headers: string, apiUsed: string) => void | Promise<void>, callbacks: HeaderCallbacks): Promise<void>`.

When API succeeds, pass `"API"` as the second argument to `headersLoadedCallback` (unchanged).

### 3. Rewrite `src/Scripts/services/retrieval/GetHeaders.test.ts`

Drop these existing tests (they reference Graph):
- "calls onError when API and Graph return empty headers" (replace with API-only version)
- "does not overwrite detailed Graph error with generic retrieval message"
- "adds Graph fallback reason when API request fails and Graph is unavailable"
- "does not surface API error when Graph fallback succeeds"
- "does not overwrite Graph auth token error with generic retrieval message"
- "falls back to Graph when API returns empty"

Keep / adapt / add so the final suite covers these five API cases:

1. **Valid item, API success:** `validItem=true`, `sufficientPermission=true`, `GetHeadersAPI.send` resolves `"Received: test"`. Expect `headersLoadedCallback` called with `("Received: test", "API")` and `onError` not called.
2. **No item selected:** `validItem=false`. Expect `onError(null, "No item selected", true)`, no API call, no `headersLoadedCallback`.
3. **Insufficient permission:** `validItem=true`, `sufficientPermission(false)=false`. Expect `onError(null, "Insufficient permissions to request headers", false)`, no API call.
4. **API returns empty with no detailed error:** `validItem=true`, `sufficientPermission=true`, `GetHeadersAPI.send` resolves `""` without invoking `callbacks.onError`. Expect `onError(null, "Failed to retrieve headers.", true)`.
5. **API returns empty after setting its own detailed error:** `validItem=true`, `sufficientPermission=true`, `GetHeadersAPI.send` invokes `callbacks.onError(new Error("test"), "Office API header request failed.")` then resolves `""`. Expect the detailed error to be surfaced (via the pass-through) and the generic `"Failed to retrieve headers."` NOT to be called.

Remove imports of `GetHeadersGraph` and `diagnostics` from the test file. Keep `GetHeaders`, `GetHeadersAPI`. Follow existing vitest / mocking patterns in the file.

### 4. Remove `@azure/msal-browser`

- Delete it from `dependencies` in `package.json`.
- Delete it from `overrides` in `package.json`.
- Regenerate `package-lock.json` via `npm install`.

### 5. Update `vite.config.ts`

- Remove the `defaultNaaClientId` constant.
- Remove the `"__NAACLIENTID__"` line from the `define` block.
- Leave everything else untouched.

### 6. Update `.github/workflows/build.yml`

- Remove the `HEADERLAB_NAA_CLIENT_ID: ${{ secrets.HEADERLAB_NAA_CLIENT_ID }}` line from the env block of the `NPM install, build` step.
- Do not touch anything else in the workflow.

### 7. Update `Manifest.xml`

- Line 14: change `<Description DefaultValue="Analyze message headers with HeaderLab using Graph API and NAA" />` to `<Description DefaultValue="Analyze message headers with HeaderLab" />`.
- Line 45: change `<Permissions>ReadWriteMailbox</Permissions>` to `<Permissions>ReadItem</Permissions>`.

### 8. Update `ManifestDebugLocal.xml`

- Remove the TODO comment `<!-- TODO: Dial this down to ReadItem when the token bug is fixed -->` (line 45).
- Line 46: change `<Permissions>ReadWriteMailbox</Permissions>` to `<Permissions>ReadItem</Permissions>`.

### 9. Tighten CSP in both `staticwebapp.config.json` files

In both `staticwebapp.config.json` and `public/staticwebapp.config.json`, edit the `Content-Security-Policy` header's `connect-src`:

Current: `connect-src 'self' https://dc.services.visualstudio.com https://graph.microsoft.com https://login.microsoftonline.com https://login.windows.net https://login.live.com;`

Target: `connect-src 'self' https://dc.services.visualstudio.com;`

Keep `dc.services.visualstudio.com` (App Insights). Remove `graph.microsoft.com`, `login.microsoftonline.com`, `login.windows.net`, `login.live.com`. Leave all other directives untouched.

### 10. Update `src/Scripts/services/Diagnostics.ts`

- Remove the `import { GetHeadersGraph } from "./retrieval/GetHeadersGraph";` line (currently line 5).
- Remove the `this.appDiagnostics["canUseGraph"] = GetHeadersGraph.canUseGraph();` line (currently inside `ensureOfficeDiagnostics`, line 304).
- Do not touch any other diagnostic key. There are no `noGraphReason`, `graphTokenFailure`, or `graphGetHeadersFailure` keys in this file — those lived only in the now-deleted `GetHeadersGraph.ts`.

## Acceptance greps

All of these must return zero matches across the repo (exclude `node_modules`, `Pages/`, `docs/plans/` — the plan files themselves are allowed to mention these terms):

```
msal
naa
NAA
NestedAppAuth
NAACLIENTID
GetHeadersGraph
naaClientId
graph\.microsoft\.com
login\.microsoftonline\.com
```

Use something like:

```
git grep -nEi --untracked -- 'msal|naa|NestedAppAuth|NAACLIENTID|GetHeadersGraph|naaClientId|graph\.microsoft\.com|login\.microsoftonline\.com' ':(exclude)node_modules' ':(exclude)Pages' ':(exclude)docs/plans'
```

Note: `README.md`, `PRIVACY.md`, `SECURITY.md`, `PLAN.md`, `CLAUDE.md` still contain NAA/Graph prose. **Do not touch docs** — Phase 3 handles them. The greps above will flag those docs; that is fine. Report doc matches separately so Claude knows Phase 3 scope is intact.

For the source/config/manifest scope, limit the grep to:

```
git grep -nEi -- 'msal|naa|NestedAppAuth|NAACLIENTID|GetHeadersGraph|naaClientId|graph\.microsoft\.com|login\.microsoftonline\.com' -- src '*.xml' vite.config.ts package.json package-lock.json .github/workflows staticwebapp.config.json public/staticwebapp.config.json
```

This scoped grep must return zero matches.

## Validation gate

Run in order and confirm each is green:

```
npm run lint
npm test
npm run build
npm run size
```

If `npm run build` complains about missing `__NAACLIENTID__`, you missed a reference — grep `src/` for `__NAACLIENTID__` and `NAACLIENTID`.

If `npm run size` fails because the bundle is now smaller than expected (some size-limit configs enforce minimums), that is not a real failure — report the actual output. The expectation is that the bundle is smaller because MSAL is gone.

## Report back

When finished, report:
1. Scoped-grep output (must be empty for source/config/manifest).
2. Doc-grep output (expected non-empty; for Claude's Phase 3 reference).
3. Each of the four validation commands' exit status and a one-line summary of output.
4. Any files you had to touch that were not listed above, with reason.
5. Confirmation that no git commits were made.

Stop after reporting. Do not commit. Do not push. Do not open a PR.
