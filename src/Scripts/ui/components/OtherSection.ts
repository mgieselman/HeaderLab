/**
 * Other headers section: all headers not consumed by Summary/Received/Antispam.
 */

import { Other } from "../../table/Other";
import { clear, el } from "../rendering/dom";

export function renderOther(container: HTMLElement, other: Other): void {
    clear(container);
    if (!other.exists()) {
        container.appendChild(el("div", { class: "hl-empty" }, "No additional headers found."));
        return;
    }

    for (const row of other.rows) {
        container.appendChild(renderOtherRow(row));
    }
}

function renderOtherRow(row: { number: number; header: string; value: string; url: string }): HTMLElement {
    const card = el("div", { class: "hl-other-item" });

    // Header line: number and header name
    const header = el("div", { class: "hl-other-item__header" });
    header.appendChild(el("span", { class: "hl-other-item__number" }, `#${row.number}`));

    const headerSpan = el("span", { class: "hl-other-item__name" });
    if (row.url) {
        const link = el("a", {
            href: row.url,
            target: "_blank",
            rel: "noopener",
            "aria-label": `${row.header} - open RFC reference in new tab`,
            class: "hl-external-link",
        }, row.header);
        link.appendChild(el("span", { class: "hl-external-link__icon", "aria-hidden": "true" }, " \u29C9"));
        headerSpan.appendChild(link);
    } else {
        headerSpan.textContent = row.header;
    }
    header.appendChild(headerSpan);
    card.appendChild(header);

    // Value
    if (row.value) {
        card.appendChild(el("div", { class: "hl-other-item__value" }, row.value));
    }

    return card;
}
