/**
 * Other headers section: all headers not consumed by Summary/Received/Antispam.
 */

import { Other } from "../../table/Other";
import { clear, el } from "../rendering/dom";

export function renderOther(container: HTMLElement, other: Other): void {
    clear(container);
    if (!other.exists()) {
        container.appendChild(el("div", { class: "hl-empty" }, "No other headers found."));
        return;
    }

    const table = el("table", { class: "hl-table" });
    const thead = el("thead");
    thead.appendChild(el("tr", null,
        el("th", null, "#"),
        el("th", null, "Header"),
        el("th", null, "Value")
    ));
    table.appendChild(thead);

    const tbody = el("tbody");
    for (const row of other.rows) {
        const tr = el("tr");
        tr.appendChild(el("td", null, String(row.number)));

        const headerTd = el("td");
        if (row.url) {
            headerTd.appendChild(el("a", { href: row.url, target: "_blank", rel: "noopener" }, row.header));
        } else {
            headerTd.textContent = row.header;
        }
        tr.appendChild(headerTd);

        tr.appendChild(el("td", null, row.value));
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    container.appendChild(table);
}
