/**
 * Summary section: insight list at top, then key metadata fields as label/value pairs with RFC links.
 */

import { HeaderModel } from "../../model/HeaderModel";
import { Insight } from "../insights/Insight";
import { generateInsights } from "../insights/InsightEngine";
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

function renderInsightList(insights: Insight[]): HTMLElement {
    const list = el("ul", { class: "hl-insights" });

    // Order: error first, then warning, success, info
    const order: Record<string, number> = { error: 0, warning: 1, success: 2, info: 3 };
    const sorted = [...insights].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

    for (const insight of sorted) {
        const label = el("span", { class: "hl-insight__label" }, insight.label);
        const detail = el("span", { class: "hl-insight__detail" }, ` \u2014 ${insight.detail}`);
        const item = el("li", { class: `hl-insight hl-insight--${insight.severity}` }, label, detail);
        list.appendChild(item);
    }

    return list;
}
