# Restore NAA/Graph Header-Retrieval Fallback

After three days of escalating manifest permissions to chase a 7000 "insufficient permissions" error on Outlook for iOS 5.2614.0, the three-agent root-cause analysis (see this conversation thread) confirmed:

- `getAllInternetHeadersAsync` is **not implemented on Outlook for iOS**, even though `isSetSupported('Mailbox', '1.9')` returns true. iOS only ports a subset of Mailbox 1.9 to mobile, and this API isn't on the allow-list.
- The "code 7000 / Permission Denied" message is misleading — it's "API not available on this host," not a manifest issue. Permission elevation cannot fix it.
- The 4/19 build's working iOS path was the **NAA/Graph fallback**, silently invoked because `GetHeadersAPI` swallowed failures (`resolve("")` on `Failed`) and `GetHeaders.send()` automatically tried Graph next. iOS was never using the direct API; Graph was always carrying it.
- Microsoft has known about this for ~18 months (open issues `OfficeDev/office-js#2554`, `#4109`; `microsoft/MHA#896`, `#1460`, `#1046`) and has not committed to fixing it.

Commit `50f293a` removed the Graph fallback on the explicit (and incorrect) hypothesis that NAA/Graph "provides no functional benefit" on the target runtime. It was load-bearing for iOS.

This plan restores the Graph fallback while keeping every other improvement made today.

## Files

### Restore from `50f293a~` (state before the removal)

- `src/Scripts/services/retrieval/GetHeadersGraph.ts`
- `src/Scripts/services/retrieval/GetHeadersGraph.test.ts`
- `src/Scripts/config/naaClientId.ts`

### Re-edit (restore Graph branch / definitions; keep all other improvements made today)

- `src/Scripts/services/retrieval/GetHeaders.ts` — restore the API → Graph fallback chain and pending-error wrapping.
- `src/Scripts/services/retrieval/GetHeaders.test.ts` — restore the Graph-fallback test cases alongside the API-only cases added today.
- `src/Scripts/services/Diagnostics.ts` — restore `import { GetHeadersGraph }` and the `canUseGraph` line in `ensureOfficeDiagnostics`.
- `vite.config.ts` — restore `defaultNaaClientId` constant and `__NAACLIENTID__` define.
- `vitest.config.ts` — restore `__NAACLIENTID__` define.
- `eslint.config.js` — restore `__NAACLIENTID__` global.
- `package.json` — restore `@azure/msal-browser` in `dependencies` and `overrides`.
- `package-lock.json` — regenerate via `npm install`.
- `.github/workflows/build.yml` — restore `HEADERLAB_NAA_CLIENT_ID` env from secrets.
- `.github/workflows/test.yml` — restore `HEADERLAB_NAA_CLIENT_ID: ''` env stub.

### Drop manifest permission back to `ReadItem`

- `Manifest.xml` — `<Permissions>ReadWriteMailbox</Permissions>` → `<Permissions>ReadItem</Permissions>`. WebApplicationInfo block is already present (was never removed); leave it.
- `ManifestDebugLocal.xml` — same.
- `manifest.json` — `Mailbox.Read.User` → `MailboxItem.Read.User`.

### Documentation

- `SECURITY.md` — restore the previous wording: ReadItem on the current message via Office.js API, plus Graph fallback via NAA for hosts where the API is unavailable.
- `PLAN.md` — add a Phase 7 entry recording the restore and the lesson learned.
- `README.md` — restore the self-host steps that document the Entra app registration and the `HEADERLAB_NAA_CLIENT_ID` secret.
- `PRIVACY.md` — restore the "Add-in: Graph headers" telemetry event entry.
- `CLAUDE.md` — restore the `naaClientId` config entry, the Graph fallback in the retrieval-layer description, and the `__NAACLIENTID__` Vite global.

## Not changed

- CSP-per-route layout (today's fix). Add-in pages have no CSP, so Graph + login.microsoftonline.com calls are unrestricted there. Standalone pages keep the tight CSP and don't make those calls.
- Error copy button on the error card.
- Office API error code/message surfacing.
- `publish.py` review gates, CI failure-log capture, live-site verification, diff-parser warning filter.
- `[permission-upgrade]` and `[no-docs]` commit-message bypasses.
- `.gitignore` for Python pycache.

## Re-sideload required

Yes — the manifest permission drops from `ReadWriteMailbox` back to `ReadItem` and the manifest is a different version on the wire. iOS Outlook needs remove-and-re-add. Desktop will pick up the change on next pane open.

## Long-term

When Microsoft addresses one of the open `getAllInternetHeadersAsync`-on-iOS issues, the Graph fallback can be removed and the simplification revisited. Until then, Graph via NAA is load-bearing for iOS.
