/**
 * Summary section: key metadata fields as label/value pairs with RFC links.
 */

import { violationBadge } from "./ViolationBadge";
import { ViolationGroup } from "../../rules/types/AnalysisTypes";
import { getViolationsForRow } from "../../rules/ViolationUtils";
import { Summary } from "../../Summary";
import { clear, el } from "../rendering/dom";

export function renderSummary(container: HTMLElement, summary: Summary, totalTime: string, violationGroups: ViolationGroup[]): void {
    clear(container);
    if (!summary.exists()) {
        container.appendChild(el("div", { class: "hl-empty" }, "No summary data found."));
        return;
    }

    const grid = el("div", { class: "hl-kv" });

    for (const row of summary.rows) {
        if (!row.value) continue;

        const keyEl = el("span", { class: "hl-kv__key" });
        if (row.url) {
            keyEl.appendChild(el("a", { href: row.url, target: "_blank", rel: "noopener" }, row.label));
        } else {
            keyEl.textContent = row.label;
        }

        const valEl = el("span", { class: "hl-kv__value" });
        // Show value with postFix for creation time
        const displayValue = row.toString().replace(`${row.label}: `, "");
        valEl.textContent = displayValue;

        // Inline violations
        const violations = getViolationsForRow(row, violationGroups);
        if (violations.length > 0) {
            valEl.appendChild(document.createTextNode(" "));
            valEl.appendChild(violationBadge(violations[0]!.rule.severity));
        }

        grid.appendChild(keyEl);
        grid.appendChild(valEl);
    }

    // Total delivery time
    if (totalTime) {
        const keyEl = el("span", { class: "hl-kv__key" }, "Delivery time");
        const valEl = el("span", { class: "hl-kv__value" }, totalTime);
        grid.appendChild(keyEl);
        grid.appendChild(valEl);
    }

    container.appendChild(grid);
}
