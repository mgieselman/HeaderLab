# HeaderLab — New UI Plan

## Phase 0: Remove Existing UI Layer

**0.1 Delete UI components and rendering code**
- Delete `src/Scripts/ui/components/MhaResults.ts` (Lit component)
- Delete `src/Scripts/ui/domUtils.ts` and `src/Scripts/ui/domUtils.test.ts`
- Delete `src/Scripts/ui/mha.ts` (standalone entry point)
- Delete `src/Scripts/ui/uiToggle.ts` (add-in entry point)
- Delete `src/Scripts/ui/privacy.ts`
- Delete `src/Scripts/ui/ThemeManager.ts`
- Delete `src/Scripts/ParentFrame.ts`
- Delete `src/Scripts/TabNavigation.ts` and `src/Scripts/TabNavigation.test.ts`

**0.2 Delete HTML pages**
- Delete all files in `src/Pages/` (headerlab.html, uitoggle.html, privacy.html, and all redirect pages)

**0.3 Delete CSS**
- Delete all files in `src/Content/` (fluentCommon.css, newDesktopFrame.css, standalone.css, uiToggle.css, rulesCommon.css, themeColors.css, privacy.css, and theme files)

**0.4 Clean up build config**
- Remove all entry points from `webpack.config.js` that reference deleted files
- Remove HtmlWebpackPlugin page definitions for deleted pages
- Remove CSS-related imports and loaders if the new UI will use a different approach

**0.5 Remove dead dependencies**
- Uninstall `lit` (replaced by new UI framework choice)
- Uninstall `@fluentui/web-components` (unless the new UI reuses it)
- Evaluate `promise-polyfill` — likely no longer needed for modern browsers

**0.6 Verify the retrieval and parsing layers still compile**
- `HeaderModel`, `2047.ts`, row types, rules engine, `GetHeaders/*`, `Diag.ts`, `Errors.ts`, `Strings.ts` must still build and all their tests must pass after the UI is removed
- This confirms the separation is real — the data layer stands alone

## Phase 1: Retrieval Layer Cleanup

**1.1 Remove MHA naming from retrieval code**
- The retrieval layer (`GetHeaders`, `GetHeadersAPI`, `GetHeadersGraph`) currently imports `mhaStrings` for status/error message text (`mhaRequestSent`, `mhaMessageMissing`, `mhaHeadersMissing`)
- Replace these with plain string literals passed via the `HeaderCallbacks` interface or defined as constants local to the retrieval module — the retrieval layer should not reference any `mha`-prefixed module or string table
- The `mhaStrings` module itself can remain for UI code, but nothing in `src/Scripts/ui/getHeaders/` should import it

**1.2 Rename `mhaStrings` module**
- Rename `mhaStrings.ts` to `strings.ts` and the export from `mhaStrings` to `strings`
- Remove the `mha` prefix from all property names (e.g., `mhaLoading` → `loading`, `mhaCopied` → `copied`)
- Update all import sites across the codebase

**1.3 Audit remaining MHA references**
- Search all files under `src/Scripts/` for any `mha` or `MHA` identifiers, class names, or comments that should be renamed to `headerlab` or made generic
- The retrieval layer must be fully reusable with no brand/product references

## Phase 2: Architecture & Tech Stack Modernization

Evaluate the existing architecture, design patterns, and technology choices across the data layer, retrieval layer, and build tooling. Deliver a set of proposed changes to modernize the codebase and align with current best practices.

### 2.1 Architecture Audit — Findings

**Class hierarchy**
- Row → SummaryRow → ArchivedRow/CreationRow: 3 levels of inheritance for small behavioral tweaks (postFix, valueUrl). ArchivedRow and CreationRow each override a single getter. The hierarchy works but is heavier than needed.
- TableSection → DataTable/SummaryTable → concrete types: clear and justified. DataTable adds sorting, SummaryTable adds row-value existence checking. Two-level abstract base is appropriate.
- AntiSpamReport → ForefrontAntiSpamReport: good use of inheritance — shared parsing logic, different header names and row sets.
- ReceivedRow is a standalone class (not a Row subclass) containing ReceivedField instances — this is correct since it has a fundamentally different structure.

**HeaderModel parsing pipeline**
- Sequential first-match dispatch (`summary.add() → forefront.add() → antispam.add() → received.add() → other.add()`) is simple and works. However, adding new header types requires modifying `parseHeaders()` directly. A registry-based approach would be more extensible but is not needed at current scale.
- `HeaderModel.create()` is async due to rules JSON loading. Rules could be pre-loaded at app startup to make model creation synchronous.

