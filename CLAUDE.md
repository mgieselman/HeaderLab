# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HeaderLab (package name: `mha`) is an email Message Header Analyzer. It parses raw email transport headers and displays routing hops, delivery delays, antispam verdicts, authentication results (SPF/DKIM/DMARC), and rule-based diagnostics. It runs both as a standalone web app and as an Outlook Office Add-in (Office.js with a Microsoft Graph fallback for hosts where `getAllInternetHeadersAsync` is not implemented, notably Outlook for iOS).

Originally named MHA (Microsoft Header Analyzer), now renamed to HeaderLab. MHA references have been removed from the data and retrieval layers. See `PLAN.md` for the UI rebuild plan and architecture modernization proposals.

## Build & Dev Commands

```bash
npm ci                    # install dependencies
npm run build             # production build (vite), output to Pages/
npm run build:dev         # development build
npm run dev               # vite dev server (port 44336)
npm test                  # lint then run all tests (pretest runs lint)
npm run test:debug        # verbose test output
npm run test:watch        # vitest in watch mode
npx vitest run path/to/file  # run a single test file
npm run lint              # eslint
npm run lint:fix          # eslint with auto-fix
npm run size              # check bundle size limits
```

Node >= 18.12.0 required. CI uses Node 22.

## Architecture

Code is organized under `src/Scripts/` into layers with dependencies flowing downward:

### `config/` — Build-time constants
Vite `define` wrappers: `aikey`, `buildTime`, `version`, `naaClientId`. No internal imports.

### `core/` — Pure domain utilities
Foundational modules imported broadly across all layers:
- **`Strings.ts`** — HTML encoding, header-to-URL mapping (RFC links), clipboard utilities.
- **`Dates.ts`** / **`DateWithNum.ts`** — Cross-browser date parsing via dayjs.
- **`Decoder.ts`** / **`Block.ts`** — RFC 2047 MIME encoded-word decoder.
- **`labels.ts`** — Typed string constants grouped by section (`statusLabels`, `timeLabels`, `summaryLabels`, `receivedLabels`, `otherLabels`, `antispamLabels`).

### `row/` — Header row parsers
Individual header parsers: `ReceivedRow`, `AntiSpamReport`, `ForefrontAntiSpamReport`, `SummaryRow` (with constructor options for postFix/valueUrlMapper), `OtherRow`. Base class `Row` with `Header`, `Match`, `ReceivedField` value types.

### `table/` — Row collections
Collections of rows: `Received` (computes hop deltas/delays), `Other`, `SummaryTable`. Base classes `TableSection` and `DataTable` (adds sorting).

### `model/` — Domain aggregate
- **`HeaderModel`** — central orchestrator. `HeaderModel.create(headers)` parses headers and runs rule analysis. Parsing dispatches each header to the first matching section (summary → antispam → received → other).
- **`Summary`** — summary metadata rows (Subject, From, Date, etc.), tightly coupled to HeaderModel.

### `rules/` — Validation engine
Validates parsed headers against rules defined in `public/data/rules.json`. Entry point: `rulesService.analyzeHeaders(model)`. Rule types: `SimpleValidationRule`, `AndValidationRule`, `HeaderSectionMissingRule`. Results are `ViolationGroup[]` on the model. Sub-directories: `engine/`, `loaders/`, `types/`.

### `services/` — Infrastructure
- **`Diagnostics.ts`** — Application Insights telemetry (exported class + `diagnostics` singleton).
- **`Errors.ts`** / **`Stack.ts`** — Error collection (instance class with injected `Diagnostics`), stack trace parsing.
- **`ParentFrameUtils.ts`** — Query string parsing, diagnostics string generation.
- **`retrieval/`** — Header retrieval for Outlook add-in mode. See the **Header retrieval architecture** section below for the full story (it has cost real time and is non-obvious). Short version: `GetHeaders.send()` tries `GetHeadersAPI` (`getAllInternetHeadersAsync`) first, then falls back to `GetHeadersGraph` (Microsoft Graph via NAA/MSAL) when the API path returns empty. The fallback is load-bearing on Outlook for iOS — do not remove it. `HeaderCallbacks` interface decouples retrieval from UI.

