/**
 * Status bar at the bottom of the app — shows toasts and status messages.
 */

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
        const card = el("div", { class: "hl-error-card" },
            el("span", { class: "hl-error-card__message" }, state.error),
            el("button", {
                class: "hl-error-card__dismiss",
                "aria-label": "Dismiss error",
                onclick: () => { state.setError(""); },
            }, "\u00D7")
        );
        container.appendChild(card);
        return;
    }

    if (state.status) {
        container.appendChild(el("span", null, state.status));
    }
}
