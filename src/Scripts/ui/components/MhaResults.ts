import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { HeaderModel } from "../../HeaderModel";
import { OtherRow } from "../../row/OtherRow";
import { ReceivedRow } from "../../row/ReceivedRow";
import { Row } from "../../row/Row";
import { SummaryRow } from "../../row/SummaryRow";
import { RuleViolation } from "../../rules/types/AnalysisTypes";
import { escapeAndHighlight, getViolationsForRow } from "../../rules/ViolationUtils";

/**
 * Main results component: renders tabbed header analysis output.
 * Replaces UnifiedRenderer + HTML templates with reactive Lit rendering.
 *
 * Note: decorators (@customElement, @state) are not used because ts-loader
 * with transpileOnly strips them. Manual registration at bottom of file.
 */
export class MhaResults extends LitElement {
    // Declare reactive state properties (replaces @state() decorators)
    static override properties = {
        activeTab: { state: true },
        viewModel: { state: true },
        errorMessage: { state: true },
        showOriginalHeaders: { state: true },
    };

    private activeTab = "summary-view";
    private viewModel: HeaderModel | null = null;
    private errorMessage = "";
    private showOriginalHeaders = false;

    // Opt out of shadow DOM so existing CSS applies
    protected override createRenderRoot(): HTMLElement {
        return this;
    }

    async analyze(headers: string): Promise<void> {
        this.viewModel = await HeaderModel.create(headers);
        this.errorMessage = "";
        this.hidden = false;
    }

    clear(): void {
        this.viewModel = null;
        this.errorMessage = "";
        this.showOriginalHeaders = false;
        this.activeTab = "summary-view";
    }

    showError(message: string): void {
        this.errorMessage = message;
    }

    getModelString(): string {
        return this.viewModel?.toString() ?? "";
    }

    private switchTab(tab: string): void {
        this.activeTab = tab;
    }

    protected override render() {
        const tabs = [
            { id: "summary-view", label: "Summary", icon: this.summaryIcon },
            { id: "received-view", label: "Received", icon: this.receivedIcon },
            { id: "antispam-view", label: "Antispam", icon: this.antispamIcon },
            { id: "other-view", label: "Other", icon: this.otherIcon },
        ];

        return html`
            <div class="content-header">
                <nav class="toolbar nav-bar" id="nav-bar" role="toolbar" aria-label="Navigation">
                    ${tabs.map(tab => html`
                        <fluent-button
                            appearance="subtle"
                            class="nav-button ${this.activeTab === tab.id ? "is-active" : ""}"
                            data-content="${tab.id}"
                            title="${tab.label}"
                            aria-label="${tab.label}${this.activeTab === tab.id ? " Selected" : ""}"
                            @click=${() => this.switchTab(tab.id)}>
                            <span slot="start" aria-hidden="true"><span class="fluent-icon">${tab.icon}</span></span>
                            <span class="button-label" style="${this.activeTab === tab.id ? "" : "display:none"}">${tab.label}</span>
                        </fluent-button>
                    `)}
                </nav>
            </div>
            <div class="content-main">
                ${this.errorMessage ? html`
                    <div class="error-message">
                        <fluent-card class="error-card">
                            <div class="error-content">
                                <span class="fluent-icon" aria-hidden="true">${this.errorIcon}</span>
                                <div class="error-text">${this.errorMessage}</div>
                            </div>
                        </fluent-card>
                    </div>
                ` : nothing}
                <div class="header-view" style="display:block">
                    ${this.activeTab === "summary-view" ? this.renderSummary()
        : this.activeTab === "received-view" ? this.renderReceived()
            : this.activeTab === "antispam-view" ? this.renderAntispam()
                : this.renderOther()}
                </div>
            </div>
        `;
    }

