/**
 * Tab navigation: shows sections that have data, hides empty ones.
 */

import { HeaderModel } from "../../model/HeaderModel";
import { clear, el } from "../rendering/dom";
import { AppState } from "../state/AppState";

export interface TabDef {
    id: string;
    label: string;
    exists: boolean;
    violationSeverity: "error" | "warning" | "info" | null;
}

export function getTabDefs(model: HeaderModel): TabDef[] {
    const groups = model.violationGroups;
    let severity: "error" | "warning" | "info" | null = null;
    if (groups.length > 0) {
        if (groups.some(g => g.severity === "error")) severity = "error";
        else if (groups.some(g => g.severity === "warning")) severity = "warning";
        else severity = "info";
    }

    const tabs: TabDef[] = [
        { id: "summary", label: "Summary", exists: model.summary.exists(), violationSeverity: null },
        { id: "routing", label: "Routing", exists: model.receivedHeaders.exists(), violationSeverity: null },
        { id: "security", label: "Security", exists: model.forefrontAntiSpamReport.exists() || model.antiSpamReport.exists(), violationSeverity: null },
        { id: "other", label: "Other", exists: model.otherHeaders.exists(), violationSeverity: null },
        { id: "diagnostics", label: "Diagnostics", exists: severity !== null, violationSeverity: severity },
        { id: "original", label: "Source", exists: !!model.originalHeaders, violationSeverity: null },
    ];

    return tabs.filter(t => t.exists);
}

export function renderTabNav(container: HTMLElement, state: AppState): void {
    clear(container);
    const model = state.headerModel;
    if (!model || !model.hasData) return;

    const tabs = getTabDefs(model);
    container.setAttribute("role", "tablist");

    for (const tab of tabs) {
        const isActive = state.activeTab === tab.id;
        let cls = "hl-tabs__tab";
        if (isActive) cls += " hl-tabs__tab--active";
        if (tab.violationSeverity) cls += ` hl-tabs__tab--${tab.violationSeverity}`;

        const btn = el("button", {
            class: cls,
            role: "tab",
            "aria-selected": String(isActive),
            "aria-controls": `panel-${tab.id}`,
            onclick: () => state.setActiveTab(tab.id),
        }, tab.label);

        container.appendChild(btn);
    }
}
