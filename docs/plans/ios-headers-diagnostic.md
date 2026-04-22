# iOS Headers Diagnostic — Surface Office API error code/message

After the NAA/Graph removal, iOS Outlook 5.2614.0 hits "Office API header request failed" on inbox messages. The Office.js callback returns a non-Succeeded `asyncResult` whose `error.code` and `error.message` are logged to telemetry but never shown to the user, leaving us blind to the actual failure mode.

This patch surfaces those fields in the user-facing message so the next iOS test reveals what specifically is failing.

## Files

- `src/Scripts/services/retrieval/GetHeadersAPI.ts` — append `(<code>: <message>)` to the user-facing string when present; drop the stale "Fallback to Rest" wording from the telemetry log line.
- `src/Scripts/services/retrieval/GetHeadersAPI.test.ts` — add coverage for the enriched message; existing test (no error detail) still asserts the bare string.
- `.github/scripts/publish.py` — small bug fix in the diff-file parser: filter git `warning:` / `hint:` / `error:` lines that leak in via merged stderr, so they don't get mistaken for filenames by the code-review gate.

No manifest, CSP, or permission change. No new dependency. No re-sideload required.

## Next step (after this lands)

Reproduce on iOS Outlook 5.2614.0 with a work/M365 inbox message; the new error string will reveal whether iOS is reporting `ItemNotFound`, a permission code, an API-not-supported code, or something else. That dictates the real fix (REST fallback via `getCallbackTokenAsync`, item-type guard, or different).