    private renderSummary() {
        if (!this.viewModel) return nothing;

        const rows = this.viewModel.summary.rows.filter((r: SummaryRow) => r.value);

        return html`
            <div class="summary-list">
                ${rows.map((row: SummaryRow) => {
        const highlighted = escapeAndHighlight(row.value, this.viewModel!.violationGroups);
        const violations = getViolationsForRow(row, this.viewModel!.violationGroups);
        return html`
                        <div class="section-header">
                            ${row.label}
                            ${violations.map(v => html` ${this.renderInlineViolation(v)}`)}
                        </div>
                        <div class="code-box"><pre><code>${unsafeHTML(highlighted)}</code></pre></div>
                    `;
    })}
            </div>
            ${this.renderDiagnostics()}
            ${this.viewModel.originalHeaders ? html`
                <div class="orig-header-ui">
                    <fluent-button appearance="accent"
                        aria-expanded="${this.showOriginalHeaders}"
                        aria-label="Toggle original headers display"
                        @click=${() => { this.showOriginalHeaders = !this.showOriginalHeaders; }}>
                        <span slot="start" class="fluent-icon fluent-icon--toggle" aria-hidden="true"
                            style="transform: rotate(${this.showOriginalHeaders ? "90deg" : "0deg"})">
                            ${this.chevronIcon}
                        </span>
                        Original Headers
                    </fluent-button>
                    <div class="code-box" style="${this.showOriginalHeaders ? "" : "display:none"}">
                        <textarea readonly aria-label="Original email headers" title="Original email headers">${this.viewModel.originalHeaders}</textarea>
                    </div>
                </div>
            ` : nothing}
        `;
    }

    private renderReceived() {
        if (!this.viewModel || this.viewModel.receivedHeaders.rows.length === 0) return nothing;

        let firstRow = true;
        return html`
            <div class="received-list">
                <ul class="hop-list">
                    ${this.viewModel.receivedHeaders.rows.map((row: ReceivedRow, index: number) => html`
                        <li class="hop-list-item" tabindex="0" id="received${index}">
                            ${(() => {
        if (firstRow) {
            firstRow = false;
            return html`
                                        <span class="hop-primary-text">
                                            <span class="hop-label">From: </span>
                                            <span class="from-value">${String(row.from)}</span>
                                        </span>
                                        <span class="hop-secondary-text">
                                            <span class="hop-label">To: </span>
                                            <span class="to-value">${String(row.by)}</span>
                                        </span>
                                    `;
        } else {
            const percent = Number(row.percent.value ?? 0);
            const delayText = row.delay.value !== null ? String(row.delay.value) : "";
            return html`
                                        <div class="progress-icon">
                                            <div class="down-icon">
                                                <span class="fluent-icon">${this.arrowDownIcon}</span>
                                            </div>
                                            <div class="progress-container">
                                                <fluent-progress class="hop-progress" value="${percent}" max="100"></fluent-progress>
                                                <div class="progress-description">${delayText}</div>
                                            </div>
                                        </div>
                                        <span class="hop-secondary-text">
                                            <span class="hop-label">To: </span>
                                            <span class="to-value">${String(row.by)}</span>
                                        </span>
                                    `;
        }
    })()}
                            <div class="hop-list-selection"></div>
                        </li>
                    `)}
                </ul>
            </div>
        `;
    }

    private renderAntispam() {
        if (!this.viewModel) return nothing;

        const forefront = this.viewModel.forefrontAntiSpamReport.rows;
        const antispam = this.viewModel.antiSpamReport.rows;

        if (forefront.length === 0 && antispam.length === 0) return nothing;

        return html`
            <div class="antispam-list">
                ${forefront.length > 0 ? html`
                    <div class="section-header">Forefront Antispam Report</div>
                    <hr/>
                    <table class="fluent-table"><tbody>
                        ${forefront.map((row: Row) => this.renderTableRow(row))}
                    </tbody></table>
                ` : nothing}
                ${antispam.length > 0 ? html`
                    <div class="section-header">Microsoft Antispam Report</div>
                    <hr/>
                    <table class="fluent-table"><tbody>
                        ${antispam.map((row: Row) => this.renderTableRow(row))}
                    </tbody></table>
                ` : nothing}
            </div>
        `;
    }

