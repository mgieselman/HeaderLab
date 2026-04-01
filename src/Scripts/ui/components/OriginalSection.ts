/**
 * Original headers section: collapsible raw view.
 */

import { clear, el } from "../rendering/dom";

export function renderOriginal(container: HTMLElement, originalHeaders: string): void {
    clear(container);
    if (!originalHeaders) {
        container.appendChild(el("div", { class: "hl-empty" }, "No original headers available."));
        return;
    }

    const details = el("details", { class: "hl-details", open: true });
    details.appendChild(el("summary", null, "Raw headers"));

    const content = el("div", { class: "hl-details__content" });
    const pre = el("pre", { class: "hl-mono" }, originalHeaders);
    pre.style.margin = "0";
    pre.style.maxHeight = "400px";
    pre.style.overflow = "auto";
    content.appendChild(pre);

    details.appendChild(content);
    container.appendChild(details);
}
