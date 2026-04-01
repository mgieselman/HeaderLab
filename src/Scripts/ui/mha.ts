import {
    fluentAccordion,
    fluentAccordionItem,
    fluentBadge,
    fluentButton,
    fluentCard,
    fluentProgress,
    fluentProgressRing,
    provideFluentDesignSystem
} from "@fluentui/web-components";
import "../../Content/fluentCommon.css";
import "../../Content/newDesktopFrame.css";
import "../../Content/standalone.css";
import "../../Content/themes/fluent-refresh.css";
import "../../Content/themes/neon-grid.css";

import { buildTime } from "../buildTime";
import { diagnostics } from "../Diag";
import { mhaStrings } from "../mhaStrings";
import { Strings } from "../Strings";
import { MhaResults } from "./components/MhaResults"; // Registers <mha-results> custom element
import { DomUtils } from "./domUtils";
import { ModeName, ThemeManager, ThemeName } from "./ThemeManager";

// Register Fluent UI Web Components
provideFluentDesignSystem().register(
    fluentButton(),
    fluentProgress(),
    fluentProgressRing(),
    fluentAccordion(),
    fluentAccordionItem(),
    fluentBadge(),
    fluentCard()
);

function getResults(): MhaResults | null {
    const el = document.querySelector("mha-results");
    return el instanceof MhaResults ? el : null;
}

function showStatusMessage(message: string): void {
    const el = document.getElementById("statusMessage");
    if (el) {
        el.textContent = message;
        el.classList.add("show");
        setTimeout(() => {
            el.classList.remove("show");
            el.textContent = "";
        }, 2000);
    }
}

async function analyze(): Promise<void> {
    const inputElement = document.getElementById("inputHeaders") as HTMLTextAreaElement;
    const headers = inputElement?.value?.trim();

    if (!headers) {
        showStatusMessage(mhaStrings.mhaPrompt);
        return;
    }

    const results = getResults();
    if (results) {
        results.clear();
        results.hidden = false;
        await results.analyze(headers);
    }

    // Show clear/copy buttons
    DomUtils.showElement("#clearButton");
    DomUtils.showElement("#copyButton");

    showStatusMessage("Headers analyzed");
}

function clear(): void {
    const inputElement = document.getElementById("inputHeaders") as HTMLTextAreaElement;
    if (inputElement) inputElement.value = "";

    const results = getResults();
    if (results) {
        results.clear();
        results.hidden = true;
    }
    DomUtils.hideElement("#clearButton");
    DomUtils.hideElement("#copyButton");

    inputElement?.focus();
}

function copy(): void {
    Strings.copyToClipboard(getResults()?.getModelString() ?? "");
    showStatusMessage(mhaStrings.mhaCopied);
}

document.addEventListener("DOMContentLoaded", function() {
    ThemeManager.initialize();
    diagnostics.set("API used", "standalone");

    // Show build timestamp
    const buildInfo = document.getElementById("buildInfo");
    if (buildInfo) buildInfo.textContent = "Built: " + buildTime();

    // Wire up buttons
    document.getElementById("analyzeButton")?.addEventListener("click", analyze);
    document.getElementById("clearButton")?.addEventListener("click", clear);
    document.getElementById("copyButton")?.addEventListener("click", copy);

    // Theme toggle: cycle through all themes
    const allThemes: ThemeName[] = ["default", "fluent-refresh", "neon-grid"];
    const themeDisplayNames = ["Default", "Fluent", "Neon"];
    const themeLabel = document.getElementById("themeLabel");
    const themeToggleBtn = document.getElementById("themeToggleBtn");

    function updateThemeLabel(): void {
        if (!themeLabel) return;
        const idx = allThemes.indexOf(ThemeManager.theme);
        themeLabel.textContent = (idx >= 0 ? themeDisplayNames[idx] : "Theme") ?? "Theme";
    }

    themeToggleBtn?.addEventListener("click", () => {
        const idx = allThemes.indexOf(ThemeManager.theme);
        const next = allThemes[(idx + 1) % allThemes.length] as ThemeName;
        ThemeManager.setTheme(next);
        updateThemeLabel();
    });
    updateThemeLabel();

    // Dark mode toggle: cycle light -> dark -> system
    const darkModeToggleBtn = document.getElementById("darkModeToggleBtn");
    const darkModeIcon = document.getElementById("darkModeIcon");
    function updateDarkModeIcon(): void {
        if (!darkModeIcon) return;
        switch (ThemeManager.mode) {
            case "dark": darkModeIcon.textContent = "Dark"; break;
            case "light": darkModeIcon.textContent = "Light"; break;
            case "system": darkModeIcon.textContent = "Auto"; break;
        }
    }
    darkModeToggleBtn?.addEventListener("click", () => {
        const modes: Array<ModeName> = ["light", "dark", "system"];
        const idx = modes.indexOf(ThemeManager.mode);
        const nextMode = modes[(idx + 1) % modes.length] as ModeName;
        ThemeManager.setMode(nextMode);
        updateDarkModeIcon();
    });
    updateDarkModeIcon();
});
