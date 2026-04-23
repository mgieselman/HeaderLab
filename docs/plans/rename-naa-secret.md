# Rename NAA client ID secret

Rename the GitHub Actions secret feeding the Microsoft Graph NAA client ID
from the legacy `MHA_NAA_CLIENT_ID` to `HEADERLAB_NAA_CLIENT_ID` so the
source-of-truth name matches the HeaderLab branding.

## Changes

- `.github/workflows/build.yml` — map the env var from the new secret
  (`secrets.HEADERLAB_NAA_CLIENT_ID`) instead of `secrets.MHA_NAA_CLIENT_ID`.
- `CLAUDE.md` — update the "Build-time secret wiring" section to reference
  the new secret name and note the rename.
- `docs/plans/rename-naa-secret.md` — this plan file.

## Procedure

1. Create `HEADERLAB_NAA_CLIENT_ID` via `gh secret set` with the same
   value as the old one (the value is public — it's the Entra app's
   non-confidential client GUID, already baked into the shipped JS bundle).
2. Update workflow + docs.
3. Publish and verify CI still green and live-site bundle still contains
   the same NAA client ID.
4. After success, delete `MHA_NAA_CLIENT_ID` via `gh secret delete`.

## Notes

Runtime code is untouched: `vite.config.ts`, `src/Scripts/config/naaClientId.ts`,
and `GetHeadersGraph.canUseGraph()` only care about the env var
`HEADERLAB_NAA_CLIENT_ID`, not the upstream GitHub secret name.