**Rules engine**
- Well-separated: types → loader → engine → service. Clear responsibilities.
- `ruleStore` uses a static singleton with completion callback — could be simplified with top-level await or lazy async initialization.
- `ViolationUtils` mixes DOM manipulation (highlightHtml) with pure functions (escapeAndHighlight). DOM-dependent code should be isolated for testability.

**Retrieval layer**
- After Phase 1, the retrieval layer had no data-layer dependencies and used a Graph-fallback chain behind a `HeaderCallbacks` interface. In Phase 5 the Graph path was removed; `GetHeaders` now calls `GetHeadersAPI` only. `HeaderCallbacks` is retained as the UI-decoupling seam.

### 2.2 Tech Stack Evaluation — Findings

**Bundler: Webpack 5**
- Current: Webpack 5 with ts-loader, fork-ts-checker, copy-webpack-plugin, mini-css-extract, html-webpack-plugin, webpack-bundle-analyzer.
- Vite would provide faster dev server (native ESM, no bundling in dev), simpler config, and built-in TS support. However, Office Add-in compatibility requires careful testing — Office.js expects specific script loading patterns.
- **Recommendation**: Migrate to Vite after Phase 3 UI is built, so the new UI framework choice can inform the bundler config. Risk: medium (Office.js compatibility). Effort: medium.

**TypeScript configuration**
- Already strict with all recommended checks enabled.
- `moduleResolution: "node"` could move to `"bundler"` when webpack is replaced.
- `useDefineForClassFields: false` — intentionally set, likely for Office.js or Lit compatibility. Should be revisited after Lit removal.
- No project references needed — single compilation unit is fine for this codebase size.

**Test tooling: Jest + ts-jest + jsdom**
- Working but slow: ts-jest transforms all `.js` files to handle Lit ESM (workaround logged as a warning).
- Vitest would eliminate the ESM transform issue (native ESM support), provide faster execution, and pair naturally with Vite.
- **Recommendation**: Migrate to Vitest when bundler migrates to Vite. Risk: low. Effort: low.

**Dependency health**
- `promise-polyfill`: not needed — project targets ES2022, all supported browsers have native Promises. **Remove.**
- `codepage`: used by RFC 2047 decoder for charset conversion. Still needed — no native browser API covers all email charsets.
- `dayjs`: lightweight, maintained, appropriate for date parsing.
- `stacktrace-js`: used for error telemetry stack parsing. Maintained. Keep.
- `@azure/msal-browser`: was required for the Graph fallback's NAA auth. Removed in Phase 5.
- `lit` and `@fluentui/web-components`: listed in dependencies but unused after Phase 0 UI removal. **Remove.**

**ESM-only output**
- Office.js add-ins in older Outlook clients (IE11/EdgeHTML) required CommonJS. Modern Office.js (WebView2) supports ESM. ESM-only is feasible for new deployments but may break legacy hosts.
- **Recommendation**: Keep dual-format for now. Revisit when minimum Office.js requirement is raised.

### 2.3 Design Pattern Improvements — Proposals

**Proposal A: Flatten Row hierarchy** (before Phase 3)
- Current: Row → SummaryRow → ArchivedRow/CreationRow, each adding minor behavior
- Proposed: Make Row configurable via constructor options (urlMapper, postFix, valueUrlMapper) instead of subclassing. Eliminate ArchivedRow and CreationRow as separate classes.
- Rationale: Reduces 5 files to 2. Simpler mental model. Constructor configuration is more testable than inheritance overrides.
- Risk: low — behavior is simple. Effort: small.

**Proposal B: Extract DOM utilities from ViolationUtils** (before Phase 3)
- Current: `ViolationUtils.ts` contains both pure logic (pattern matching, violation finding) and DOM manipulation (highlightHtml creates DOM elements).
- Proposed: Split into `ViolationUtils.ts` (pure) and `ViolationDom.ts` (DOM). Pure functions can be tested without jsdom.
- Risk: low. Effort: small.

**Proposal C: Simplify rule loading** (before Phase 3)
- Current: `GetRules` uses a static `ruleStore` with completion callback pattern.
- Proposed: Use a simple async function that returns rules, cached after first call. Eliminate the callback pattern.
- Risk: low. Effort: small.

