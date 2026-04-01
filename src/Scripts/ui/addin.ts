/**
 * Outlook add-in entry point: auto-retrieve headers from the current email.
 */

import "../../Content/theme.css";
import "../../Content/typography.css";
import "../../Content/layout.css";
import "../../Content/components.css";

import { diagnostics } from "../Diag";
import { HeaderModel } from "../HeaderModel";
import { labels } from "../labels";
import { createAppShell } from "./components/AppShell";
import { GetHeaders, HeaderCallbacks } from "./getHeaders/GetHeaders";
import { AppState } from "./state/AppState";

function initAddin(): void {
    const root = document.getElementById("app");
    if (!root) return;

    const state = new AppState();
    createAppShell(root, state, "addin");

    // Initialize telemetry from roaming settings
    if (typeof Office !== "undefined" && Office.context) {
        try {
            const sendTelemetry = Office.context.roamingSettings.get("sendTelemetry");
            if (sendTelemetry !== undefined && sendTelemetry !== null) {
                diagnostics.initSendTelemetry(sendTelemetry as boolean);
            }
        } catch {
            // Roaming settings not available
        }
    }

    const callbacks: HeaderCallbacks = {
        onStatus: (statusText: string) => state.setStatus(statusText),
        onError: (_error: unknown, message: string) => {
            state.setError(message);
            state.setLoading(false);
        },
    };

    async function retrieveHeaders(): Promise<void> {
        state.clear();
        state.setLoading(true);
        state.setStatus(labels.loading);

        await GetHeaders.send(
            async (headers: string, apiUsed: string) => {
                diagnostics.set("API used", apiUsed);
                try {
                    const model = await HeaderModel.create(headers);
                    state.setModel(model);
                    state.setStatus(labels.analyzed);
                } catch (e) {
                    state.setError("Failed to analyze headers: " + (e instanceof Error ? e.message : String(e)));
                } finally {
                    state.setLoading(false);
                }
            },
            callbacks
        );
    }

    // Initial retrieval
    retrieveHeaders();

    // Re-retrieve on item change
    if (typeof Office !== "undefined" && Office.context && Office.context.mailbox) {
        try {
            Office.context.mailbox.addHandlerAsync(
                Office.EventType.ItemChanged,
                () => { retrieveHeaders(); }
            );
        } catch {
            // ItemChanged not supported in this host version
        }
    }
}

if (typeof Office !== "undefined") {
    Office.onReady(() => { initAddin(); });
} else {
    // Fallback for testing outside of Office
    document.addEventListener("DOMContentLoaded", initAddin);
}
