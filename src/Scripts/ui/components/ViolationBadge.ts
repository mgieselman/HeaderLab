/**
 * Small severity badge for violations.
 */

import { el } from "../rendering/dom";

export function violationBadge(severity: "error" | "warning" | "info"): HTMLSpanElement {
    const labelMap = { error: "Error", warning: "Warning", info: "Info" };
    return el("span", { class: `hl-badge hl-badge--${severity}`, role: "img", "aria-label": labelMap[severity] }, labelMap[severity]);
}