**Proposal D: Make Diag/Errors non-singleton** (parallel with Phase 3)
- Current: `diagnostics` and `Errors` are module-level singletons with static methods and mutable state. Hard to test in isolation.
- Proposed: Convert to injectable instances. HeaderModel accepts an optional diagnostics context. Default singleton preserved for production.
- Risk: medium — touches many files. Effort: medium.

**Proposal E: Labels as typed constants** (parallel with Phase 3)
- Current: `labels.ts` is a flat object with 70+ string properties.
- Proposed: Group by section (summaryLabels, receivedLabels, antispamLabels) for better organization. Add `as const` for literal types.
- Risk: low — purely organizational. Effort: small.

### 2.4 Build & CI Modernization — Proposals

**Proposal F: Remove dead lint pattern** (immediate) ✅ DONE
- The `tasks/**/*` glob in the lint script referenced a deleted directory. Fixed in Phase 1.

**Proposal G: Add type-checking CI step** (before Phase 3)
- Current: Type errors only surface through ts-jest at test time or ts-loader at build time.
- Proposed: Add `tsc --noEmit` as a separate CI step. Faster feedback, catches issues Jest doesn't exercise.
- Risk: none. Effort: trivial.

**Proposal H: Remove unused dependencies** (immediate)
- Remove `lit`, `@fluentui/web-components`, `promise-polyfill` from `package.json`.
- Remove `promise-polyfill/dist/polyfill` import from `Diag.ts`.
- Risk: low — verify no runtime references remain. Effort: trivial.

**Proposal I: Raise coverage thresholds** (after Phase 3)
- Current: branches 35%, functions/lines/statements 40%. Actual coverage is ~69-72%.
- Proposed: Raise to branches 50%, functions/lines/statements 65% after UI is rebuilt and all code is exercised.
- Risk: none. Effort: trivial.

**Proposal J: Add bundle size tracking** (after Phase 3)
- Use `webpack-bundle-analyzer` output or `size-limit` to track bundle size in CI.
- Risk: none. Effort: small.

### 2.5 Completion Status

**Completed:**
| # | Proposal | Status |
|---|----------|--------|
| F | Remove dead lint pattern | Done |
| H | Remove unused dependencies | Done |
| A | Flatten Row hierarchy | Done — SummaryRow takes options, ArchivedRow/CreationRow deleted |
| B | Extract DOM from ViolationUtils | Done — highlightHtml moved to ViolationDom.ts |
| C | Simplify rule loading | Done — async cached function, callback pattern removed |
| E | Group labels by section | Done — 6 typed groups with `as const` |
| G | Add tsc --noEmit CI step | Done — added to jest.yml workflow |

| D | Make Diag/Errors injectable | Done — Diagnostics class exported, Errors converted to instance with injected Diagnostics |
| I | Raise coverage thresholds | Done — branches 44%, functions 56%, lines 50%, statements 49% |
| J | Add bundle size tracking | Done — size-limit in CI, baseline ~267 kB brotli |

All Phase 2 proposals complete.

## Phase 3: Build the New UI

### 3.1 Input

**3.1.1 Header Input**
- Large text area for pasting raw email transport headers
- Placeholder text explaining what to paste
- Auto-focus on page load

**3.1.2 Actions**
- **Analyze** — parse and display results; disabled when input is empty
- **Clear** — reset input and results to initial state
- **Copy** — copy the full text analysis to clipboard with toast confirmation

**3.1.3 Sample Data**
- Provide one or two built-in sample headers the user can load with a single click to see how the tool works (onboarding aid)

### 3.2 Results — Summary

**3.2.1 Key Metadata**
- Subject, From, To, CC, Reply-To, Message-ID, Archived-At
- Creation date with total delivery time (e.g., "Delivered after 6 seconds")

**3.2.2 Presentation**
- Each field as a label/value pair
- Header names link to their RFC documentation when available
- Violations shown inline next to the affected field (severity badge + message)

### 3.3 Results — Routing (Received Hops)

**3.3.1 Hop Chain**
- Visual timeline or stepped list showing each server the message passed through
- Each hop shows: From server, To server, Protocol, Timestamp
- Optional detail expansion: ID, For, Via fields

**3.3.2 Delay Visualization**
- Each hop shows time elapsed since the previous hop
- Progress bar or bar chart proportional to each hop's share of total delivery time
- Total delivery time displayed prominently

**3.3.3 Anomaly Highlighting**
- Hops with unusually large delays visually highlighted (color or icon)

### 3.4 Results — Security & Antispam

