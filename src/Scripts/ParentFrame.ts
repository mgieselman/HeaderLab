import { diagnostics } from "./Diag";
import { Errors } from "./Errors";
import { mhaStrings } from "./mhaStrings";
import { Strings } from "./Strings";
import { TabNavigation } from "./TabNavigation";
import { MhaResults } from "./ui/components/MhaResults";
import { DomUtils } from "./ui/domUtils";
import { GetHeaders } from "./ui/getHeaders/GetHeaders";
import { ModeName, ThemeManager, ThemeName } from "./ui/ThemeManager";
import { ParentFrameUtils } from "./utils/ParentFrameUtils";

// Fluent UI Web Components interfaces
interface FluentDialog extends HTMLElement {
    hidden: boolean;
    addEventListener(type: "dismiss", listener: (event: Event) => void): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

interface FluentRadioGroup extends HTMLElement {
    value: string;
}

interface FluentCheckbox extends HTMLElement {
    checked: boolean;
}

/** Close a fluent-dialog when clicking the backdrop (outside content).
 *  Uses composedPath() because Fluent shadow DOM retargets e.target. */
function addBackdropDismiss(dialog: FluentDialog): void {
    dialog.addEventListener("click", (e) => {
        const clickedInside = e.composedPath().some(el =>
            el instanceof HTMLElement && el !== dialog && dialog.contains(el)
        );
        if (!clickedInside) {
            dialog.hidden = true;
        }
    });
}

export class ParentFrame {
    private static headers = "";
    protected static telemetryCheckbox: FluentCheckbox | null = null;

    private static getResults(): MhaResults | null {
        const el = document.querySelector("mha-results");
        return el instanceof MhaResults ? el : null;
    }

    private static render(): void {
        if (ParentFrame.headers) diagnostics.trackEvent({ name: "analyzeHeaders" });
        ParentFrame.hideStatus();
        const results = ParentFrame.getResults();
        if (results) {
            results.clear();
            results.analyze(ParentFrame.headers);
        }
    }

    public static showError(error: unknown, message: string, suppressTracking?: boolean): void {
        Errors.log(error, message, suppressTracking);
        ParentFrame.hideStatus();
        ParentFrame.getResults()?.showError(message);
    }

    public static updateStatus(statusText: string): void {
        DomUtils.setText("#status-message", statusText);
        const overlay = DomUtils.getElement("#loading-overlay");
        if (overlay) overlay.style.display = "block";
    }

    private static hideStatus(): void {
        const overlay = DomUtils.getElement("#loading-overlay");
        if (overlay) overlay.style.display = "none";
    }

    private static async loadNewItem() {
        if (Office.context.mailbox.item) {
            ParentFrame.updateStatus(mhaStrings.mhaLoading);
            await GetHeaders.send(function (headers: string, apiUsed: string): void {
                ParentFrame.headers = headers;
                diagnostics.set("API used", apiUsed);
                ParentFrame.render();
            });
        }
    }

    private static registerItemChangedEvent(): void {
        try {
            if (Office.context.mailbox.addHandlerAsync !== undefined) {
                Office.context.mailbox.addHandlerAsync(Office.EventType.ItemChanged,
                    function (): void {
                        Errors.clear();
                        diagnostics.clear();
                        ParentFrame.loadNewItem();
                    });
            }
        } catch (e) {
            Errors.log(e, "Could not register item changed event");
        }
    }

    public static get modelString(): string {
        return ParentFrame.getResults()?.getModelString() ?? "";
    }

    private static applySettings(dialog: FluentDialog): void {
        if (ParentFrame.telemetryCheckbox) {
            diagnostics.setSendTelemetry(ParentFrame.telemetryCheckbox.checked);
        }

        const themeGroup = document.getElementById("themeChoice") as FluentRadioGroup;
        if (themeGroup?.value) {
            ThemeManager.setTheme(themeGroup.value as ThemeName);
        }

        const modeGroup = document.getElementById("modeChoice") as FluentRadioGroup;
        if (modeGroup?.value) {
            ThemeManager.setMode(modeGroup.value as ModeName);
        }

        dialog.hidden = true;
    }

