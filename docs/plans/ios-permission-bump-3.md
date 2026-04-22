# iOS Permission Bump #3 — Correct Invalid ReadMailbox to ReadWriteMailbox

Commit `9711f11` set `<Permissions>ReadMailbox</Permissions>` in the Outlook XML manifest. That value does not exist in Outlook's XML manifest spec — valid values are only `Restricted`, `ReadItem`, `ReadWriteItem`, `ReadWriteMailbox`. Outlook rejected the sideload with "can't be completed at this time" (its generic manifest-validation error).

The confusion came from conflating two permission systems:
- XML manifest `<Permissions>` — four coarse levels, validated by Outlook.
- Unified manifest `authorization.permissions.resourceSpecific[*].name` — Graph-style scopes like `Mailbox.Read.User`, validated by Microsoft 365.

The unified manifest's `Mailbox.Read.User` is a real scope and can stay. The XML manifest has to go to `ReadWriteMailbox` (one level up from `ReadWriteItem`, which was the previous failing level) because there's nothing in between. The add-in never writes to the mailbox; the elevated level is only there to satisfy validation and the iOS runtime check.

## Files

- `Manifest.xml` — `<Permissions>` ReadMailbox → ReadWriteMailbox (the previous value was invalid in the XML manifest spec).
- `ManifestDebugLocal.xml` — same.
- `.github/scripts/publish.py` — remove the fictional `ReadMailbox` entry from `PERMISSION_ORDER` and add a comment noting the XML manifest only accepts the four listed levels. Prevents repeating this mistake.

## Re-sideload

Required again on iOS Outlook and any other client where the previous bad manifest was attempted.

## Why the XML/JSON asymmetry is OK

The add-in only ever calls `getAllInternetHeadersAsync` against the currently selected message. The XML manifest's `ReadWriteMailbox` grants more rights than the code exercises — it just happens to be the smallest valid XML permission level that iOS Outlook accepts. The unified manifest can still express the narrower `Mailbox.Read.User` scope, so M365 clients that honor the unified manifest will see read-only mailbox scope.
