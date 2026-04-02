/**
 * AppShell: top-level layout — header bar, optional input, tabs, results, status.
 */

import { createHeaderInput } from "./HeaderInput";
import { renderResults } from "./ResultsView";
import { openSettingsDialog } from "./SettingsDialog";
import { renderStatusBar } from "./StatusBar";
import { renderTabNav } from "./TabNav";
import { buildTime } from "../../config/buildTime";
import { statusLabels } from "../../core/labels";
import { Strings } from "../../core/Strings";
import { buildAnalysisJson, buildAnalystReport } from "../analysisExport";
import { clear, el } from "../rendering/dom";
import { AppState } from "../state/AppState";

export type AppMode = "standalone" | "addin";

function formatBuildTimestamp(timestamp: string): string {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return timestamp;
    }

    return `${parsed.toLocaleString()} (${parsed.toISOString()})`;
}

export function createAppShell(root: HTMLElement, state: AppState, mode: AppMode): void {
    clear(root);

    // Header bar
    const header = el("div", { class: "hl-header" });
    header.appendChild(el("span", { class: "hl-header__title" }, "HeaderLab"));

    if (mode === "addin") {
        // Compact buttons for add-in
        header.appendChild(el("button", {
            class: "hl-btn hl-btn--small",
            onclick: async () => {
                const resultsPanel = root.querySelector(".hl-results") as HTMLElement | null;
                const text = resultsPanel?.innerText?.trim();
                if (!text) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(text);
                state.setStatus(statusLabels.copied);
            },
        }, "Copy"));

        header.appendChild(el("button", {
            class: "hl-btn hl-btn--small",
            onclick: async () => {
                const model = state.headerModel;
                if (!model || !model.hasData) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(buildAnalysisJson(model));
                state.setStatus("JSON copied to clipboard!");
            },
        }, "Copy JSON"));

        header.appendChild(el("button", {
            class: "hl-btn hl-btn--small",
            onclick: async () => {
                const model = state.headerModel;
                if (!model || !model.hasData) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(buildAnalystReport(model));
                state.setStatus("Report copied to clipboard!");
            },
        }, "Copy Report"));
    }

    header.appendChild(el("button", {
        class: "hl-btn hl-btn--icon",
        "aria-label": "Settings",
        onclick: () => openSettingsDialog(state),
    }, "\u2699"));

    root.appendChild(header);

    // Main content area
    const main = el("div", { class: "hl-main" });

    // Input area (standalone only)
    if (mode === "standalone") {
        main.appendChild(createHeaderInput(state));
    }

    // Tab navigation
    const tabsContainer = el("div", { class: "hl-tabs" });
    main.appendChild(tabsContainer);

    // Results area
    const resultsContainer = el("div", { class: "hl-results" });
    main.appendChild(resultsContainer);

    root.appendChild(main);

    // Status bar
    const statusContainer = el("div", { class: "hl-status" });
    root.appendChild(statusContainer);

    // Build/deployment timestamp
    const buildTimestamp = formatBuildTimestamp(buildTime());
    const buildInfoContainer = el("div", { class: "hl-build-info" }, `Built: ${buildTimestamp}`);
    root.appendChild(buildInfoContainer);

    // Re-render on state changes
    state.subscribe(() => {
        renderTabNav(tabsContainer, state);
        renderResults(resultsContainer, state);
        renderStatusBar(statusContainer, state);
    });
}
