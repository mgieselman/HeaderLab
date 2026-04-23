# Fix MHA_NAA_CLIENT_ID secret reference + Graph fallback message bug

After restoring the NAA/Graph fallback (commit `d3fe8b7`), iOS Outlook still showed only the bare API error: `Office API header request failed (7000: You don't have sufficient permissions for this action.)`. The composed "Graph fallback unavailable: ..." suffix never appeared, so it wasn't obvious that the Graph branch was being skipped.

Root cause for the silent skip: the GitHub repo's secret is named `MHA_NAA_CLIENT_ID` (legacy from the MHA fork), but the workflow file restored from `50f293a~` references `secrets.HEADERLAB_NAA_CLIENT_ID`. The mismatched name resolved to empty string in CI, so `__NAACLIENTID__` baked in as `""`, `naaClientId()` returned `""`, and `canUseGraph()` returned false. Graph fallback was skipped without trace.

Reason the user couldn't see this: `GetHeaders.send()` only appended the "Graph fallback unavailable" suffix when the API error message strictly equaled `"Office API header request failed."`. Today's diagnostic improvement made the API message `"Office API header request failed (<code>: <message>)."` — so the equality check missed and the suffix was never added.

## Files

- `.github/workflows/build.yml` — point the workflow env at the existing `MHA_NAA_CLIENT_ID` secret instead of the non-existent `HEADERLAB_NAA_CLIENT_ID`. (Less invasive than renaming the secret. The variable name passed into the build remains `HEADERLAB_NAA_CLIENT_ID` so the Vite define and source code stay unchanged.)
- `src/Scripts/services/retrieval/GetHeaders.ts` — change strict equality `=== "Office API header request failed."` to `startsWith("Office API header request failed")` so the Graph fallback reason gets composed regardless of whether an error code/message detail follows.
- `src/Scripts/services/retrieval/GetHeaders.test.ts` — add a coverage case for the new format where the API error string includes a `(<code>: <message>)` suffix.

## Re-sideload?

Not required for this commit. Manifest unchanged. iOS picks up the new bundle on next pane open (after CDN propagation, ~1 minute).

## Expected outcome

If `MHA_NAA_CLIENT_ID` secret holds the correct Entra app GUID (which it should — it's been there since 2026-04-01), Graph fallback will now actually be invoked on iOS. Two cases:

1. **Graph succeeds** — headers load on iOS. Diagnostics tab shows `API used: Graph`. Done.
2. **Graph fails** — the user sees a much more informative error than before, e.g. `Office API header request failed (7000: ...). Graph fallback unavailable: <specific reason>.` That error tells us exactly what to fix next.
