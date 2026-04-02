/**
 * Settings dialog: theme picker, telemetry toggle, privacy link.
 */

import { diagnostics } from "../../services/Diagnostics";
import { el } from "../rendering/dom";
import { AppState } from "../state/AppState";
import { ThemeMode } from "../state/ThemeManager";

export function openSettingsDialog(state: AppState): void {
    const overlay = el("div", {
        class: "hl-dialog-overlay",
        onclick: (e: Event) => { if (e.target === overlay) close(); },
    });

    const dialog = el("div", {
        class: "hl-dialog",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Settings",
    });

    function close(): void {
        overlay.remove();
    }

    // Header
    const header = el("div", { class: "hl-dialog__header" },
        el("span", { class: "hl-dialog__title" }, "Settings"),
        el("button", {
            class: "hl-dialog__close",
            "aria-label": "Close settings",
            onclick: close,
        }, "\u00D7")
    );
    dialog.appendChild(header);

    // Theme
    const themeField = el("div", { class: "hl-field" });
    themeField.appendChild(el("span", { class: "hl-field__label" }, "Color mode"));

    const radioGroup = el("div", { class: "hl-radio-group" });
    const modes: ThemeMode[] = ["light", "dark", "system"];
    for (const mode of modes) {
        const label = el("label");
        const radio = el("input", {
            type: "radio",
            name: "theme",
            value: mode,
        }) as HTMLInputElement;
        if (state.theme.getMode() === mode) radio.checked = true;
        radio.addEventListener("change", () => state.theme.setMode(mode));
        label.appendChild(radio);
        label.appendChild(document.createTextNode(mode.charAt(0).toUpperCase() + mode.slice(1)));
        radioGroup.appendChild(label);
    }
    themeField.appendChild(radioGroup);
    dialog.appendChild(themeField);

    // Telemetry toggle
    const telemetryField = el("div", { class: "hl-field" });
    const telemetryLabel = el("label", { class: "hl-toggle" });
    const checkbox = el("input", { type: "checkbox" }) as HTMLInputElement;
    checkbox.checked = diagnostics.canSendTelemetry();
    checkbox.addEventListener("change", () => {
        diagnostics.setSendTelemetry(checkbox.checked);
    });
    telemetryLabel.appendChild(checkbox);
    telemetryLabel.appendChild(document.createTextNode("Send anonymous telemetry"));
    telemetryField.appendChild(telemetryLabel);
    dialog.appendChild(telemetryField);

    // Privacy link
    dialog.appendChild(el("div", { class: "hl-field" },
        el("a", { href: "privacy.html", target: "_blank", rel: "noopener" }, "Privacy Policy")
    ));

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus trap
    const closeBtn = dialog.querySelector(".hl-dialog__close") as HTMLElement;
    closeBtn?.focus();

    overlay.addEventListener("keydown", (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === "Escape") {
            close();
            return;
        }
        if (ke.key === "Tab") {
            const focusable = dialog.querySelectorAll<HTMLElement>(
                "button, input, a[href], [tabindex]:not([tabindex=\"-1\"])"
            );
            if (focusable.length === 0) return;
            const first = focusable[0]!;
            const last = focusable[focusable.length - 1]!;
            if (ke.shiftKey && document.activeElement === first) {
                ke.preventDefault();
                last.focus();
            } else if (!ke.shiftKey && document.activeElement === last) {
                ke.preventDefault();
                first.focus();
            }
        }
    });
}
