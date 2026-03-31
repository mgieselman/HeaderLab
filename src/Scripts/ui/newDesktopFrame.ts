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
import "../../Content/themes/neon-grid.css";
import "../../Content/themes/fluent-refresh.css";
import "../../Content/themes/glassmorphism.css";
import "../../Content/themes/minimal-mono.css";
import "../../Content/themes/warm-earth.css";
import "../../Content/themes/aurora-nord.css";

import { mhaStrings } from "../mhaStrings";
import { Poster } from "../Poster";
import { TabNavigation } from "../TabNavigation";
import { DomUtils } from "./domUtils";
import { ThemeManager } from "./ThemeManager";
import { UnifiedRenderer } from "./UnifiedRenderer";

// Register Fluent UI Web Components
provideFluentDesignSystem().register(
    fluentAccordion(),
    fluentAccordionItem(),
    fluentBadge(),
    fluentButton(),
    fluentCard(),
    fluentProgress(),
    fluentProgressRing()
);

// This is the add-in iframe UI rendered in newDesktopFrame.html

const renderer = new UnifiedRenderer();
let overlayElement: HTMLElement | null = null;

function postError(error: unknown, message: string): void {
    Poster.postMessageToParent("LogError", { error: JSON.stringify(error), message: message });
}

function updateStatus(message: string): void {
    DomUtils.setText("#status-message", message);
    if (overlayElement) {
        overlayElement.style.display = "block";
    }
}

function hideStatus(): void {
    if (overlayElement) {
        overlayElement.style.display = "none";
    }
}

async function renderItem(headers: string): Promise<void> {
    hideStatus();
    renderer.clear();
    await renderer.render(headers);
}

function showError(error: unknown, message: string): void {
    console.error("Error:", error);
    renderer.showError(message);
}

function eventListener(event: MessageEvent): void {
    if (!event || event.origin !== Poster.site()) return;

    if (event.data) {
        switch (event.data.eventName) {
            case "showError":
                showError(JSON.parse(event.data.data.error), event.data.data.message);
                break;
            case "updateStatus":
                updateStatus(event.data.data);
                break;
            case "renderItem":
                renderItem(event.data.data);
                break;
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    try {
        ThemeManager.initialize(true);

        // Store overlay reference
        overlayElement = DomUtils.getElement("#loading-overlay");
        if (overlayElement) {
            overlayElement.addEventListener("click", function (e: Event): void {
                e.preventDefault();
                e.stopImmediatePropagation();
            });
        }

        // Initialize shared navigation and popover handlers
        UnifiedRenderer.initializeNav();

        // Focus summary button
        document.getElementById("summary-btn")?.focus();

        // Initialize iframe tab navigation
        TabNavigation.initializeIFrameTabHandling();

        updateStatus(mhaStrings.mhaLoading);
        window.addEventListener("message", eventListener, false);
        Poster.postMessageToParent("frameActive");
    }
    catch (e) {
        postError(e, "Failed initializing frame");
        showError(e, "Failed initializing frame");
    }
});
