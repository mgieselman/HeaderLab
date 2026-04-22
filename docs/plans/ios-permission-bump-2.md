# iOS Permission Bump #2 — ReadWriteItem → ReadMailbox

`ReadWriteItem` (commit `43c9ac4`) was also rejected on Outlook iOS 5.2614.0 with the same `7000: You don't have sufficient permissions` error. Per the escalation path documented in `docs/plans/ios-permission-bump.md`, next step is `ReadMailbox`.

`ReadMailbox` widens the scope from "current item only" to "any item in the mailbox, read-only". The add-in only ever calls `getAllInternetHeadersAsync` against the currently selected message, so the broader read scope is never exercised — but it satisfies whatever permission check iOS Outlook is running.

## Files

- `Manifest.xml` — `<Permissions>` ReadWriteItem → ReadMailbox.
- `ManifestDebugLocal.xml` — same.
- `manifest.json` — `MailboxItem.ReadWrite.User` → `Mailbox.Read.User` (unified manifest equivalent).
- `SECURITY.md` — update the permission level note.
- `PLAN.md` — extend the Phase 6 entry with this escalation.

## Re-sideload

Required again on iOS Outlook (manifest is cached client-side per install).

## Fallback if ReadMailbox also fails

The next escalation `ReadWriteMailbox` would put us back at the original level. If even that fails on iOS, the underlying issue is API availability (not permission), and the fix becomes a REST fallback via `Office.context.mailbox.getCallbackTokenAsync({ isRest: true })` against the legacy Outlook REST v2.0 endpoint.
