/**
 * Status bar at the bottom of the app — shows toasts and status messages.
 */

import { Strings } from "../../core/Strings";
import { clear, el } from "../rendering/dom";
import { AppState } from "../state/AppState";

export function renderStatusBar(container: HTMLElement, state: AppState): void {
    clear(container);
    container.setAttribute("aria-live", "polite");
    container.setAttribute("role", "status");

    if (state.loading) {
        container.appendChild(
            el("span", { class: "hl-loading" },
                el("span", { class: "hl-loading__spinner", "aria-hidden": "true" }),
                "Loading..."
            )
        );
        return;
    }

    if (state.error) {
        const errorText = state.error;
        const copyBtn = el("button", {
            class: "hl-error-card__copy",
            "aria-label": "Copy error message",
            title: "Copy error message",
            onclick: async () => {
                try {
                    await Strings.copyToClipboard(errorText);
                    copyBtn.textContent = "Copied";
                    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
                } catch {
                    copyBtn.textContent = "Copy failed";
                    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
                }
            },
        }, "Copy");

        const card = el("div", { class: "hl-error-card" },
            el("span", { class: "hl-error-card__message" }, errorText),
            copyBtn,
            el("button", {
                class: "hl-error-card__dismiss",
                "aria-label": "Dismiss error",
                onclick: () => { state.setError(""); },
            }, "×")
        );
        container.appendChild(card);
        return;
    }

    if (state.status) {
        container.appendChild(el("span", null, state.status));
    }
}
