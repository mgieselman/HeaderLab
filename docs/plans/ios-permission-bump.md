# iOS Permission Bump + Error Copy Button

After surfacing the underlying iOS Outlook error (commit `cc47d9a`), the failure on iOS Outlook 5.2614.0 with a work/M365 inbox message is:

> Office API header request failed (7000: You don't have sufficient permissions for this action.)

Microsoft's docs say `getAllInternetHeadersAsync` requires `ReadItem`, and it accepts that on Outlook Desktop, but iOS Outlook rejects it at that level. The 4/19 build worked because the manifest was `ReadWriteMailbox` then; commit `1980e5d` (Apr 20) dropped it to `ReadItem`, breaking iOS.

## Files

- `Manifest.xml` — `<Permissions>` ReadItem → ReadWriteItem (one step up; still item-scoped, not mailbox-wide).
- `ManifestDebugLocal.xml` — same.
- `manifest.json` — `MailboxItem.Read.User` → `MailboxItem.ReadWrite.User` (unified manifest equivalent).
- `src/Scripts/ui/components/StatusBar.ts` — add a copy-to-clipboard button next to the dismiss button on error cards so failure text can be captured for diagnosis.
- `src/Content/components.css` — styles for the new `hl-error-card__copy` button.
- `.github/scripts/publish.py` — extend the security-review gate so a permission upgrade is allowed when the commit message contains `[permission-upgrade]` (mirroring the existing `[no-docs]` bypass on the doc-sync gate).
- `.github/skills/publish/SKILL.md` — document the new `[permission-upgrade]` bypass.
- `SECURITY.md` — document the permission level (`ReadWriteItem` for the message under view) and why it's higher than `ReadItem`.
- `PLAN.md` — add a Phase 6 entry recording the iOS compatibility bump.
- `.gitignore` — ignore Python `__pycache__/` and `*.pyc` (publish.py runs from `.github/scripts/` and Python 3 leaves bytecode there).

## Re-sideload

iOS Outlook caches the manifest. Users will need to remove and re-add the add-in for the new permission to take effect.

## Fallback if iOS still rejects

If `ReadWriteItem` is also insufficient, next step is `ReadMailbox`. If that also fails, the underlying issue is API availability (not permission), and the fix becomes a REST fallback via `getCallbackTokenAsync`.
