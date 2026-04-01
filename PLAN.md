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
- Delete all files in `src/Pages/` (mha.html, uitoggle.html, privacy.html, and all redirect pages)

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
- After Phase 1, the retrieval layer (`GetHeaders → GetHeadersAPI → GetHeadersGraph`) has no data-layer dependencies. Clean fallback chain with `HeaderCallbacks` interface for decoupling. No issues.

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
- `@azure/msal-browser`: required for Graph API nested app auth. Keep.
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

### 2.5 Priority & Sequencing

**Must complete before Phase 3 (new UI):**
| # | Proposal | Impact | Effort | Risk |
|---|----------|--------|--------|------|
| H | Remove unused dependencies | High | Trivial | Low |
| G | Add tsc --noEmit CI step | Medium | Trivial | None |
| A | Flatten Row hierarchy | Medium | Small | Low |
| B | Extract DOM from ViolationUtils | Medium | Small | Low |
| C | Simplify rule loading | Low | Small | Low |

**Can happen in parallel with or after Phase 3:**
| # | Proposal | Impact | Effort | Risk |
|---|----------|--------|--------|------|
| D | Make Diag/Errors injectable | Medium | Medium | Medium |
| E | Group labels by section | Low | Small | Low |
| I | Raise coverage thresholds | Low | Trivial | None |
| J | Add bundle size tracking | Low | Small | None |

**Deferred until after Phase 3 UI framework choice:**
| # | Proposal | Impact | Effort | Risk |
|---|----------|--------|--------|------|
| — | Migrate webpack → Vite | High | Medium | Medium |
| — | Migrate Jest → Vitest | Medium | Low | Low |
| — | ESM-only output | Low | Low | Medium |

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