    private static initFluent(): void {
        const header: Element | null = document.querySelector(".header-row");
        if (!header) return;

        const dialogSettings = document.getElementById("dialog-Settings") as FluentDialog;
        const dialogDiagnostics = document.getElementById("dialog-Diagnostics") as FluentDialog;

        if (!dialogSettings || !dialogDiagnostics) return;

        dialogSettings.hidden = true;
        dialogDiagnostics.hidden = true;

        addBackdropDismiss(dialogSettings);
        addBackdropDismiss(dialogDiagnostics);

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (!dialogSettings.hidden) dialogSettings.hidden = true;
                if (!dialogDiagnostics.hidden) dialogDiagnostics.hidden = true;
            }

            if (e.key === "Enter" && !dialogSettings.hidden) {
                const activeElement = document.activeElement;
                const isRadioOrCheckbox = activeElement &&
                    (activeElement.tagName.toLowerCase() === "fluent-radio" ||
                        activeElement.tagName.toLowerCase() === "fluent-checkbox");

                if (isRadioOrCheckbox) {
                    ParentFrame.applySettings(dialogSettings);
                    e.preventDefault();
                }
            }

            if (e.key === "Enter" && !dialogDiagnostics.hidden) {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.id === "diagpre") {
                    dialogDiagnostics.hidden = true;
                    e.preventDefault();
                }
            }
        });

        const telemetryCheckbox = document.getElementById("telemetryInput") as FluentCheckbox;
        if (telemetryCheckbox) {
            ParentFrame.telemetryCheckbox = telemetryCheckbox;
            ParentFrame.setSendTelemetryUI(diagnostics.canSendTelemetry());
        }

        const okButton = document.getElementById("actionsSettings-OK");
        okButton?.addEventListener("click", () => {
            ParentFrame.applySettings(dialogSettings);
        });

        const diagButton = document.getElementById("actionsSettings-diag");
        diagButton?.addEventListener("click", () => {
            const diagnosticsText = ParentFrameUtils.getDiagnosticsString();
            const diagnosticsElement = document.getElementById("diagnostics");
            if (diagnosticsElement) {
                diagnosticsElement.textContent = diagnosticsText;
            }

            dialogSettings.hidden = true;
            dialogDiagnostics.hidden = false;
            document.getElementById("diagpre")?.focus();
        });

        const diagOkButton = document.getElementById("actionsDiag-OK");
        diagOkButton?.addEventListener("click", () => {
            dialogDiagnostics.hidden = true;
        });

        const settingsButton = document.getElementById("settingsButton");
        settingsButton?.addEventListener("click", () => {
            const themeGroup = document.getElementById("themeChoice") as FluentRadioGroup;
            if (themeGroup) {
                themeGroup.value = ThemeManager.theme;
            }

            const modeGroup = document.getElementById("modeChoice") as FluentRadioGroup;
            if (modeGroup) {
                modeGroup.value = ThemeManager.mode;
            }

            dialogSettings.hidden = false;
        });

        const copyButton = document.getElementById("copyButton");
        copyButton?.addEventListener("click", () => {
            Strings.copyToClipboard(ParentFrame.modelString);

            const statusMessage = document.getElementById("statusMessage");
            if (statusMessage) {
                statusMessage.textContent = mhaStrings.mhaCopied;
                statusMessage.classList.add("show");

                setTimeout(() => {
                    statusMessage.classList.remove("show");
                    statusMessage.textContent = "";
                }, 2000);
            }

            copyButton.focus();
        });

        TabNavigation.initialize();
    }

    private static setSendTelemetryUI(sendTelemetry: boolean) {
        if (ParentFrame.telemetryCheckbox) {
            ParentFrame.telemetryCheckbox.checked = sendTelemetry;
        }
    }

    public static async initUI() {
        ThemeManager.initialize();
        ParentFrame.initFluent();

        diagnostics.onSendTelemetryChanged((sendTelemetry) => {
            ParentFrame.setSendTelemetryUI(sendTelemetry);
        });

        diagnostics.setHeaderDiagProvider(() => {
            return {
                permissionLevel: GetHeaders.permissionLevel(),
                canUseAPI: GetHeaders.canUseAPI(),
                sufficientPermission: GetHeaders.sufficientPermission(true),
            };
        });

        try {
            const sendTelemetry: boolean = Office.context.roamingSettings.get("sendTelemetry");
            diagnostics.initSendTelemetry(sendTelemetry);
        } catch {
            // Ignore stale roaming settings
        }

        ParentFrame.registerItemChangedEvent();
        await ParentFrame.loadNewItem();
    }
}
