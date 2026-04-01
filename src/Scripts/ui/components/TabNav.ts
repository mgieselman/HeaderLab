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
    hasViolations: boolean;
}

export function getTabDefs(model: HeaderModel): TabDef[] {
    const hasViolations = model.violationGroups.length > 0;

    const tabs: TabDef[] = [
        { id: "summary", label: "Summary", exists: model.summary.exists(), hasViolations: false },
        { id: "routing", label: "Routing", exists: model.receivedHeaders.exists(), hasViolations: false },
        { id: "security", label: "Security", exists: model.forefrontAntiSpamReport.exists() || model.antiSpamReport.exists(), hasViolations: false },
        { id: "other", label: "Other", exists: model.otherHeaders.exists(), hasViolations: false },
        { id: "diagnostics", label: "Diagnostics", exists: hasViolations, hasViolations: hasViolations },
        { id: "original", label: "Original", exists: !!model.originalHeaders, hasViolations: false },
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
        if (tab.hasViolations) cls += " hl-tabs__tab--has-violations";

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
