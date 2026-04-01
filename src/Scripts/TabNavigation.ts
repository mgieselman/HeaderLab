// Fluent UI Web Components interfaces for tab navigation
interface FluentRadioGroup extends HTMLElement {
    value: string;
}

export class TabNavigation {
    // Comprehensive selector that includes both standard and Fluent UI elements
    private static readonly focusableSelector =
        "a, button, input, textarea, select, [tabindex], " +
        "fluent-button, fluent-checkbox, fluent-radio, fluent-text-field, " +
        "fluent-text-area, fluent-select, fluent-combobox, details, [contenteditable]";

    // Element IDs for common UI components
    private static readonly elementIds = {
        settingsDiagButton: "actionsSettings-diag",
        settingsOkButton: "actionsSettings-OK",
        diagOkButton: "actionsDiag-OK",
        diagPre: "diagpre",
        telemetryInput: "telemetryInput",
        privacyLink: "privacy-link"
    } as const;

    /**
     * Finds all focusable elements within a given HTML element or document.
     */
    public static findTabStops(container: HTMLElement | Document | null): HTMLElement[] {
        if (container === null) {
            return [];
        }

        const focusableElements = container.querySelectorAll(TabNavigation.focusableSelector);

        const htmlElements = Array.from(focusableElements)
            .filter((el): el is HTMLElement => el instanceof HTMLElement);

        return htmlElements.filter(TabNavigation.isFocusableElement);
    }

    /**
     * Checks if an element is focusable based on various criteria.
     */
    public static isFocusableElement(el: Element): el is HTMLElement {
        if (!(el instanceof HTMLElement)) {
            return false;
        }

        const htmlEl = el;
        if (htmlEl.hasAttribute("disabled")) {
            return false;
        }

        // Check if element is visible (offsetParent is null for hidden elements)
        if (htmlEl.offsetParent === null) {
            const parentDialog = htmlEl.closest("fluent-dialog:not([hidden])");
            if (!parentDialog) {
                return false;
            }
        }

        // Fluent components are focusable by default unless disabled
        const tagName = htmlEl.tagName.toLowerCase();
        if (tagName.startsWith("fluent-")) {
            return true;
        }

        // Elements with explicit tabindex
        if (htmlEl.hasAttribute("tabindex")) {
            const tabIndexValue = parseInt(htmlEl.getAttribute("tabindex") || "0", 10);
            return tabIndexValue >= 0;
        }

        // Standard focusable elements
        const focusableTags = ["a", "button", "input", "textarea", "select", "details"];
        if (focusableTags.includes(tagName)) {
            if (tagName === "a") {
                return htmlEl.hasAttribute("href");
            }
            return true;
        }

        // Elements with contenteditable
        if (htmlEl.hasAttribute("contenteditable") && htmlEl.getAttribute("contenteditable") !== "false") {
            return true;
        }

        return false;
    }

    /**
     * Initialize tab navigation for dialogs.
     * Implements circular tab navigation within open dialogs.
     */
    public static initialize(): void {
        document.addEventListener("keydown", function (e) {
            if (e.key !== "Tab") return;

            const shiftPressed = e.shiftKey;
            const focused = document.activeElement as HTMLElement;

            // Only handle circular tab navigation within dialogs
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

            const telemetryCheckbox = document.getElementById(TabNavigation.elementIds.telemetryInput);
            const privacyLink = document.getElementById(TabNavigation.elementIds.privacyLink) as HTMLElement;
            const settingsDiagButton = document.getElementById(TabNavigation.elementIds.settingsDiagButton);
            const settingsOkButton = document.getElementById(TabNavigation.elementIds.settingsOkButton);
            const diagPre = document.getElementById(TabNavigation.elementIds.diagPre);
            const diagOkButton = document.getElementById(TabNavigation.elementIds.diagOkButton);

            const dialogTabOrder = [
                checkedRadio,
                telemetryCheckbox,
                privacyLink,
                settingsDiagButton,
                settingsOkButton,
                diagPre,
                diagOkButton
            ].filter(el => el) as HTMLElement[];

            const currentIndex = dialogTabOrder.indexOf(focused);

            if (currentIndex !== -1) {
                let targetIndex;
                if (shiftPressed) {
                    targetIndex = currentIndex === 0 ? dialogTabOrder.length - 1 : currentIndex - 1;
                } else {
                    targetIndex = currentIndex === dialogTabOrder.length - 1 ? 0 : currentIndex + 1;
                }

                const targetElement = dialogTabOrder[targetIndex];
                if (targetElement) {
                    targetElement.focus();
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else {
                if (dialogTabOrder.length > 0 && dialogTabOrder[0]) {
                    dialogTabOrder[0].focus();
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });
    }
}
