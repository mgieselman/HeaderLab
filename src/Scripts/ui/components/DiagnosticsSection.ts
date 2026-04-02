/**
 * Diagnostics section: violation groups displayed as expandable cards.
 */

import { violationBadge } from "./ViolationBadge";
import { ViolationGroup } from "../../rules/types/AnalysisTypes";
import { clear, el } from "../rendering/dom";

export function renderDiagnostics(container: HTMLElement, violationGroups: ViolationGroup[]): void {
    clear(container);
    if (!violationGroups || violationGroups.length === 0) {
        container.appendChild(el("div", { class: "hl-empty" }, "No violations detected."));
        return;
    }

    // Summary banner
    const counts = { error: 0, warning: 0, info: 0 };
    for (const group of violationGroups) {
        counts[group.severity] += group.violations.length;
    }

    const highestSeverity = counts.error > 0 ? "error" : counts.warning > 0 ? "warning" : "info";
    const parts: string[] = [];
    if (counts.error) parts.push(`${counts.error} error${counts.error > 1 ? "s" : ""}`);
    if (counts.warning) parts.push(`${counts.warning} warning${counts.warning > 1 ? "s" : ""}`);
    if (counts.info) parts.push(`${counts.info} info`);

    container.appendChild(
        el("div", { class: `hl-diagnostics-banner hl-diagnostics-banner--${highestSeverity}`, role: "alert" },
            parts.join(", ") + " found"
        )
    );

    // Violation groups
    for (const group of violationGroups) {
        const details = el("details", { class: "hl-details", open: true });

        const summary = el("summary", null);
        summary.appendChild(violationBadge(group.severity));
        summary.appendChild(document.createTextNode(" " + group.displayName));
        if (group.violations.length > 1) {
            summary.appendChild(document.createTextNode(` (${group.violations.length})`));
        }
        details.appendChild(summary);

        const content = el("div", { class: "hl-details__content" });
        for (const violation of group.violations) {
            const item = el("div", { style: "margin-bottom: 0.5rem; font-size: 0.85rem;" });

            // Show affected sections
            for (const section of violation.affectedSections) {
                const sectionEl = el("div", { style: "color: var(--color-text-secondary);" });
                if ("header" in section && section.header) {
                    sectionEl.textContent = `${section.header}: ${("value" in section ? section.value : "") || ""}`;
                }
                item.appendChild(sectionEl);
            }

            if (violation.parentMessage && violation.parentMessage !== group.displayName) {
                item.appendChild(el("div", { style: "font-style: italic; color: var(--color-text-muted); font-size: 0.8rem;" },
                    `Part of: ${violation.parentMessage}`
                ));
            }

            content.appendChild(item);
        }

        details.appendChild(content);
        container.appendChild(details);
    }
}
