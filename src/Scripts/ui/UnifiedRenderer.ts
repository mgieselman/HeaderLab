import { HeaderModel } from "../HeaderModel";
import { DomUtils } from "./domUtils";
import { ViolationUI } from "./ViolationUI";
import { OtherRow } from "../row/OtherRow";
import { ReceivedRow } from "../row/ReceivedRow";
import { Row } from "../row/Row";
import { SummaryRow } from "../row/SummaryRow";
import { RuleViolation, ViolationGroup } from "../rules/types/AnalysisTypes";
import { escapeAndHighlight, getViolationsForRow } from "../rules/ViolationUtils";

/**
 * Unified renderer for MHA analysis results.
 * Used by both the Outlook add-in iframe and the standalone page.
 * Renders into a container that has the standard template structure
 * from newDesktopFrame.html (nav bar, tab views, templates).
 */
export class UnifiedRenderer {
    private viewModel: HeaderModel | null = null;

    /** Render analysis results from raw header string. */
    public async render(headers: string): Promise<void> {
        this.clear();
        this.viewModel = await HeaderModel.create(headers);

        this.buildSummaryTab(this.viewModel);
        this.buildReceivedTab(this.viewModel);
        this.buildAntispamTab(this.viewModel);
        this.buildOtherTab(this.viewModel);
    }

    /** Clear all rendered content. */
    public clear(): void {
        DomUtils.clearElement(".summary-list");
        DomUtils.setText("#original-headers code", "");
        DomUtils.setText("#original-headers textarea", "");
        DomUtils.hideElement(".orig-header-ui");
        DomUtils.clearElement(".received-list");
        DomUtils.clearElement(".antispam-list");
        DomUtils.clearElement(".other-list");
        DomUtils.clearElement(".ui-diagnostics-report-section");
        DomUtils.setText("#error-display .error-text", "");
        DomUtils.hideElement("#error-display");
    }

    /** Get the model-to-string representation for copy. */
    public toString(): string {
        return this.viewModel?.toString() ?? "";
    }

    /** Show an error message in the error display area. */
    public showError(message: string): void {
        DomUtils.setText("#error-display .error-text", message);
        DomUtils.showElement("#error-display");
    }

    /** Initialize the tab navigation and popover dismiss handlers. */
    public static initializeNav(): void {
        // Show summary by default
        DomUtils.showElement(".header-view[data-content='summary-view']");

        // Wire up click events for nav buttons
        DomUtils.getElements("#nav-bar .nav-button").forEach((button: Element) => {
            button.addEventListener("click", function (this: HTMLElement): void {
                const currentActive = DomUtils.getElement("#nav-bar .is-active");
                if (currentActive) {
                    const activeButtonLabel = currentActive.querySelector(".button-label") as HTMLElement;
                    if (activeButtonLabel) {
                        const activeButtonText = activeButtonLabel.textContent?.trim() || "";
                        currentActive.setAttribute("aria-label", activeButtonText);
                    }
                    currentActive.classList.remove("is-active");
                }
                DomUtils.hideAllElements("#nav-bar .button-label");

                this.classList.add("is-active");
                const thisLabel = this.querySelector(".button-label") as HTMLElement;
                if (thisLabel) thisLabel.style.display = "block";

                const content = this.getAttribute("data-content");
                const buttonText = thisLabel?.textContent?.trim() || "";
                this.setAttribute("aria-label", buttonText + " Selected");

                DomUtils.hideAllElements(".header-view");
                if (content) {
                    DomUtils.showElement(`.header-view[data-content='${content}']`);
                }
            });
        });

        // Initialize label visibility
        DomUtils.hideAllElements("#nav-bar .button-label");
        const activeLabel = DomUtils.getElement("#nav-bar .is-active .button-label");
        if (activeLabel) activeLabel.style.display = "block";

        // Initialize original headers toggle
        const buttonElement = DomUtils.getElement("#orig-header-btn");
        if (buttonElement) {
            buttonElement.addEventListener("click", function (): void {
                const toggleIcon = buttonElement.querySelector(".fluent-icon--toggle") as HTMLElement;
                const originalHeaders = DomUtils.getElement("#original-headers");
                const isExpanded = buttonElement.getAttribute("aria-expanded") === "true";

                if (!isExpanded) {
                    buttonElement.setAttribute("aria-expanded", "true");
                    if (originalHeaders) originalHeaders.style.display = "block";
                    if (toggleIcon) toggleIcon.style.transform = "rotate(90deg)";
                } else {
                    buttonElement.setAttribute("aria-expanded", "false");
                    if (originalHeaders) originalHeaders.style.display = "none";
                    if (toggleIcon) toggleIcon.style.transform = "rotate(0deg)";
                }
            });
        }

        // Document-level click handler to close popovers
        document.addEventListener("click", function(event: Event) {
            const target = event.target as HTMLElement;
            if (target.closest(".hop-list-item")) return;
            if (target.closest(".details-overlay-popup") || target.closest(".show-diagnostics-popover-btn")) return;
            UnifiedRenderer.closeAllPopups();
        });

        // Escape key to close popovers
        document.addEventListener("keydown", function(event: KeyboardEvent) {
            if (event.key === "Escape") {
                UnifiedRenderer.closeAllPopups();
            }
        });
    }

