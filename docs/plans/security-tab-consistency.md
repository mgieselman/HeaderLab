# Security Tab UI Consistency

Rework the Security section to match the Summary section's flat, insight-led layout. Bundled with the in-progress Insight engine changes since the two touch overlapping files and the rework depends on anchored insights to paint per-row severity.

## Goals

- Drop the card chrome used only by the Security tab.
- Surface a filtered insight list (categories: `auth`, `spam`, `security`) at the top of the Security tab, matching Summary.
- Replace the single flat kv grid with three flat subsections: Classification, Origin & transport, and a collapsed raw dump.
- Suppress Origin & transport when the message is intra-org (`DIR=INT`).
- Move per-report severity from a whole-card border to a per-row left-border tint, anchored to the insight that flagged it.
- Append the insight's plain-language detail after the raw value in each affected row (e.g. `SCL: 5 — Sent to Junk by default`).
- Extract the shared insight-list renderer so both Summary and Security consume one implementation.

## Decisions locked in

- Summary keeps the full insight list; Security renders the filtered subset. Intentional duplication.
- Per-row severity is the left-border vertical line (same idiom as `hl-insight--*` and the old `hl-card--*`).
- A dedicated Tier 1 verdict chip-row for SPF/DKIM/DMARC/CompAuth is deferred — those fields already appear in the top insight list. Building a chip row requires extracting `Authentication-Results` parsing into a model-layer field (`HeaderModel.authentication`) and is out of scope for this pass.

## Files changed

- `src/Scripts/ui/insights/InsightList.ts` (new) — shared `renderInsightList(insights, filter?)` with severity ordering.
- `src/Scripts/ui/insights/InsightList.test.ts` (new) — unit tests covering render, severity ordering, detail/filter branches.
- `src/Scripts/ui/insights/Insight.ts` — added `InsightAnchor` type and optional `anchor` field on `Insight` so the Security tab can map an insight back to the kv row that produced it.
- `src/Scripts/ui/insights/InsightEngine.ts` — anchored the Forefront/Antispam-derived insights (SCL, SFV, CAT, BCL, PCL, CTRY, DIR, CIP, SFTY) to their source rows. Also contains the independent insight-system edits that were already in the working tree (auth parsing, TLS analysis, priority, violation summary, expanded codes).
- `src/Scripts/ui/insights/InsightEngine.test.ts` — updated test fixtures and assertions that came with the Insight engine work.
- `src/Scripts/ui/components/SummarySection.ts` — now imports `renderInsightList` from the shared module; deleted its local copy.
- `src/Scripts/ui/components/SecuritySection.ts` — full rewrite. New signature `(container, model)`. Renders filtered insight list, Classification subsection (SFV/CAT/SCL/PCL/SFTY/BCL), Origin & transport subsection (CIP/PTR/H/CTRY/LANG/IPV/DIR/ARC, suppressed when `DIR=INT`), and a collapsed `<details>` with the raw Forefront + Antispam dump including `source`/`unparsed`.
- `src/Scripts/ui/components/ResultsView.ts` — updated the `renderSecurity` caller to the new signature.
- `src/Scripts/ui/components/RoutingSection.ts` — small class-name additions (`hl-hop__route`, `hl-hop__fields__value`) that were in the working tree alongside the Insight-engine work; included in this publish since they're tiny and already landed locally.
- `src/Content/components.css` — added `.hl-subsection`, `.hl-subsection__title`, `.hl-subsection__rows`, `.hl-kv-row`, `.hl-kv-row--{error,warning,success,info}`, `.hl-kv__detail`. Follow-up: added `.hl-subsection--card` (border + radius + padding matching `.hl-insight` chrome) so Classification and Origin & transport read as cards alongside the insight list.
- `src/Scripts/ui/components/SecuritySection.ts` — follow-up: `renderSubsection()` now applies `hl-subsection--card`.

## Validation

- `npm test` — 402 tests pass.
- `npm run lint` — clean (pre-existing warnings only).
- `npm run build` — succeeds.
- Manual visual QA against sample data (spam / clean / intra-org / empty) should be performed before merge.

## Not in scope

- Dedicated auth-results parser and verdict chip row. Requires a new `model/Authentication.ts` or `row/` type; deferred.
- Updating `rules.json` BCL thresholds (6→7 for error). Insight engine already uses the corrected thresholds independently.
- RFC links on auth-row keys (matching `OtherSection`'s link pattern).