### `ui/` — Presentation layer
Vanilla TypeScript + CSS custom properties, no framework. Two entry points:
- **`app.ts`** — standalone mode: textarea input + Analyze/Clear/Copy/Sample buttons + results display.
- **`addin.ts`** — Outlook add-in mode: auto-retrieves headers via retrieval layer, no textarea.

**`components/`**: `AppShell` (layout), `HeaderInput`, `TabNav`, `ResultsView`, section renderers (`SummarySection`, `RoutingSection`, `SecuritySection`, `OtherSection`, `DiagnosticsSection`, `OriginalSection`), `SettingsDialog`, `StatusBar`, `ViolationBadge`.

**`state/`**: `AppState` (observer pattern — holds model, active tab, status) and `ThemeManager` (light/dark/system persisted to localStorage via `data-theme` attribute).

**`rendering/`**: `dom.ts` — typed DOM creation helpers (`el()`, `text()`, `clear()`).

### CSS (`src/Content/`)
`theme.css` (custom properties for light/dark/system/high-contrast), `layout.css` (responsive, 320px–desktop), `components.css` (buttons, cards, tables, badges, dialogs), `typography.css`.

### Key Patterns

- Header parsing order matters: `summary.add()` → `forefrontAntiSpamReport.add()` → `antiSpamReport.add()` → `receivedHeaders.add()` → `otherHeaders.add()`. First match wins.
- `HeaderModel.create()` is async (static factory) because rule analysis loads rules from JSON.
- Vite globals: `__AIKEY__`, `__BUILDTIME__`, `__VERSION__`, `__NAACLIENTID__` are replaced at build time via `define` in `vite.config.ts`.
- UI re-renders on `AppState.subscribe()` callbacks — no virtual DOM, sections are rebuilt on tab switch.
- Build output must produce HTML files matching `manifest.json`: `headerlab.html`, `Default.html`, `DesktopPane.html`, `MobilePane.html`, `Functions.html`.

## Header retrieval architecture (READ BEFORE TOUCHING `retrieval/`)

The retrieval layer has a non-obvious shape that exists because of a still-unfixed Microsoft platform bug. Removing what looks like dead code here will silently break Outlook for iOS users. See `docs/plans/restore-naa-graph.md` and the Phase 7 entry in `PLAN.md` for the full investigation.

### Two-path fallback chain

`GetHeaders.send(headersLoadedCallback, callbacks)` runs in this order:

1. **`GetHeadersAPI.send()`** — calls `Office.context.mailbox.item.getAllInternetHeadersAsync` (Mailbox 1.9). Requires `ReadItem`. The async result is *swallowed* on failure (`resolve("")` rather than throw) so the dispatcher can try the next path.
2. **`GetHeadersGraph.send()`** — only if step 1 returned empty. Calls `acquireTokenSilent` (then `acquireTokenPopup` on failure) via MSAL Nested App Authentication, then `GET https://graph.microsoft.com/v1.0/me/messages/{itemId}?$expand=singleValueExtendedProperties($filter=id eq 'String 0x007D')` to read the raw transport-headers extended property.
3. **Composed error** — if both paths fail and `canUseGraph()` is false, the user-facing message gets `Graph fallback unavailable: <reason>` appended so the silent-skip mode is visible. The check uses `startsWith("Office API header request failed")` because the API error string includes the Office.js error code/message in parens (added today: `(<code>: <message>)`).

`pendingDetailedError` wrapping in `GetHeaders.send()` exists to preserve the API error if Graph also fails without setting a more useful one. Don't simplify it away unless you've fully traced the four-way matrix of (API set onError or not) × (Graph set onError or not).

### Why the fallback exists

