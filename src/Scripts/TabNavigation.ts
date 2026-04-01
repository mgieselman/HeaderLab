// Fluent UI Web Components interfaces for tab navigation
interface FluentRadioGroup extends HTMLElement {
    value: string;
}

const focusableSelector =
    "a, button, input, textarea, select, [tabindex], " +
    "fluent-button, fluent-checkbox, fluent-radio, fluent-text-field, " +
    "fluent-text-area, fluent-select, fluent-combobox, details, [contenteditable]";

const elementIds = {
    settingsDiagButton: "actionsSettings-diag",
    settingsOkButton: "actionsSettings-OK",
    diagOkButton: "actionsDiag-OK",
    diagPre: "diagpre",
    telemetryInput: "telemetryInput",
    privacyLink: "privacy-link"
} as const;

export function findTabStops(container: HTMLElement | Document | null): HTMLElement[] {
    if (container === null) {
        return [];
    }

    return Array.from(container.querySelectorAll(focusableSelector))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
        .filter(isFocusableElement);
}

export function isFocusableElement(el: Element): el is HTMLElement {
    if (!(el instanceof HTMLElement)) {
        return false;
    }

    if (el.hasAttribute("disabled")) {
        return false;
    }

    if (el.offsetParent === null) {
        const parentDialog = el.closest("fluent-dialog:not([hidden])");
        if (!parentDialog) {
            return false;
        }
    }

    const tagName = el.tagName.toLowerCase();
    if (tagName.startsWith("fluent-")) {
        return true;
    }

    if (el.hasAttribute("tabindex")) {
        const tabIndexValue = parseInt(el.getAttribute("tabindex") || "0", 10);
        return tabIndexValue >= 0;
    }

    const focusableTags = ["a", "button", "input", "textarea", "select", "details"];
    if (focusableTags.includes(tagName)) {
        if (tagName === "a") {
            return el.hasAttribute("href");
        }
        return true;
    }

    if (el.hasAttribute("contenteditable") && el.getAttribute("contenteditable") !== "false") {
        return true;
    }

    return false;
}

/** Initialize circular tab navigation within open fluent-dialogs. */
export function initDialogTabNav(): void {
    document.addEventListener("keydown", function (e) {
        if (e.key !== "Tab") return;

        const shiftPressed = e.shiftKey;
        const focused = document.activeElement as HTMLElement;

        const openDialog = document.querySelector("fluent-dialog:not([hidden])") as HTMLElement;
        if (!openDialog || !openDialog.contains(focused)) return;

        const radioGroup = document.querySelector("fluent-dialog:not([hidden]) fluent-radio-group") as FluentRadioGroup;
        let checkedRadio = radioGroup?.querySelector("fluent-radio[checked]") as HTMLElement;

        if (!checkedRadio && radioGroup) {
            const allRadios = radioGroup.querySelectorAll("fluent-radio");
            checkedRadio = Array.from(allRadios).find(r =>
                r.getAttribute("current-checked") === "true" ||
                r.getAttribute("aria-checked") === "true" ||
                r.hasAttribute("checked")
            ) as HTMLElement;

            if (!checkedRadio && radioGroup.value) {
                checkedRadio = radioGroup.querySelector(`fluent-radio[current-value="${radioGroup.value}"]`) as HTMLElement;
            }
        }

        const dialogTabOrder = [
            checkedRadio,
            document.getElementById(elementIds.telemetryInput),
            document.getElementById(elementIds.privacyLink),
            document.getElementById(elementIds.settingsDiagButton),
            document.getElementById(elementIds.settingsOkButton),
            document.getElementById(elementIds.diagPre),
            document.getElementById(elementIds.diagOkButton),
        ].filter(el => el) as HTMLElement[];

        const currentIndex = dialogTabOrder.indexOf(focused);
        let targetIndex: number;

        if (currentIndex !== -1) {
            if (shiftPressed) {
                targetIndex = currentIndex === 0 ? dialogTabOrder.length - 1 : currentIndex - 1;
            } else {
                targetIndex = currentIndex === dialogTabOrder.length - 1 ? 0 : currentIndex + 1;
            }
        } else {
            targetIndex = 0;
        }

        const targetElement = dialogTabOrder[targetIndex];
        if (targetElement) {
            targetElement.focus();
            e.preventDefault();
            e.stopPropagation();
        }
    });
}
