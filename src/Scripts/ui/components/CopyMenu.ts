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
    let outsideClickListener: ((e: Event) => void) | null = null;

    function getMenuItems(): HTMLButtonElement[] {
        return Array.from(menu.querySelectorAll<HTMLButtonElement>(".hl-copy-menu__item"));
    }

    function open() {
        wrapper.classList.add("hl-copy-menu--open");
        trigger.setAttribute("aria-expanded", "true");
        outsideClickListener = () => close();
        document.addEventListener("click", outsideClickListener);
        // Move focus to the first menu item
        requestAnimationFrame(() => {
            const items = getMenuItems();
            if (items.length > 0) items[0]!.focus();
        });
    }

    function close() {
        wrapper.classList.remove("hl-copy-menu--open");
        trigger.setAttribute("aria-expanded", "false");
        if (outsideClickListener) {
            document.removeEventListener("click", outsideClickListener);
            outsideClickListener = null;
        }
    }

    const trigger = el("button", {
        class: options.buttonClass,
        "aria-haspopup": "true",
        "aria-expanded": "false",
        onclick: (e: Event) => {
            e.stopPropagation();
            if (wrapper.classList.contains("hl-copy-menu--open")) {
                close();
            } else {
                open();
            }
        },
    }, "Copy \u25BE");

    const menu = el("div", {
        class: "hl-copy-menu__dropdown",
        role: "menu",
    });

    const items: { label: string; action: () => Promise<void> }[] = [
        {
            label: "Copy View",
            action: async () => {
                const panel = options.getResultsPanel();
                const text = panel?.innerText?.trim();
                if (!text) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(text);
                state.setStatus(statusLabels.copied);
                setTimeout(() => state.setStatus(""), 3000);
            },
        },
        {
            label: "Copy JSON",
            action: async () => {
                const model = state.headerModel;
                if (!model || !model.hasData) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(buildAnalysisJson(model));
                state.setStatus(statusLabels.copied);
                setTimeout(() => state.setStatus(""), 3000);
            },
        },
        {
            label: "Copy Report",
            action: async () => {
                const model = state.headerModel;
                if (!model || !model.hasData) {
                    state.setStatus(statusLabels.nothingToCopy);
                    return;
                }
                await Strings.copyToClipboard(buildAnalystReport(model));
                state.setStatus(statusLabels.copied);
                setTimeout(() => state.setStatus(""), 3000);
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
        }, item.label);
        menu.appendChild(btn);
    }

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    // Keyboard navigation within the menu
    menu.addEventListener("keydown", (e: Event) => {
        const ke = e as KeyboardEvent;
        const items = getMenuItems();
        const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

        if (ke.key === "ArrowDown") {
            ke.preventDefault();
            const next = items[(currentIndex + 1) % items.length];
            next?.focus();
        } else if (ke.key === "ArrowUp") {
            ke.preventDefault();
            const prev = items[(currentIndex - 1 + items.length) % items.length];
            prev?.focus();
        } else if (ke.key === "Home") {
            ke.preventDefault();
            items[0]?.focus();
        } else if (ke.key === "End") {
            ke.preventDefault();
            items[items.length - 1]?.focus();
        }
    });

    // Close on Escape
    wrapper.addEventListener("keydown", (e: Event) => {
        if ((e as KeyboardEvent).key === "Escape") {
            close();
            trigger.focus();
        }
    });

    return wrapper;
}
