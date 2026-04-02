# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HeaderLab (package name: `mha`) is an email Message Header Analyzer. It parses raw email transport headers and displays routing hops, delivery delays, antispam verdicts, authentication results (SPF/DKIM/DMARC), and rule-based diagnostics. It runs both as a standalone web app and as an Outlook Office Add-in (via Office.js/Graph API).

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
- **`retrieval/`** — Header retrieval for Outlook add-in mode. `GetHeaders` tries Office.js API first (`GetHeadersAPI`), falls back to Microsoft Graph (`GetHeadersGraph`). Uses `HeaderCallbacks` interface to decouple from UI.

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
- Vite globals: `__AIKEY__`, `__BUILDTIME__`, `__NAACLIENTID__`, `__VERSION__` are replaced at build time via `define` in `vite.config.ts`.
- UI re-renders on `AppState.subscribe()` callbacks — no virtual DOM, sections are rebuilt on tab switch.
- Build output must produce HTML files matching `manifest.json`: `mha.html`, `Default.html`, `DesktopPane.html`, `MobilePane.html`, `Functions.html`.

## Code Style

- 4-space indentation, double quotes, semicolons required, Windows line endings (CRLF)
- camelCase for variables/methods, PascalCase for types/enums
- Strict TypeScript: `noExplicitAny`, all strict checks enabled
- Imports must be ordered: builtins → external → internal → sibling/parent → index (enforced by eslint `import/order`)
- One class per file (`max-classes-per-file`)
- Tests use Vitest with jsdom environment; test files are colocated as `*.test.ts`

## Deployment

Deploys to Azure Static Web Apps from `Pages/` directory. Build output goes to `Pages/`. CI workflows in `.github/workflows/` run on push to `main`.