    public static closeAllPopups(): void {
        document.querySelectorAll(".details-overlay-popup.is-shown").forEach(callout => {
            callout.classList.remove("is-shown");
            callout.classList.add("is-hidden");
        });
    }

    private buildSummaryTab(viewModel: HeaderModel): void {
        const summaryList = document.querySelector(".summary-list") as HTMLElement;
        if (!summaryList) return;

        viewModel.summary.rows.forEach((row: SummaryRow) => {
            if (row.value) {
                const clone = DomUtils.cloneTemplate("summary-row-template");
                DomUtils.setTemplateText(clone, ".section-header", row.label);

                const highlightedContent = escapeAndHighlight(row.value, viewModel.violationGroups);
                DomUtils.setTemplateHTML(clone, "code", highlightedContent);

                const sectionHeader = clone.querySelector(".section-header") as HTMLElement;
                const rowViolations = getViolationsForRow(row, viewModel.violationGroups);

                if (sectionHeader && rowViolations.length > 0) {
                    rowViolations.forEach((violation: RuleViolation) => {
                        sectionHeader.appendChild(document.createTextNode(" "));
                        sectionHeader.appendChild(ViolationUI.createInlineViolation(violation));
                    });
                }

                summaryList.appendChild(clone);
            }
        });

        // Save original headers and show ui
        DomUtils.setText("#original-headers textarea", viewModel.originalHeaders);
        if (viewModel.originalHeaders) {
            DomUtils.showElement(".orig-header-ui");
        }

        const diagnosticsSection = document.querySelector(".ui-diagnostics-report-section") as HTMLElement;
        if (diagnosticsSection) {
            const diagnosticsContent = ViolationUI.buildDiagnosticsSection(viewModel.violationGroups);
            if (diagnosticsContent) {
                diagnosticsSection.appendChild(diagnosticsContent);
            }
        }
    }

