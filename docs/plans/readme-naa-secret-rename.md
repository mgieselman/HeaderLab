# README doc-sync for NAA secret rename

Follow-up to `docs/plans/rename-naa-secret.md`. The secret was renamed and
the legacy secret identifier removed; update the README so the
self-hosting instructions don't reference the deleted secret name.

## Changes

- `README.md` — simplify the "Set build secrets" step to just name
  `HEADERLAB_NAA_CLIENT_ID` (drop the "legacy name" paragraph and the
  old-identifier column in the secrets table).
- `docs/plans/readme-naa-secret-rename.md` — this plan file.