    private renderOther() {
        if (!this.viewModel) return nothing;

        const rows = this.viewModel.otherHeaders.rows.filter((r: OtherRow) => r.value);
        if (rows.length === 0) return nothing;

        return html`
            <div class="other-list">
                ${rows.map((row: OtherRow) => this.renderOtherRow(row))}
            </div>
        `;
    }

    private renderTableRow(row: Row) {
        const violations = getViolationsForRow(row, this.viewModel!.violationGroups);
        const headerContent = row.url || row.label || row.header;
        const valueContent = row.valueUrl
            ? row.valueUrl
            : escapeAndHighlight(row.value, this.viewModel!.violationGroups);

        return html`
            <tr class="popover-row">
                <td class="popover-cell row-header" id="${row.id}">${unsafeHTML(headerContent)}</td>
                <td class="popover-cell" aria-labelledby="${row.id}">
                    <div class="cell-content-wrapper">
                        <div class="cell-main-content">${unsafeHTML(valueContent)}</div>
                        ${violations.length > 0 ? html`
                            <fluent-button appearance="subtle" size="small" class="show-diagnostics-popover-btn"
                                data-severity="${this.highestSeverity(violations)}"
                                aria-label="Show rule violations for ${row.label || row.header}">
                                <span class="severity-icon" aria-hidden="true"></span>
                            </fluent-button>
                        ` : nothing}
                    </div>
                    ${violations.length > 0 ? html`
                        <div class="diagnostics-list">
                            ${violations.map(v => this.renderViolationCard(v))}
                        </div>
                    ` : nothing}
                </td>
            </tr>
        `;
    }

    private renderOtherRow(row: OtherRow) {
        const violations = getViolationsForRow(row, this.viewModel!.violationGroups);
        const headerContent = row.url || row.label || row.header;
        const valueContent = escapeAndHighlight(row.value, this.viewModel!.violationGroups);

        return html`
            <div class="other-header-wrapper">
                <div class="row-header" id="${row.id}">${unsafeHTML(headerContent)}</div>
                ${violations.length > 0 ? html`
                    <fluent-button appearance="subtle" size="small" class="show-diagnostics-popover-btn"
                        data-severity="${this.highestSeverity(violations)}"
                        aria-label="Show rule violations for ${row.label || row.header}">
                        <span class="severity-icon" aria-hidden="true"></span>
                    </fluent-button>
                ` : nothing}
            </div>
            <div class="code-box"><pre><code class="cell-main-content">${unsafeHTML(valueContent)}</code></pre></div>
            ${violations.length > 0 ? html`
                <div class="diagnostics-list">
                    ${violations.map(v => this.renderViolationCard(v))}
                </div>
            ` : nothing}
        `;
    }

    private renderInlineViolation(violation: RuleViolation) {
        return html`
            <span class="violation-inline">
                <fluent-badge class="severity-badge" data-severity="${violation.rule.severity}">
                    ${violation.rule.severity.toUpperCase()}
                </fluent-badge>
                <span class="violation-message" data-severity="${violation.rule.severity}">
                    ${" " + violation.rule.errorMessage}
                </span>
            </span>
        `;
    }

    private renderViolationCard(violation: RuleViolation) {
        const ruleInfo = `${violation.rule.checkSection || ""} / ${violation.rule.errorPattern || ""}`.trim();
        return html`
            <div class="violation-card" data-severity="${violation.rule.severity}">
                <div class="violation-card-header">
                    <fluent-badge class="severity-badge" data-severity="${violation.rule.severity}">
                        ${violation.rule.severity.toUpperCase()}
                    </fluent-badge>
                    <span class="violation-message" data-severity="${violation.rule.severity}">
                        ${" " + violation.rule.errorMessage}
                    </span>
                </div>
                <div class="violation-details">
                    <div class="violation-rule">${ruleInfo}</div>
                    ${violation.parentMessage ? html`
                        <div class="violation-parent-message">Part of: ${violation.parentMessage}</div>
                    ` : nothing}
                </div>
            </div>
        `;
    }

