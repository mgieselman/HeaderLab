/**
 * Routing section: received hops as a stepped list with delay visualization.
 */

import { ReceivedRow } from "../../row/ReceivedRow";
import { Received } from "../../table/Received";
import { clear, el } from "../rendering/dom";

// Delay threshold (ms) above which a hop is considered anomalous (30 seconds)
const ANOMALY_THRESHOLD_MS = 30000;

export function renderRouting(container: HTMLElement, received: Received): void {
    clear(container);
    if (!received.exists()) {
        container.appendChild(el("div", { class: "hl-empty" }, "No received headers found. This is normal for internally sent messages or emails where routing information was stripped."));
        return;
    }

    for (const row of received.rows) {
        container.appendChild(renderHop(row));
    }
}

function renderHop(row: ReceivedRow): HTMLElement {
    const delayMs = typeof row.delaySort.value === "number" ? row.delaySort.value : 0;

    let hopClass = "hl-hop";
    if (delayMs < 0) hopClass += " hl-hop--negative";
    else if (delayMs > ANOMALY_THRESHOLD_MS) hopClass += " hl-hop--anomaly";
    const hop = el("div", { class: hopClass });

    // Header line: hop number, from/by, delay
    const header = el("div", { class: "hl-hop__header" });
    header.appendChild(el("span", { class: "hl-hop__number" }, `#${fieldStr(row.hop)}`));

    const fromBy = [];
    if (fieldStr(row.from)) fromBy.push(fieldStr(row.from));
    if (fieldStr(row.by)) fromBy.push(fieldStr(row.by));
    if (fromBy.length) {
        header.appendChild(el("span", { class: "hl-hop__route" }, fromBy.join(" \u2192 ")));
    }

    if (fieldStr(row.delay)) {
        const isAnomaly = delayMs > ANOMALY_THRESHOLD_MS;
        const isNegative = delayMs < 0;
        const cls = "hl-hop__delay" + (isAnomaly ? " hl-hop__delay--anomaly" : "");
        const delayLabel = isNegative
            ? `⚠ ${fieldStr(row.delay)} (negative)`
            : isAnomaly
                ? `⚠ ${fieldStr(row.delay)} (anomaly)`
                : fieldStr(row.delay);
        const delayEl = el("span", { class: cls }, delayLabel);
        if (isAnomaly || isNegative) {
            delayEl.setAttribute("aria-label", isNegative
                ? `Negative delay: ${fieldStr(row.delay)}`
                : `Anomalous delay: ${fieldStr(row.delay)}`);
        }
        header.appendChild(delayEl);
    }
    hop.appendChild(header);

    // Delay bar
    const pct = typeof row.percent.value === "number" ? row.percent.value : 0;
    if (pct > 0) {
        const barContainer = el("div", { class: "hl-hop__bar-container" });
        const barCls = delayMs > ANOMALY_THRESHOLD_MS ? "hl-delay-bar hl-delay-bar--anomaly" :
            delayMs < 0 ? "hl-delay-bar hl-delay-bar--negative" : "hl-delay-bar";
        const bar = el("div", { class: barCls, style: `width:${Math.min(pct, 100)}%` });
        barContainer.appendChild(bar);
        hop.appendChild(barContainer);
    }

    // Detail fields
    const fields = el("div", { class: "hl-hop__fields" });
    const details: [string, string][] = [
        ["Protocol", fieldStr(row.with)],
        ["Date", fieldStr(row.date)],
        ["ID", fieldStr(row.id)],
        ["For", fieldStr(row.for)],
        ["Via", fieldStr(row.via)],
    ];

    for (const [label, value] of details) {
        if (!value) continue;
        fields.appendChild(el("span", null, label));
        fields.appendChild(el("span", { class: "hl-hop__fields__value" }, value));
    }

    if (fields.childElementCount > 0) {
        hop.appendChild(fields);
    }

    return hop;
}

function fieldStr(field: { value: string | number | null }): string {
    if (field.value === null || field.value === "") return "";
    return String(field.value);
}
