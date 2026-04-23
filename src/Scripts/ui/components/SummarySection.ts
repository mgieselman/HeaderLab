/**
 * Summary section: insight list at top, then key metadata fields as label/value pairs with RFC links.
 */

import { HeaderModel } from "../../model/HeaderModel";
import { generateInsights } from "../insights/InsightEngine";
import { renderInsightList } from "../insights/InsightList";
import { clear, el } from "../rendering/dom";

export function renderSummary(container: HTMLElement, model: HeaderModel): void {
    clear(container);
    const summary = model.summary;

    if (!summary.exists()) {
        container.appendChild(el("div", { class: "hl-empty" }, "No summary data found."));
        return;
    }

    // --- Insight list ---
    const insights = generateInsights(model);
    if (insights.length > 0) {
        container.appendChild(renderInsightList(insights));
    }

    // --- Key-value grid ---
    const grid = el("div", { class: "hl-kv" });

    for (const row of summary.rows) {
        if (!row.value) continue;

        const keyEl = el("span", { class: "hl-kv__key" }, row.label);
        const valEl = el("span", { class: "hl-kv__value" });
        const displayValue = row.toString().replace(`${row.label}: `, "");
        valEl.textContent = displayValue;

        grid.appendChild(keyEl);
        grid.appendChild(valEl);
    }

    // Total delivery time
    const totalTime = summary.totalTime;
    if (totalTime) {
        const keyEl = el("span", { class: "hl-kv__key" }, "Delivery time");
        const valEl = el("span", { class: "hl-kv__value" }, totalTime);
        grid.appendChild(keyEl);
        grid.appendChild(valEl);
    }

    container.appendChild(grid);
}