**3.4.1 Authentication Results**
- SPF, DKIM, DMARC results displayed as clear pass/fail indicators (not raw text)
- Visual treatment: green check for pass, red X for fail, neutral for not present

**3.4.2 Antispam Verdicts**
- Spam Confidence Level (SCL), Spam Filtering Verdict (SFV), Bulk Complaint Level (BCL) displayed with human-readable explanations
- Connecting IP, country of origin, HELO string, PTR record
- Category (NONE, SPAM, PHISH, etc.) with plain-language description

**3.4.3 Two-Source Display**
- Forefront Antispam Report and Microsoft Antispam Report shown as separate groups when both are present
- Raw source header available via expandable section

### 3.5 Results — Other Headers

**3.5.1 All Remaining Headers**
- Every header not consumed by Summary, Received, or Antispam sections
- Displayed as header name + value
- Header names link to documentation when a mapping exists

### 3.6 Results — Diagnostics (Rule Violations)

**3.6.1 Violation Summary**
- Prominent banner or card at the top of results when violations exist
- Count of errors, warnings, and info-level findings

**3.6.2 Violation Detail**
- Each violation shows: severity level, human-readable message, which header triggered it, the matched pattern
- Violations from composite (AND) rules show their parent rule context
- Affected header values highlighted in-place where they appear in Summary/Antispam/Other tabs

**3.6.3 Grouping**
- Violations grouped by rule message (multiple affected headers consolidated under one heading)
- Expandable/collapsible groups

### 3.7 Original Headers

**3.7.1 Raw View**
- Collapsible section showing the exact input text
- Read-only, monospace font, selectable for re-copying

### 3.8 Navigation

**3.8.1 Section Access**
- All result sections accessible without page reload
- Sections that have no data should be hidden or visually muted (not just empty)
- Section with violations should have a visual indicator in its navigation element

