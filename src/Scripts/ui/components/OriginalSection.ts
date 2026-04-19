/**
 * Original headers section: collapsible raw view.
 */

import { Strings } from "../../core/Strings";
import { clear, el } from "../rendering/dom";

export function renderOriginal(container: HTMLElement, originalHeaders: string): void {
    clear(container);
    if (!originalHeaders) {
        container.appendChild(el("div", { class: "hl-empty" }, "No original headers available."));
        return;
    }

    const details = el("details", { class: "hl-details", open: true });

    const summaryRow = el("div", { class: "hl-details__summary-row" });
    summaryRow.appendChild(el("summary", null, "Raw headers"));

    const copyBtn = el("button", {
        class: "hl-btn hl-btn--small",
        "aria-label": "Copy raw headers to clipboard",
        onclick: async (e: Event) => {
            e.stopPropagation(); // prevent <details> toggle
            await Strings.copyToClipboard(originalHeaders);
            const btn = e.target as HTMLButtonElement;
            const original = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = original; }, 2000);
        },
    }, "Copy");
    summaryRow.appendChild(copyBtn);
    details.appendChild(summaryRow);

    const content = el("div", { class: "hl-details__content" });
    const pre = el("pre", { class: "hl-mono" }, originalHeaders);
    pre.style.margin = "0";
    pre.style.maxHeight = "400px";
    pre.style.overflow = "auto";
    content.appendChild(pre);

    details.appendChild(content);
    container.appendChild(details);
}
