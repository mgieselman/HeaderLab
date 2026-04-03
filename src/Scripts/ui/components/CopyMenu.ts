/**
 * Copy dropdown menu: single button that opens a menu with copy options.
 */

import { statusLabels } from "../../core/labels";
import { Strings } from "../../core/Strings";
import { buildAnalysisJson, buildAnalystReport } from "../analysisExport";
import { el } from "../rendering/dom";
import { AppState } from "../state/AppState";

interface CopyMenuOptions {
    /** CSS class for the trigger button */
    buttonClass: string;
    /** Function to get the results panel element for plain-text copy */
    getResultsPanel: () => HTMLElement | null;
}

export function createCopyMenu(state: AppState, options: CopyMenuOptions): HTMLElement {
    const wrapper = el("div", { class: "hl-copy-menu" });

    const trigger = el("button", {
        class: options.buttonClass,
        "aria-haspopup": "true",
        "aria-expanded": "false",
        onclick: (e: Event) => {
            e.stopPropagation();
            const open = wrapper.classList.toggle("hl-copy-menu--open");
            trigger.setAttribute("aria-expanded", String(open));
        },
    }, "Copy \u25BE");

    const menu = el("div", {
        class: "hl-copy-menu__dropdown",
        role: "menu",
    });

    const items: { label: string; description: string; action: () => Promise<void> }[] = [
        {
            label: "Copy View",
            description: "Text from current tab",
            action: async () => {
                const panel = options.getResultsPanel();
                const text = panel?.innerText?.trim();
                if (!text) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(text);
                state.setStatus(statusLabels.copied);
            },
        },
        {
            label: "Copy JSON",
            description: "Structured analysis data",
            action: async () => {
                const model = state.headerModel;
                if (!model || !model.hasData) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(buildAnalysisJson(model));
                state.setStatus("JSON copied to clipboard!");
            },
        },
        {
            label: "Copy Report",
            description: "Formatted analyst report",
            action: async () => {
                const model = state.headerModel;
                if (!model || !model.hasData) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(buildAnalystReport(model));
                state.setStatus("Report copied to clipboard!");
            },
        },
    ];

    for (const item of items) {
        const btn = el("button", {
            class: "hl-copy-menu__item",
            role: "menuitem",
            onclick: async () => {
                close();
                await item.action();
            },
        },
        el("span", { class: "hl-copy-menu__item-label" }, item.label),
        el("span", { class: "hl-copy-menu__item-desc" }, item.description),
        );
        menu.appendChild(btn);
    }

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    function close() {
        wrapper.classList.remove("hl-copy-menu--open");
        trigger.setAttribute("aria-expanded", "false");
    }

    // Close on outside click
    document.addEventListener("click", () => close());

    // Close on Escape
    wrapper.addEventListener("keydown", (e: Event) => {
        if ((e as KeyboardEvent).key === "Escape") {
            close();
            trigger.focus();
        }
    });

    return wrapper;
}