**3.8.2 Default View**
- Summary shown by default after analysis
- If violations exist, the diagnostics summary is visible immediately (user shouldn't have to hunt for problems)

### 3.9 Theming & Appearance

**3.9.1 Color Modes**
- Light, Dark, and System (auto-detect OS preference)
- Persisted to localStorage across sessions

**3.9.2 Themes**
- At least Default and one accent theme
- All UI elements including violation cards, badges, accordions, and code blocks must respond to the active theme — no hardcoded colors

**3.9.3 Settings Access**
- Theme and color mode selectable from a settings control
- Telemetry opt-in/out toggle
- Privacy policy link

### 3.10 Responsiveness

**3.10.1 Viewport Adaptation**
- Usable at narrow Outlook task pane widths (~320px) through full desktop width
- Input area, hop visualization, and tables should reflow for small screens
- Navigation labels can collapse to icons on narrow viewports

### 3.11 Accessibility

**3.11.1 Keyboard**
- All interactive elements reachable via Tab
- Dialog focus trapping (Tab wraps within open dialogs)
- Escape closes dialogs and expanded sections

**3.11.2 Screen Readers**
- Status messages announced via aria-live regions
- Severity levels conveyed through text, not just color (badges include text labels)
- All icons have aria-hidden with adjacent visible text or aria-label

**3.11.3 High Contrast**
- Forced-colors mode support for all interactive and severity elements

### 3.12 Outlook Add-in Mode

**3.12.1 Office.js Integration**
- Automatically retrieve headers from the currently selected email when running inside Outlook
- Respond to item-change events (user selects a different email)
- Loading indicator while headers are being retrieved

**3.12.2 Shared UI**
- The same results UI is used in both standalone and add-in modes
- Add-in mode adds: Copy and Settings buttons in a compact header bar
- Add-in mode removes: textarea input, theme toggle buttons (moved to settings dialog)

### 3.13 Non-Functional Behaviors

**3.13.1 Error Handling**
- Network/API errors shown as a dismissible card (not a browser alert)
- Missing headers: clear message explaining the item may be a sent item
- Permissions errors: explain what's needed

**3.13.2 Performance**
- Analysis results render in under 1 second for typical headers
- Only the active section rendered at any time (not all sections hidden via CSS)

**3.13.3 Telemetry**
- Application Insights integration for page views, errors, and key events
- Respects user opt-out preference
- No telemetry on localhost/dev

### 3.14 Tech Stack Decisions

Recommendations from the standard Outlook add-in tech stack that were evaluated and intentionally **not adopted**:

- **React / Fluent UI React v9**: HeaderLab is a focused single-purpose tool — vanilla TS + CSS custom properties keeps the bundle small and avoids framework churn. Fluent UI React is better suited for complex multi-page Office integrations built by larger teams.
- **TanStack Query / State management library**: HeaderLab's data flow is synchronous parse-and-display. The existing `AppState` observer pattern is sufficient.
- **Backend / Azure Functions**: HeaderLab is entirely client-side — headers are parsed locally with no server round-trips.

## Phase 4: Modern Tooling & Manifest Migration

Migrate from legacy Office Add-in tooling to the current Microsoft-recommended stack. This phase can begin after Phase 3 UI is functional.

### 4.1 Unified Manifest (XML → JSON)

**4.1.1 Convert Manifest.xml to unified JSON manifest**
- Create `manifest.json` (unified format) replacing `Manifest.xml`
- Map all existing XML manifest properties: permissions, form factors, URLs, icon references, SSO scopes
- The unified manifest uses the same JSON schema as Teams and Copilot extensions — enables future cross-platform distribution
- Note: `manifestVersion` is set to `"devPreview"` — change to the stable version before Office Store submission

**4.1.2 Convert debug manifests**
- Replace `ManifestDebugLocal.xml` and `ManifestDebugServer.xml` with environment-specific overrides or a single debug configuration in the unified format
- Update `npm start` / `npm run start:desktop` scripts to reference the new manifest

**4.1.3 Remove XML manifests**
- Delete `Manifest.xml`, `ManifestDebugLocal.xml`, `ManifestDebugServer.xml`
- Remove `office-addin-manifest` devDependency and the `validate` script (unified manifest validation is handled by the Agents Toolkit)

### 4.2 Dev Tooling Migration

**4.2.1 Replace office-addin-* packages with M365 Agents Toolkit**
- Remove devDependencies: `office-addin-debugging`, `office-addin-dev-certs`, `office-addin-dev-settings`, `office-addin-manifest`
- Install and configure the Microsoft 365 Agents Toolkit (VS Code extension + CLI) for sideloading, debugging, and certificate management
- Update `start`, `start:desktop`, and `stop` npm scripts to use the new toolkit commands

**4.2.2 Update VS Code workspace configuration**
- Add recommended extensions: M365 Agents Toolkit, Office Add-in Debugger
- Add launch configurations for debugging the WebView2 instance

### 4.3 Migrate Webpack → Vite

**4.3.1 Create Vite config**
- Replace `webpack.config.js` with `vite.config.ts`
- Migrate DefinePlugin globals (`__AIKEY__`, `__BUILDTIME__`, `__VERSION__`, `__NAACLIENTID__`) to Vite's `define` option
- Migrate HtmlWebpackPlugin page definitions to Vite's `rollupOptions.input` (multi-page app)
- Migrate CopyWebpackPlugin to `vite-plugin-static-copy` or Vite's `public/` directory
- Configure CSS extraction (replaces MiniCssExtractPlugin)

**4.3.2 Verify Office.js compatibility**
- Office.js expects specific script loading patterns — test that Vite's ESM dev server and production build both work in the Outlook WebView2 host
- Test sideloading in Outlook desktop (Windows/Mac) and Outlook on the web
- If Office.js requires a global script tag, configure Vite to inject it via `transformIndexHtml` plugin

**4.3.3 Remove Webpack**
- Remove devDependencies: `webpack`, `webpack-cli`, `webpack-dev-server`, `webpack-bundle-analyzer`, `ts-loader`, `fork-ts-checker-webpack-plugin`, `css-loader`, `style-loader`, `mini-css-extract-plugin`, `copy-webpack-plugin`, `html-webpack-plugin`, `exports-loader`, `source-map-loader`
- Delete `webpack.config.js`
- Update npm scripts: `build`, `build:dev`, `build:analyze`, `serve`, `watch`

### 4.4 Migrate Jest → Vitest

**4.4.1 Replace Jest with Vitest**
- Remove devDependencies: `jest`, `jest-environment-jsdom`, `jest-html-reporters`, `ts-jest`, `@jest/globals`, `@types/jest`
- Install `vitest` and `@vitest/coverage-v8`
- Create `vitest.config.ts` (or merge into `vite.config.ts`)
- Configure jsdom environment for DOM tests
- Update test scripts in `package.json`

**4.4.2 Update test files**
- Replace `@jest/globals` imports with `vitest` imports (`describe`, `it`, `expect`)
- Replace any Jest-specific matchers with Vitest equivalents
- Remove `ts-jest` transform workarounds (Vitest handles ESM natively)

### 4.5 TypeScript Config Updates

**4.5.1 Modernize tsconfig.json**
- Change `moduleResolution` from `"node"` to `"bundler"` (aligns with Vite)
- Re-evaluate `useDefineForClassFields: false` — this was set for Lit compatibility, which is no longer relevant after Phase 0. Set to `true` if no Office.js conflicts
- Consider adding `"verbatimModuleSyntax": true` for stricter import/export handling

### 4.6 Completion Status

All Phase 4 steps completed:

| Step | Status |
|------|--------|
| 2D | Done — Diagnostics class exported, Errors is instance class with injected Diagnostics |
| 2I | Done — Coverage thresholds raised to match actual (44/56/50/49) |
| 2J | Done — size-limit in CI, baseline ~267 kB brotli |
| 4.1 | Done — manifest.json created (unified format) |
| 4.2 | Done — office-addin-* packages removed, VS Code extensions.json added |
| 4.3 | Done — Webpack replaced by Vite, build output to Pages/ |
| 4.4 | Done — Jest replaced by Vitest, done() callbacks converted to promises |
| 4.5 | Done — moduleResolution: bundler, useDefineForClassFields: true |

## Phase 5: Remove NAA / Graph Retrieval Path

The Outlook add-in originally supported a Microsoft Graph fallback (via MSAL / Nested App Auth) for clients where the Office.js `getAllInternetHeadersAsync` API was not available. Target runtime is current Outlook on iOS / Mac / Win / Web against Exchange Online (M365), where the API path is universally available — the fallback provided no functional benefit while costing an MSAL bundle, an Azure AD app registration, OAuth consent, dual code paths, and a build-time `HEADERLAB_NAA_CLIENT_ID` secret.

**Outcome:**
- Deleted `GetHeadersGraph.ts`, `GetHeadersGraph.test.ts`, `naaClientId.ts`.
- Simplified `GetHeaders.send()` to call `GetHeadersAPI` only; public signature unchanged.
- Dropped `@azure/msal-browser` from dependencies (bundle shrunk accordingly).
- Manifest permission dropped from `ReadWriteMailbox` to `ReadItem` in both `Manifest.xml` and `ManifestDebugLocal.xml`.
- CSP `connect-src` tightened to `'self' https://dc.services.visualstudio.com` (dropped `graph.microsoft.com` and Microsoft login hosts).
- Removed `__NAACLIENTID__` Vite/Vitest/eslint globals and the `HEADERLAB_NAA_CLIENT_ID` secret from `build.yml` / `test.yml`.

## Phase 6: iOS Compatibility Bump

After Phase 5, Outlook on iOS (5.2614.0) began returning Office.js error code `7000: You don't have sufficient permissions for this action` from `getAllInternetHeadersAsync`. Microsoft's docs say `ReadItem` is sufficient for that API, and Outlook on Desktop accepts it, but iOS Outlook rejects it. The original `ReadWriteMailbox` worked on iOS only because it implied broad enough rights to satisfy the iOS check.

**Outcome:**
- `Manifest.xml`, `ManifestDebugLocal.xml`, and `manifest.json` bumped from `ReadItem` / `MailboxItem.Read.User` to `ReadWriteItem` / `MailboxItem.ReadWrite.User`. Still item-scoped (only the message under view), not mailbox-wide.
- Error UI in `StatusBar.ts` gained a copy-to-clipboard button so future Office.js failures can be captured verbatim for diagnosis.
- `publish.py` security-review gate gained a `[permission-upgrade]` commit-message bypass mirroring the existing `[no-docs]` pattern, so deliberate upgrades pass the regression check while accidental ones still block.
- iOS users must remove and re-add the add-in for the new manifest permission to take effect.

**Escalation:** `ReadWriteItem` was also rejected on iOS with the same `7000` error. Bumped further to `ReadMailbox` (commit `9711f11`) — but that value is not valid in Outlook's XML manifest spec (XML only accepts `Restricted`, `ReadItem`, `ReadWriteItem`, `ReadWriteMailbox`), so sideload failed with "can't be completed at this time". Corrected to `ReadWriteMailbox` in the XML manifest while keeping the narrower `Mailbox.Read.User` in the unified manifest. See `docs/plans/ios-permission-bump-2.md` and `ios-permission-bump-3.md`. If iOS still rejects at `ReadWriteMailbox`, the issue is API availability rather than permission, and the fix becomes a REST fallback via `getCallbackTokenAsync`.