    private buildReceivedTab(viewModel: HeaderModel): void {
        const receivedList = document.querySelector(".received-list") as HTMLElement;
        if (!receivedList || viewModel.receivedHeaders.rows.length === 0) return;

        const listClone = DomUtils.cloneTemplate("received-list-template");
        receivedList.appendChild(listClone);
        const list = receivedList.querySelector("ul") as HTMLElement;

        let firstRow = true;
        viewModel.receivedHeaders.rows.forEach((row: ReceivedRow, index: number) => {
            const itemClone = DomUtils.cloneTemplate("list-item-template");
            const listItem = itemClone.querySelector("li") as HTMLElement;
            listItem.id = "received" + index;
            list.appendChild(itemClone);

            if (firstRow) {
                const clone = DomUtils.cloneTemplate("first-row-template");
                DomUtils.setTemplateText(clone, ".from-value", String(row.from));
                DomUtils.setTemplateText(clone, ".to-value", String(row.by));
                listItem.appendChild(clone);
                firstRow = false;
            } else {
                const progressClone = DomUtils.cloneTemplate("progress-icon-template");
                const percent = Number(row.percent.value ?? 0);
                const progressElement = progressClone.querySelector(".hop-progress") as HTMLElement;
                if (progressElement) {
                    progressElement.setAttribute("value", String(percent));
                    progressElement.setAttribute("max", "100");
                }

                const delayText = row.delay.value !== null ? String(row.delay.value) : "";
                DomUtils.setTemplateText(progressClone, ".progress-description", delayText);
                listItem.appendChild(progressClone);

                const clone = DomUtils.cloneTemplate("secondary-text-template");
                DomUtils.setTemplateText(clone, ".to-value", String(row.by));
                listItem.appendChild(clone);
            }

            // Selection target
            const selectionClone = DomUtils.cloneTemplate("selection-target-template");
            listItem.appendChild(selectionClone);

            // Hop detail popover
            const calloutClone = DomUtils.cloneTemplate("hop-template");
            const calloutContent = calloutClone.querySelector(".hop-details-content") as HTMLElement;
            if (calloutContent) {
                const headerClone = DomUtils.cloneTemplate("hop-header-template");
                calloutContent.appendChild(headerClone);
            }
            listItem.appendChild(calloutClone);

            UnifiedRenderer.addCalloutEntry("From", row.from.value, calloutContent);
            UnifiedRenderer.addCalloutEntry("To", row.by.value, calloutContent);
            UnifiedRenderer.addCalloutEntry("Time", row.date.value, calloutContent);
            UnifiedRenderer.addCalloutEntry("Type", row.with.value, calloutContent);
            UnifiedRenderer.addCalloutEntry("ID", row.id.value, calloutContent);
            UnifiedRenderer.addCalloutEntry("For", row.for.value, calloutContent);
            UnifiedRenderer.addCalloutEntry("Via", row.via.value, calloutContent);

            const overlay = listItem.querySelector(".details-overlay-popup") as HTMLElement;
            if (overlay) {
                UnifiedRenderer.attachOverlayPopup(listItem, overlay);
            }
        });
    }

    private buildAntispamTab(viewModel: HeaderModel): void {
        const antispamList = document.querySelector(".antispam-list") as HTMLElement;
        if (!antispamList) return;

        if (viewModel.forefrontAntiSpamReport.rows.length > 0) {
            DomUtils.appendTemplate("forefront-header-template", antispamList);
            const antispamTable = document.createElement("table");
            antispamTable.className = "fluent-table";
            const antispamTbody = document.createElement("tbody");
            antispamTable.appendChild(antispamTbody);
            antispamList.appendChild(antispamTable);

            viewModel.forefrontAntiSpamReport.rows.forEach((antispamrow: Row) => {
                antispamTbody.appendChild(UnifiedRenderer.createRow("table-row-template", antispamrow, viewModel.violationGroups));
            });
        }

        if (viewModel.antiSpamReport.rows.length > 0) {
            DomUtils.appendTemplate("microsoft-header-template", antispamList);
            const antispamTable = document.createElement("table");
            antispamTable.className = "fluent-table";
            const antispamTbody = document.createElement("tbody");
            antispamTable.appendChild(antispamTbody);
            antispamList.appendChild(antispamTable);

            viewModel.antiSpamReport.rows.forEach((antispamrow: Row) => {
                antispamTbody.appendChild(UnifiedRenderer.createRow("table-row-template", antispamrow, viewModel.violationGroups));
            });
        }
    }

    private buildOtherTab(viewModel: HeaderModel): void {
        const otherList = document.querySelector(".other-list") as HTMLElement;
        if (!otherList) return;

        viewModel.otherHeaders.rows.forEach((otherRow: OtherRow) => {
            if (otherRow.value) {
                otherList.appendChild(UnifiedRenderer.createRow("other-row-template", otherRow, viewModel.violationGroups));
            }
        });
    }