    private renderDiagnostics() {
        if (!this.viewModel?.violationGroups?.length) return nothing;

        return html`
            <div class="ui-diagnostics-report-section">
                <fluent-accordion class="diagnostics-accordion">
                    ${this.viewModel.violationGroups.map(group => html`
                        <fluent-accordion-item>
                            <div slot="heading" class="violation-card-header">
                                <fluent-badge class="severity-badge" data-severity="${group.severity}">
                                    ${group.severity.toUpperCase()}
                                </fluent-badge>
                                <div class="violation-message" data-severity="${group.severity}">
                                    ${group.displayName}
                                </div>
                            </div>
                            <div class="diagnostic-content">
                                ${group.violations.map(v => this.renderViolationCard(v))}
                            </div>
                        </fluent-accordion-item>
                    `)}
                </fluent-accordion>
            </div>
        `;
    }

    private highestSeverity(violations: RuleViolation[]): string {
        const severities = violations.map(v => v.rule.severity);
        if (severities.includes("error")) return "error";
        if (severities.includes("warning")) return "warning";
        return "info";
    }

    // SVG icons as template results
    private get summaryIcon() {
        return html`<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 110 16 8 8 0 010-16zm0 1a7 7 0 100 14 7 7 0 000-14zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z"/></svg>`;
    }
    private get receivedIcon() {
        return html`<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 110 16 8 8 0 010-16zm0 1a7 7 0 100 14 7 7 0 000-14zm-.25 2.5a.75.75 0 01.75.75v3.69l2.28 2.28a.75.75 0 01-1.06 1.06l-2.5-2.5a.75.75 0 01-.22-.53V6.25a.75.75 0 01.75-.75z"/></svg>`;
    }
    private get antispamIcon() {
        return html`<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2.5l7.5 3.75v3.75c0 4.14-3.21 7.3-7.5 8.5-4.29-1.2-7.5-4.36-7.5-8.5V6.25L10 2.5zm0 1.34L3.5 7v3c0 3.53 2.77 6.24 6.5 7.38 3.73-1.14 6.5-3.85 6.5-7.38V7L10 3.84zM10 6a.5.5 0 01.5.5v4a.5.5 0 01-1 0v-4A.5.5 0 0110 6zm0 7a.62.62 0 100-1.25.62.62 0 000 1.25z"/></svg>`;
    }
    private get otherIcon() {
        return html`<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 15.5v-11zM4.5 4a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5h-11zM6 7.5a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h4a.5.5 0 010 1h-4a.5.5 0 01-.5-.5z"/></svg>`;
    }
    private get errorIcon() {
        return html`<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 110 16 8 8 0 010-16zm0 1a7 7 0 100 14 7 7 0 000-14zm3.45 4.15a.5.5 0 01.05.64l-.05.06L10.7 10l2.75 2.15a.5.5 0 01-.56.84l-.06-.04L10 10.72l-2.83 2.23a.5.5 0 01-.67-.74l.05-.06L9.3 10 6.55 7.85a.5.5 0 01.56-.84l.06.04L10 9.28l2.83-2.23a.5.5 0 01.62.1z"/></svg>`;
    }
    private get chevronIcon() {
        return html`<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M7.65 4.15c.2-.2.5-.2.7 0l5.49 5.46c.2.2.2.52 0 .71l-5.49 5.46a.5.5 0 01-.7-.7L12.8 10 7.65 4.85a.5.5 0 010-.7z"/></svg>`;
    }
    private get arrowDownIcon() {
        return html`<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2.5a.5.5 0 01.5.5v11.8l3.64-3.65a.5.5 0 01.72.71l-4.5 4.5a.5.5 0 01-.72 0l-4.5-4.5a.5.5 0 01.72-.71l3.64 3.65V3a.5.5 0 01.5-.5z"/></svg>`;
    }
}

// Manual custom element registration (ts-loader transpileOnly strips decorators)
customElements.define("mha-results", MhaResults);

declare global {
    interface HTMLElementTagNameMap {
        "mha-results": MhaResults; // eslint-disable-line @typescript-eslint/naming-convention
    }
}