`getAllInternetHeadersAsync` is **not implemented on Outlook for iOS** even though `Office.context.requirements.isSetSupported("Mailbox", "1.9") === true` returns true there. iOS reports the high requirement-set number for the *subset* of Mailbox 1.9 APIs that's been ported to mobile, and this one isn't on the allow-list. The call fails with `code 7000 / "You don't have sufficient permissions for this action"` — a misleading message; the real meaning is "API not available on this host." Permission elevation does not fix it (we tried `ReadItem` → `ReadWriteItem` → `ReadWriteMailbox`; all hit the same 7000). Microsoft has had open issues on this for ~18 months (`microsoft/MHA#896`, `#1460`; `OfficeDev/office-js#2554`, `#4109`) with no committed fix.

The Graph fallback path is the only working iOS path. Outlook Desktop (Win/Mac) and Outlook on the Web honor the direct API and never reach the Graph branch. The diagnostics tab's "API used" field will read `"API"` on Desktop/Web and `"Graph"` on iOS.

### Build-time secret wiring

The Graph path needs an Entra app client ID at build time:
- Source secret in the GitHub repo: **`MHA_NAA_CLIENT_ID`** (legacy name from when this was the MHA fork — never renamed).
- `.github/workflows/build.yml` maps it: `HEADERLAB_NAA_CLIENT_ID: ${{ secrets.MHA_NAA_CLIENT_ID }}`.
- `vite.config.ts` reads `process.env["HEADERLAB_NAA_CLIENT_ID"]` and bakes it into `__NAACLIENTID__`.
- `src/Scripts/config/naaClientId.ts` exports the value at runtime.
- `GetHeadersGraph.canUseGraph()` returns false if it's empty, which causes the Graph branch to be silently skipped.

If you ever see iOS failing with the bare `Office API header request failed (7000: ...)` and no `Graph fallback unavailable` suffix, suspect a string-equality bug in the message composition (the suffix code path didn't run). If you see the suffix with `No NAA client ID configured`, the secret pipeline is broken.

### Lessons baked in

- **Never trust `isSetSupported` alone on mobile Outlook.** The advertised requirement set covers a partial set of APIs. For any new mobile-touched feature, implement a Graph (or other) fallback.
- **Don't remove the Graph fallback.** Commit `50f293a` did this on the assumption the API path was sufficient everywhere; commit `d3fe8b7` had to put it all back.
- **The XML manifest `<Permissions>` element accepts only four values: `Restricted`, `ReadItem`, `ReadWriteItem`, `ReadWriteMailbox`.** `ReadMailbox` looks reasonable but is invalid in the XML schema — Outlook rejects sideload with "can't be completed at this time." It *is* valid in the unified `manifest.json` (which uses Graph-style scope names like `Mailbox.Read.User`), but the two systems are not interchangeable.
- **CSP must NOT apply to add-in pages** (`Default.html`, `DesktopPane.html`, `MobilePane.html`, `Functions.html`). Office.js initializes a telemetry iframe to `telemetryservice.firstpartyapps.oaspapps.com` and (when NAA is in use) loads MSAL frames from `login.microsoftonline.com` — both blocked by any meaningful `frame-src`. CSP is set per-route in `staticwebapp.config.json` *only* on the standalone web pages (`/`, `/headerlab.html`, `/privacy.html`).

## Code Style

- 4-space indentation, double quotes, semicolons required, Windows line endings (CRLF)
- camelCase for variables/methods, PascalCase for types/enums
- Strict TypeScript: `noExplicitAny`, all strict checks enabled
- Imports must be ordered: builtins → external → internal → sibling/parent → index (enforced by eslint `import/order`)
- One class per file (`max-classes-per-file`)
- Tests use Vitest with jsdom environment; test files are colocated as `*.test.ts`

## Deployment

Deploys to Azure Static Web Apps from `Pages/` directory. Build output goes to `Pages/`. CI workflows in `.github/workflows/` run on push to `main`.
