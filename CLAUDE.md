# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HeaderLab (package name: `mha`) is an email Message Header Analyzer. It parses raw email transport headers and displays routing hops, delivery delays, antispam verdicts, authentication results (SPF/DKIM/DMARC), and rule-based diagnostics. It runs both as a standalone web app and as an Outlook Office Add-in (via Office.js/Graph API).

Originally named MHA (Microsoft Header Analyzer), now renamed to HeaderLab. MHA references have been removed from the data and retrieval layers. See `PLAN.md` for the UI rebuild plan and architecture modernization proposals.

## Build & Dev Commands

```bash
npm ci                    # install dependencies
npm run build             # production build (webpack), output to Pages/
npm run build:dev         # development build
npm run serve             # webpack dev server (port 44336)
npm test                  # lint then run all tests (pretest runs lint)
npm run test:debug        # verbose test output
npx jest path/to/file     # run a single test file
npx jest --testPathPattern="Received"  # run tests matching pattern
npm run lint              # eslint
npm run lint:fix          # eslint with auto-fix
```

Node >= 18.12.0 required. CI uses Node 22.

## Architecture

### Data Layer (`src/Scripts/`)

The core is a pure data/parsing layer with no UI dependencies:

- **`HeaderModel`** — central orchestrator. `HeaderModel.create(headers)` parses headers and runs rule analysis. Parsing dispatches each header to the first matching section (summary → antispam → received → other).
- **`labels.ts`** — string constants for display labels (section names, field labels, status messages).
- **`Strings.ts`** — HTML encoding, header-to-URL mapping (RFC links), clipboard utilities.
- **`2047.ts`** — RFC 2047 MIME encoded-word decoder.
- **Row types (`row/`)** — individual header parsers: `ReceivedRow`, `Antispam`, `ForefrontAntispam`, `SummaryRow`, `OtherRow`, etc. Each row type knows how to parse its specific header format.
- **Table types (`table/`)** — collections of rows: `Received` (computes hop deltas/delays), `Other`, `SummaryTable`. `Received.computeDeltas()` calculates time differences between hops.
- **Rules engine (`rules/`)** — validates parsed headers against rules defined in `src/data/rules.json`. Entry point is `rulesService.analyzeHeaders(model)`. Rule types: `SimpleValidationRule`, `AndValidationRule`, `HeaderSectionMissingRule`. Results are `ViolationGroup[]` on the model.

### Retrieval Layer (`src/Scripts/ui/getHeaders/`)

Retrieves headers when running as an Outlook add-in:
- **`GetHeaders`** — tries Office.js API first (`GetHeadersAPI`), falls back to Microsoft Graph (`GetHeadersGraph`).
- Uses `HeaderCallbacks` interface to communicate status/errors to UI without importing UI modules.

### UI Layer (`src/Scripts/ui/`)

Vanilla TypeScript + CSS custom properties, no framework. Two entry points:

- **`app.ts`** — standalone mode: textarea input + Analyze/Clear/Copy/Sample buttons + results display.
- **`addin.ts`** — Outlook add-in mode: auto-retrieves headers via `GetHeaders.send()`, no textarea.

**Components (`components/`)**: `AppShell` (layout), `HeaderInput`, `TabNav`, `ResultsView`, section renderers (`SummarySection`, `RoutingSection`, `SecuritySection`, `OtherSection`, `DiagnosticsSection`, `OriginalSection`), `SettingsDialog`, `StatusBar`, `ViolationBadge`.

**State (`state/`)**: `AppState` (observer pattern — holds model, active tab, status) and `ThemeManager` (light/dark/system persisted to localStorage via `data-theme` attribute).

**CSS (`src/Content/`)**: `theme.css` (custom properties for light/dark/system/high-contrast), `layout.css` (responsive grid, 320px–desktop), `components.css` (buttons, cards, tables, badges, dialogs), `typography.css`.

### Key Patterns

- Header parsing order matters: `summary.add()` → `forefrontAntiSpamReport.add()` → `antiSpamReport.add()` → `receivedHeaders.add()` → `otherHeaders.add()`. First match wins.
- `HeaderModel.create()` is async (static factory) because rule analysis loads rules from JSON.
- Webpack globals: `__AIKEY__`, `__BUILDTIME__`, `__NAACLIENTID__`, `__VERSION__` are replaced at build time.
- UI re-renders on `AppState.subscribe()` callbacks — no virtual DOM, sections are rebuilt on tab switch.
- Build output must produce HTML files matching Manifest.xml: `mha.html`, `Default.html`, `DesktopPane.html`, `MobilePane.html`, `Functions.html`.

## Code Style

- 4-space indentation, double quotes, semicolons required, Windows line endings (CRLF)
- camelCase for variables/methods, PascalCase for types/enums
- Strict TypeScript: `noExplicitAny`, all strict checks enabled
- Imports must be ordered: builtins → external → internal → sibling/parent → index (enforced by eslint `import/order`)
- One class per file (`max-classes-per-file`)
- Tests use Jest with jsdom environment; test files are colocated as `*.test.ts`

## Deployment

Deploys to Azure Static Web Apps from `Pages/` directory. Build output goes to `Pages/`. CI workflows in `.github/workflows/` run on push to `main`.
