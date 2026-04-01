/**
 * Header input: textarea + Analyze/Clear/Copy/Sample buttons.
 */

import { statusLabels } from "../../core/labels";
import { Strings } from "../../core/Strings";
import { HeaderModel } from "../../model/HeaderModel";
import { el } from "../rendering/dom";
import { sampleHeaders } from "../sampleData";
import { AppState } from "../state/AppState";

export function createHeaderInput(state: AppState): HTMLElement {
    const section = el("div", { class: "hl-input" });

    const textarea = el("textarea", {
        class: "hl-input__textarea hl-mono",
        placeholder: statusLabels.prompt,
        "aria-label": "Email headers",
        rows: "8",
    }) as HTMLTextAreaElement;

    const analyzeBtn = el("button", {
        class: "hl-btn hl-btn--primary",
        disabled: true,
        onclick: async () => {
            const text = textarea.value.trim();
            if (!text) return;
            state.setLoading(true);
            state.setStatus("");
            try {
                const model = await HeaderModel.create(text);
                state.setModel(model);
                state.setStatus(statusLabels.analyzed);
            } catch (e) {
                state.setError("Failed to analyze headers: " + (e instanceof Error ? e.message : String(e)));
            } finally {
                state.setLoading(false);
            }
        },
    }, "Analyze");

    const clearBtn = el("button", {
        class: "hl-btn",
        onclick: () => {
            textarea.value = "";
            (analyzeBtn as HTMLButtonElement).disabled = true;
            state.clear();
            state.setStatus(statusLabels.cleared);
            textarea.focus();
        },
    }, "Clear");

    const copyBtn = el("button", {
        class: "hl-btn",
        onclick: async () => {
            const model = state.headerModel;
            if (!model || !model.hasData) {
                state.setStatus(statusLabels.nothingToCopy);
                return;
            }
            await Strings.copyToClipboard(model.toString());
            state.setStatus(statusLabels.copied);
        },
    }, "Copy");

    const sampleBtn = el("button", {
        class: "hl-btn hl-btn--small",
        onclick: () => {
            textarea.value = sampleHeaders;
            (analyzeBtn as HTMLButtonElement).disabled = false;
            textarea.focus();
        },
    }, "Load sample");

    textarea.addEventListener("input", () => {
        (analyzeBtn as HTMLButtonElement).disabled = !textarea.value.trim();
    });

    const actions = el("div", { class: "hl-input__actions" }, analyzeBtn, clearBtn, copyBtn, sampleBtn);

    section.appendChild(textarea);
    section.appendChild(actions);

    // Auto-focus
    requestAnimationFrame(() => textarea.focus());

    return section;
}