    private static addCalloutEntry(name: string, value: string | number | null, parent: HTMLElement): void {
        if (value) {
            const clone = DomUtils.cloneTemplate("hop-entry-template");
            DomUtils.setTemplateText(clone, ".hop-label", name + ": ");
            DomUtils.setTemplateText(clone, ".hop-value", String(value));
            parent.appendChild(clone);
        }
    }

    private static attachOverlayPopup(trigger: HTMLElement, overlay: HTMLElement): void {
        function showOverlay(): void {
            UnifiedRenderer.closeAllPopups();
            overlay.classList.remove("is-hidden");
            overlay.classList.add("is-shown");

            const triggerRect: DOMRect = trigger.getBoundingClientRect();
            const viewportWidth: number = window.innerWidth;
            const viewportHeight: number = window.innerHeight;
            const leftPosition: number = (viewportWidth - overlay.offsetWidth) / 2;
            let topPosition: number = triggerRect.bottom + 15;
            if (topPosition + overlay.offsetHeight > viewportHeight - 10) {
                topPosition = viewportHeight - overlay.offsetHeight - 10;
            }
            if (topPosition < 10) {
                topPosition = 10;
            }
            overlay.style.left = `${leftPosition}px`;
            overlay.style.top = `${topPosition}px`;
        }

        function hideOverlay(): void {
            overlay.classList.remove("is-shown");
            overlay.classList.add("is-hidden");
        }

        trigger.addEventListener("click", function(event: MouseEvent): void {
            const target = event.target as HTMLElement;
            if (target.closest(".details-overlay-popup")) return;
            event.preventDefault();
            if (overlay.classList.contains("is-shown")) {
                hideOverlay();
            } else {
                showOverlay();
            }
        });

        trigger.addEventListener("keydown", function(event: KeyboardEvent): void {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (overlay.classList.contains("is-shown")) {
                    hideOverlay();
                } else {
                    showOverlay();
                }
            }
        });

        trigger.setAttribute("tabindex", "0");
    }

    private static createRow(template: string, row: Row, violationGroups: ViolationGroup[]): DocumentFragment {
        const clone = DomUtils.cloneTemplate(template);
        DomUtils.setTemplateHTML(clone, ".row-header", row.url || row.label || row.header);
        DomUtils.setTemplateAttribute(clone, ".row-header", "id", row.id);
        DomUtils.setTemplateAttribute(clone, ".cell-main-content", "aria-labelledby", row.id);

        if (row.valueUrl) {
            DomUtils.setTemplateHTML(clone, ".cell-main-content", row.valueUrl);
        } else {
            const highlightedContent = escapeAndHighlight(row.value, violationGroups);
            DomUtils.setTemplateHTML(clone, ".cell-main-content", highlightedContent);
        }

        const effectiveViolations = getViolationsForRow(row, violationGroups);
        if (effectiveViolations.length > 0) {
            const diagnosticsList = clone.querySelector(".diagnostics-list") as HTMLElement;
            effectiveViolations.forEach(v => diagnosticsList.appendChild(ViolationUI.createViolationCard(v)));

            const popoverBtn = clone.querySelector(".show-diagnostics-popover-btn") as HTMLElement;
            const popover = clone.querySelector(".details-overlay-popup") as HTMLElement;
            if (popoverBtn && popover) {
                popover.id = `popover-${row.id}`;

                const severities = effectiveViolations.map(v => v.rule.severity);
                const highestSeverity = severities.includes("error") ? "error" : severities.includes("warning") ? "warning" : "info";
                popoverBtn.setAttribute("data-severity", highestSeverity);
                popoverBtn.id = `popover-btn-${row.id}`;
                popoverBtn.setAttribute("aria-describedby", popover.id);
                popoverBtn.setAttribute("aria-label", `Show rule violations for ${row.label || row.header}`);

                UnifiedRenderer.attachOverlayPopup(popoverBtn, popover);
            }
        }

        return clone;
    }
}
