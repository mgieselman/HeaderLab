import { DeferredError } from "./DeferredError";
import { diagnostics } from "./Diag";
import { Errors } from "./Errors";
import { mhaStrings } from "./mhaStrings";
import { Poster } from "./Poster";
import { Strings } from "./Strings";
import { TabNavigation } from "./TabNavigation";
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

// Single unified frame URL
const frameUrl = "newDesktopFrame.html";

export class ParentFrame {
    private static iFrame: Window | null;
    private static deferredErrors: DeferredError[] = [];
    private static deferredStatus: string[] = [];
    private static headers = "";
    private static modelToString = "";
    protected static telemetryCheckbox: FluentCheckbox | null = null;

    private static postMessageToFrame(eventName: string, data: string | { error: string, message: string }): void {
        if (ParentFrame.iFrame) {
            Poster.postMessageToFrame(ParentFrame.iFrame, eventName, data);
        }
    }

    private static render(): void {
        if (ParentFrame.headers) diagnostics.trackEvent({ name: "analyzeHeaders" });
        ParentFrame.postMessageToFrame("renderItem", ParentFrame.headers);
    }

    private static setFrame(frame: Window): void {
        ParentFrame.iFrame = frame;
        TabNavigation.setIFrame(frame);

        if (ParentFrame.iFrame) {
            ParentFrame.deferredStatus.forEach((status: string) => {
                ParentFrame.postMessageToFrame("updateStatus", status);
            });
            ParentFrame.deferredStatus = [];

            ParentFrame.deferredErrors.forEach((deferredError: DeferredError) => {
                ParentFrame.postMessageToFrame("showError",
                    {
                        error: JSON.stringify(deferredError.error),
                        message: deferredError.message
                    });
            });
            ParentFrame.deferredErrors = [];

            ParentFrame.render();
        }
    }

    private static eventListener(event: MessageEvent): void {
        if (!event || event.origin !== Poster.site()) return;

        if (event.data) {
            switch (event.data.eventName) {
                case "frameActive":
                    ParentFrame.setFrame(event.source as Window);
                    break;
                case "LogError":
                    Errors.log(JSON.parse(event.data.data.error), event.data.data.message);
                    break;
                case "modelToString":
                    ParentFrame.modelToString = event.data.data;
                    break;
            }
        }
    }

    private static async loadNewItem() {
        if (Office.context.mailbox.item) {
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

    public static showError(error: unknown, message: string, suppressTracking?: boolean): void {
        Errors.log(error, message, suppressTracking);

        if (ParentFrame.iFrame) {
            ParentFrame.postMessageToFrame("showError", { error: JSON.stringify(error), message: message });
        } else {
            ParentFrame.deferredErrors.push(<DeferredError>{ error: error, message: message });
        }
    }

    public static updateStatus(statusText: string): void {
        if (ParentFrame.iFrame) {
            ParentFrame.postMessageToFrame("updateStatus", statusText);
        } else {
            ParentFrame.deferredStatus.push(statusText);
        }
    }

    private static loadFrame(): void {
        ParentFrame.iFrame = null;
        (document.getElementById("uiFrame") as HTMLIFrameElement).src = frameUrl;
    }

    private static getIFrame(): Window | null {
        return ParentFrame.iFrame;
    }

    private static initFluent(): void {
        const header: Element | null = document.querySelector(".header-row");
        if (!header) return;

        const dialogSettings = document.getElementById("dialog-Settings") as FluentDialog;
        const dialogDiagnostics = document.getElementById("dialog-Diagnostics") as FluentDialog;

        if (!dialogSettings || !dialogDiagnostics) return;

        dialogSettings.hidden = true;
        dialogDiagnostics.hidden = true;

        dialogSettings.addEventListener("click", (e) => {
            if (e.target === dialogSettings) {
                dialogSettings.hidden = true;
            }
        });

        dialogDiagnostics.addEventListener("click", (e) => {
            if (e.target === dialogDiagnostics) {
                dialogDiagnostics.hidden = true;
            }
        });

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
                    // Apply telemetry setting
                    if (ParentFrame.telemetryCheckbox) {
                        diagnostics.setSendTelemetry(ParentFrame.telemetryCheckbox.checked);
                    }

                    // Apply theme and mode
                    const themeGroup = document.getElementById("themeChoice") as FluentRadioGroup;
                    if (themeGroup?.value) {
                        ThemeManager.setTheme(themeGroup.value as ThemeName, ParentFrame.getIFrame() || undefined);
                    }

                    const modeGroup = document.getElementById("modeChoice") as FluentRadioGroup;
                    if (modeGroup?.value) {
                        ThemeManager.setMode(modeGroup.value as ModeName, ParentFrame.getIFrame() || undefined);
                    }

                    dialogSettings.hidden = true;
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

        // OK button: apply theme/mode/telemetry settings
        const okButton = document.getElementById("actionsSettings-OK");
        okButton?.addEventListener("click", () => {
            if (ParentFrame.telemetryCheckbox) {
                diagnostics.setSendTelemetry(ParentFrame.telemetryCheckbox.checked);
            }

            const themeGroup = document.getElementById("themeChoice") as FluentRadioGroup;
            if (themeGroup?.value) {
                ThemeManager.setTheme(themeGroup.value as ThemeName, ParentFrame.getIFrame() || undefined);
            }

            const modeGroup = document.getElementById("modeChoice") as FluentRadioGroup;
            if (modeGroup?.value) {
                ThemeManager.setMode(modeGroup.value as ModeName, ParentFrame.getIFrame() || undefined);
            }

            dialogSettings.hidden = true;
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
            // Set current theme and mode in radio groups
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
            Strings.copyToClipboard(ParentFrame.modelToString);

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

    public static setSendTelemetryUI(sendTelemetry: boolean) {
        if (ParentFrame.telemetryCheckbox) {
            ParentFrame.telemetryCheckbox.checked = sendTelemetry;
        }
    }

    public static async initUI() {
        ThemeManager.initialize();
        ParentFrame.initFluent();

        // Load the unified frame
        ParentFrame.loadFrame();

        try {
            const sendTelemetry: boolean = Office.context.roamingSettings.get("sendTelemetry");
            diagnostics.initSendTelemetry(sendTelemetry);
        } catch {
            // Ignore stale roaming settings
        }

        ParentFrame.registerItemChangedEvent();

        window.addEventListener("message", ParentFrame.eventListener, false);
        await ParentFrame.loadNewItem();
    }
}
