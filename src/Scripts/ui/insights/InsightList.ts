/**
 * Shared renderer for the insight list shown at the top of section panels.
 */

import { Insight } from "./Insight";
import { el } from "../rendering/dom";

const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, success: 2, info: 3 };

export function renderInsightList(
    insights: Insight[],
    filter?: (insight: Insight) => boolean
): HTMLElement {
    const items = filter ? insights.filter(filter) : insights;
    const list = el("ul", { class: "hl-insights" });

    const sorted = [...items].sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    );

    for (const insight of sorted) {
        const label = el("span", { class: "hl-insight__label" }, insight.label);
        const item = el("li", { class: `hl-insight hl-insight--${insight.severity}` }, label);
        if (insight.detail) {
            item.appendChild(el("span", { class: "hl-insight__detail" }, ` — ${insight.detail}`));
        }
        list.appendChild(item);
    }

    return list;
}
