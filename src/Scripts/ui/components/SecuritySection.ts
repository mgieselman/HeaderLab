/**
 * Security & Antispam section: forefront and Microsoft antispam reports.
 */

import { violationBadge } from "./ViolationBadge";
import { AntiSpamReport } from "../../row/AntiSpamReport";
import { ForefrontAntiSpamReport } from "../../row/ForefrontAntiSpamReport";
import { Row } from "../../row/Row";
import { ViolationGroup } from "../../rules/types/AnalysisTypes";
import { getViolationsForRow } from "../../rules/ViolationUtils";
import { clear, el } from "../rendering/dom";

export function renderSecurity(
    container: HTMLElement,
    forefront: ForefrontAntiSpamReport,
    antispam: AntiSpamReport,
    violationGroups: ViolationGroup[]
): void {
    clear(container);

    const hasForefront = forefront.exists();
    const hasAntispam = antispam.exists();

    if (!hasForefront && !hasAntispam) {
        container.appendChild(el("div", { class: "hl-empty" }, "No antispam headers found."));
        return;
    }

    if (hasForefront) {
        container.appendChild(renderReport(forefront.displayName, forefront.rows, violationGroups));
    }

    if (hasAntispam) {
        container.appendChild(renderReport(antispam.displayName, antispam.rows, violationGroups));
    }
}

function renderReport(title: string, rows: Row[], violationGroups: ViolationGroup[]): HTMLElement {
    const card = el("div", { class: "hl-card" });
    card.appendChild(el("div", { class: "hl-card__header" },
        el("span", { class: "hl-card__title" }, title)
    ));

    const grid = el("div", { class: "hl-kv" });
    for (const row of rows) {
        if (!row.value) continue;

        const keyEl = el("span", { class: "hl-kv__key" }, row.label);
        const valEl = el("span", { class: "hl-kv__value" });

        // Use plain text value — valueUrl contains anchor HTML which we don't want to innerHTML
        valEl.textContent = row.value;

        const violations = getViolationsForRow(row, violationGroups);
        if (violations.length > 0) {
            valEl.appendChild(document.createTextNode(" "));
            valEl.appendChild(violationBadge(violations[0]!.rule.severity));
        }

        grid.appendChild(keyEl);
        grid.appendChild(valEl);
    }

    card.appendChild(grid);
    return card;
}
