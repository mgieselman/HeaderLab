/**
 * AppShell: top-level layout — header bar, optional input, tabs, results, status.
 */

import { createCopyMenu } from "./CopyMenu";
import { createHeaderInput } from "./HeaderInput";
import { renderResults } from "./ResultsView";
import { openSettingsDialog } from "./SettingsDialog";
import { renderStatusBar } from "./StatusBar";
import { renderTabNav } from "./TabNav";
import { buildTime } from "../../config/buildTime";
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

    // Skip-to-content link for keyboard users
    const skipLink = el("a", {
        href: "#hl-main-content",
        class: "hl-skip-link",
    }, "Skip to content");
    root.appendChild(skipLink);

    // Header bar
    const header = el("div", { class: "hl-header" });
    header.appendChild(el("span", { class: "hl-header__title" }, "HeaderLab"));

    if (mode === "addin") {
        header.appendChild(createCopyMenu(state, {
            buttonClass: "hl-btn hl-btn--small",
            getResultsPanel: () => root.querySelector(".hl-results") as HTMLElement | null,
        }));
    }

    const settingsBtn = el("button", {
        class: "hl-btn hl-btn--icon",
        "aria-label": "Settings",
        onclick: () => openSettingsDialog(state, settingsBtn as HTMLElement),
    }, "\u2699");
    header.appendChild(settingsBtn);

    root.appendChild(header);

    // Main content area
    const main = el("div", { id: "hl-main-content", class: "hl-main", tabindex: "-1" });

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
    const buildTimestamp = buildTime();
    const buildIso = (() => {
        try { return new Date(buildTimestamp).toISOString(); } catch { return buildTimestamp; }
    })();
    const buildInfoContainer = el("footer", { class: "hl-build-info", role: "contentinfo" });
    const timeEl = el("time", { datetime: buildIso });
    timeEl.textContent = `Built: ${formatBuildTimestamp(buildTimestamp)}`;
    buildInfoContainer.appendChild(timeEl);
    root.appendChild(buildInfoContainer);

    // Re-render on state changes
    state.subscribe(() => {
        renderTabNav(tabsContainer, state);
        renderResults(resultsContainer, state);
        renderStatusBar(statusContainer, state);
    });
}
