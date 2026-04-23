/**
 * Security & Antispam section: filtered insight list at top, flat subsections
 * for classification and origin/transport, plus a collapsed raw dump.
 *
 * Per-row severity is painted on the owning kv row via Insight anchors.
 */

import { antispamLabels } from "../../core/labels";
import { HeaderModel } from "../../model/HeaderModel";
import { AntiSpamReport } from "../../row/AntiSpamReport";
import { ForefrontAntiSpamReport } from "../../row/ForefrontAntiSpamReport";
import { Row, getRowValue } from "../../row/Row";
import { Insight, InsightSection, InsightSeverity } from "../insights/Insight";
import { generateInsights } from "../insights/InsightEngine";
import { renderInsightList } from "../insights/InsightList";
import { clear, el } from "../rendering/dom";

const SECURITY_CATEGORIES = new Set<Insight["category"]>(["auth", "spam", "security"]);

/** Tier 2 classification keys in display order */
const CLASSIFICATION_FOREFRONT_KEYS = ["SFV", "CAT", "SCL", "PCL", "SFTY"];
const CLASSIFICATION_ANTISPAM_KEYS = ["BCL", "PCL"];

/** Tier 3 origin/transport keys in display order (suppressed when DIR=INT) */
const ORIGIN_FOREFRONT_KEYS = ["CIP", "PTR", "H", "CTRY", "LANG", "IPV", "DIR", "ARC"];

/** Debug rows excluded from primary tiers (kept in Tier 5 raw dump) */
const DEBUG_HEADERS = new Set(["source", "unparsed"]);

interface RenderedRow {
    label: string;
    value: string;
    detail?: string | undefined;
    severity?: InsightSeverity | undefined;
}

export function renderSecurity(container: HTMLElement, model: HeaderModel): void {
    clear(container);

    const forefront = model.forefrontAntiSpamReport;
    const antispam = model.antiSpamReport;

    if (!forefront.exists() && !antispam.exists()) {
        container.appendChild(el("div", { class: "hl-empty" }, "No antispam headers found."));
        return;
    }

    const insights = generateInsights(model);

    const securityInsights = insights.filter((i) => SECURITY_CATEGORIES.has(i.category));
    if (securityInsights.length > 0) {
        container.appendChild(renderInsightList(securityInsights));
    }

    const anchorMap = new Map<string, Insight>();
    for (const insight of insights) {
        if (insight.anchor) {
            anchorMap.set(anchorKey(insight.anchor.section, insight.anchor.rowKey), insight);
        }
    }

    const classificationRows = dedupeByLabel([
        ...buildRowGroup(forefront.rows, CLASSIFICATION_FOREFRONT_KEYS, "forefront", anchorMap),
        ...buildRowGroup(antispam.rows, CLASSIFICATION_ANTISPAM_KEYS, "antispam", anchorMap),
    ]);
    if (classificationRows.length > 0) {
        container.appendChild(renderSubsection("Classification", classificationRows));
    }

    const dir = getRowValue(forefront.rows, "DIR").toUpperCase();
    const isIntraOrg = dir === "INT" || dir === "INTRA-ORG";
    if (!isIntraOrg) {
        const originRows = buildRowGroup(forefront.rows, ORIGIN_FOREFRONT_KEYS, "forefront", anchorMap);
        if (originRows.length > 0) {
            container.appendChild(renderSubsection("Origin & transport", originRows));
        }
    }

    container.appendChild(renderRawDump(forefront, antispam));
}

function anchorKey(section: InsightSection, rowKey: string): string {
    return `${section}:${rowKey.toUpperCase()}`;
}

function buildRowGroup(
    rows: Row[],
    orderedKeys: string[],
    section: InsightSection,
    anchorMap: Map<string, Insight>
): RenderedRow[] {
    const byKey = new Map<string, Row>();
    for (const row of rows) {
        byKey.set(row.header.toUpperCase(), row);
    }

    const result: RenderedRow[] = [];
    for (const key of orderedKeys) {
        const row = byKey.get(key.toUpperCase());
        if (!row || !row.value || DEBUG_HEADERS.has(row.header)) continue;

        const insight = anchorMap.get(anchorKey(section, row.header));
        result.push({
            label: row.label,
            value: row.value,
            detail: insight?.detail,
            severity: insight?.severity,
        });
    }
    return result;
}

function dedupeByLabel(rows: RenderedRow[]): RenderedRow[] {
    const seen = new Set<string>();
    const result: RenderedRow[] = [];
    for (const row of rows) {
        if (seen.has(row.label)) continue;
        seen.add(row.label);
        result.push(row);
    }
    return result;
}

function renderSubsection(title: string, rows: RenderedRow[]): HTMLElement {
    const block = el("div", { class: "hl-subsection hl-subsection--card" });
    block.appendChild(el("div", { class: "hl-subsection__title" }, title));
    const body = el("div", { class: "hl-subsection__rows" });
    for (const row of rows) {
        body.appendChild(renderKvRow(row));
    }
    block.appendChild(body);
    return block;
}

function renderKvRow(row: RenderedRow): HTMLElement {
    const className = row.severity ? `hl-kv-row hl-kv-row--${row.severity}` : "hl-kv-row";
    const rowEl = el("div", { class: className });
    rowEl.appendChild(el("span", { class: "hl-kv__key" }, row.label));
    const valEl = el("span", { class: "hl-kv__value" });
    valEl.textContent = row.value;
    if (row.detail) {
        valEl.appendChild(el("span", { class: "hl-kv__detail" }, ` — ${row.detail}`));
    }
    rowEl.appendChild(valEl);
    return rowEl;
}

function renderRawDump(forefront: ForefrontAntiSpamReport, antispam: AntiSpamReport): HTMLElement {
    const details = el("details", { class: "hl-details" });
    details.appendChild(el("summary", null, "Raw antispam fields"));
    const content = el("div", { class: "hl-details__content" });

    if (forefront.exists()) {
        content.appendChild(renderRawGroup(antispamLabels.forefrontAntiSpamReport, forefront.rows));
    }
    if (antispam.exists()) {
        content.appendChild(renderRawGroup(antispamLabels.antiSpamReport, antispam.rows));
    }

    details.appendChild(content);
    return details;
}

function renderRawGroup(title: string, rows: Row[]): HTMLElement {
    const block = el("div", { class: "hl-subsection" });
    block.appendChild(el("div", { class: "hl-subsection__title" }, title));
    const grid = el("div", { class: "hl-kv" });
    for (const row of rows) {
        if (!row.value) continue;
        grid.appendChild(el("span", { class: "hl-kv__key" }, row.label));
        const valEl = el("span", { class: "hl-kv__value" });
        valEl.textContent = row.value;
        grid.appendChild(valEl);
    }
    block.appendChild(grid);
    return block;
}
