import { GetHeadersAPI } from "./GetHeadersAPI";
import { GetHeadersGraph } from "./GetHeadersGraph";
import { diagnostics } from "../../Diag";
import { Errors } from "../../Errors";

/**
 * Callbacks for the retrieval layer to communicate status and errors
 * to the UI without importing any UI modules directly.
 */
export interface HeaderCallbacks {
    onError: (error: unknown, message: string, suppressTracking?: boolean) => void;
    onStatus: (statusText: string) => void;
}

export class GetHeaders {
    public static permissionLevel(): number {
        if (typeof (Office) === "undefined") return 0;
        if (!Office) return 0;
        if (!Office.context) return 0;
        if (!Office.context.mailbox) return 0;
        // @ts-expect-error early version of initialData
        if (Office.context.mailbox._initialData$p$0) return Office.context.mailbox._initialData$p$0._permissionLevel$p$0;
        // @ts-expect-error initialData is missing from the type file
        if (Office.context.mailbox.initialData) return Office.context.mailbox.initialData.permissionLevel;
        return 0;
    }

    public static sufficientPermission(strict: boolean): boolean {
        if (typeof (Office) === "undefined") return false;
        if (!Office) return false;
        if (!Office.context) return false;
        if (!Office.context.mailbox) return false;
        // @ts-expect-error initialData is missing from the type file
        if (!Office.context.mailbox._initialData$p$0 && !Office.context.mailbox.initialData) return !strict;
        if (GetHeaders.permissionLevel() < 1) return false;
        return true;
    }

    public static canUseAPI(): boolean {
        if (typeof (Office) === "undefined") { diagnostics.set("noAPIreason", "Office undefined"); return false; }
        if (!Office) { diagnostics.set("noAPIreason", "Office false"); return false; }
        if (!Office.context) { diagnostics.set("noAPIreason", "context false"); return false; }
        if (!Office.context.requirements) { diagnostics.set("noAPIreason", "requirements false"); return false; }
        if (!Office.context.requirements.isSetSupported("Mailbox", "1.9")) { diagnostics.set("noAPIreason", "requirements too low"); return false; }
        if (!GetHeaders.sufficientPermission(true)) { diagnostics.set("noAPIreason", "sufficientPermission false"); return false; }
        if (!Office.context.mailbox) { diagnostics.set("noAPIreason", "mailbox false"); return false; }
        return true;
    }

    public static validItem(): boolean {
        if (typeof (Office) === "undefined") return false;
        if (!Office) return false;
        if (!Office.context) return false;
        if (!Office.context.mailbox) return false;
        if (!Office.context.mailbox.item) return false;
        if (!Office.context.mailbox.item.itemId) return false;
        return true;
    }

    public static async send(
        headersLoadedCallback: (_headers: string, apiUsed: string) => void,
        callbacks: HeaderCallbacks
    ) {
        if (!GetHeaders.validItem()) {
            callbacks.onError(null, "No item selected", true);
            return;
        }

        if (!GetHeaders.sufficientPermission(false)) {
            callbacks.onError(null, "Insufficient permissions to request headers", false);
            return;
        }

        try {
            let headers: string = await GetHeadersAPI.send(callbacks);
            if (headers !== "") {
                headersLoadedCallback(headers, "API");
                return;
            }

            Errors.logMessage("API failed, trying Graph");
            headers = await GetHeadersGraph.send(callbacks);
            if (headers !== "") {
                headersLoadedCallback(headers, "Graph");
                return;
            }
        } catch (e) {
            callbacks.onError(e, "Could not send header request");
        }
    }
}
