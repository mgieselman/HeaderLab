/**
 * Results view: renders the active section based on the current tab.
 */

import { renderDiagnostics } from "./DiagnosticsSection";
import { renderOriginal } from "./OriginalSection";
import { renderOther } from "./OtherSection";
import { renderRouting } from "./RoutingSection";
import { renderSecurity } from "./SecuritySection";
import { renderSummary } from "./SummarySection";
import { clear, el } from "../rendering/dom";
import { AppState } from "../state/AppState";

export function renderResults(container: HTMLElement, state: AppState): void {
    clear(container);
    const model = state.headerModel;
    if (!model || !model.hasData) return;

    container.setAttribute("role", "tabpanel");
    container.setAttribute("id", `panel-${state.activeTab}`);

    switch (state.activeTab) {
        case "summary":
            renderSummary(container, model);
            break;
        case "routing":
            renderRouting(container, model.receivedHeaders);
            break;
        case "security":
            renderSecurity(container, model);
            break;
        case "other":
            renderOther(container, model.otherHeaders);
            break;
        case "diagnostics":
            renderDiagnostics(container, model.violationGroups);
            break;
        case "original":
            renderOriginal(container, model.originalHeaders);
            break;
        default:
            container.appendChild(el("div", { class: "hl-empty" }, "Unknown section."));
    }
}
