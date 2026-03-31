# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Message Header Analyzer (MHA) - a Microsoft Outlook add-in and standalone web app that parses email transport headers into human-readable analysis. Built with TypeScript, Office.js, Fluent UI Web Components, and Framework7. Deployed to Azure Web Apps and available on Office AppSource.

## Commands

```bash
npm run build              # Production build (webpack, minified)
npm run build:dev          # Development build
npm run build:analyze      # Production build with bundle analysis report
npm run dev-server         # Start webpack dev server at https://localhost:44336
npm run watch              # Continuous build on file changes

npm test                   # Lint + run all Jest tests (pretest runs lint)
npm run test:debug         # Jest with verbose output
npx jest path/to/file.test.ts  # Run a single test file

npm run lint               # ESLint check
npm run lint:fix           # ESLint auto-fix

npm start                  # Launch add-in debug in Outlook (uses ManifestDebugLocal.xml)
npm run validate           # Validate Office manifest
```

## Code Style (enforced by ESLint)

- 4-space indent, double quotes, semicolons required, CRLF line endings
- camelCase for variables/properties, PascalCase for types/enums
- No `any` types allowed (`@typescript-eslint/no-explicit-any`)
- Max 1 class per file
- Import ordering enforced (builtin, external, internal, parent, sibling, index)

## Architecture

### Data Flow

```
Raw headers (Outlook API / EWS / REST / paste)
  -> src/Scripts/ui/getHeaders/   # Header retrieval layer
  -> src/Scripts/2047.ts          # RFC 2047 decoding
  -> src/Scripts/HeaderModel.ts   # Central model: parses headers into structured data
  -> src/Scripts/rules/           # Rules engine: validates headers, detects violations
  -> src/Scripts/ui/Table.ts      # Renders analysis into DOM
```

### Key Directories

- **`src/Scripts/ui/`** - Entry points and UI logic. Each entry point corresponds to a page/frame variant (mha, uiToggle, classicDesktopFrame, newDesktopFrame, newMobilePaneIosFrame, privacy). `getHeaders/` handles retrieval from different Outlook APIs.
- **`src/Scripts/row/`** - Data models for parsed header sections (ReceivedRow, Antispam, ForefrontAntispam, CreationRow, ArchivedRow, OtherRow, SummaryRow). `Row.ts` is the base class.
- **`src/Scripts/table/`** - Table rendering: DataTable, Received, Other, SummaryTable, TableSection, Column.
- **`src/Scripts/rules/`** - Rules engine with `RulesService.ts` as entry point. Sub-directories: `engine/` (validation rule types: simple, AND, header-section-missing), `loaders/` (rule loading), `types/` (TypeScript interfaces).
- **`src/Pages/`** - HTML templates consumed by HtmlWebpackPlugin.
- **`src/data/rules.json`** - Rule definitions loaded at runtime.

### Webpack Entry Points

Defined in `webpack.config.js`. Six scripted pages, each mapping to `src/Scripts/ui/<name>.ts`. Output goes to `Pages/` with a version hash prefix. Path aliases: `@` -> `src/`, `@scripts` -> `src/Scripts/`, `@styles` -> `src/Content/`.

### Testing

- Jest with jsdom environment, ts-jest transform
- Test files are co-located with source (e.g., `Row.test.ts` next to `Row.ts`)
- Coverage thresholds: 35% branches, 40% functions/lines/statements
- Custom matchers in `src/Scripts/jestMatchers/`

### Globals (via DefinePlugin)

- `__VERSION__` - build version hash
- `__AIKEY__` - Application Insights instrumentation key
- `__BUILDTIME__` - build timestamp
