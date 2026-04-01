import { GetHeaders, HeaderCallbacks } from "./GetHeaders";
import { diagnostics } from "../Diagnostics";
import { errors } from "../Errors";

export class GetHeadersAPI {
    public static canUseAPI(): boolean { return GetHeaders.canUseAPI(); }

    private static async getAllInternetHeaders(item: Office.MessageRead): Promise<string> {
        return new Promise((resolve) => {
            item.getAllInternetHeadersAsync((asyncResult) => {
                if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
                    resolve(asyncResult.value);
                } else {
                    diagnostics.set("getAllInternetHeadersAsyncFailure", JSON.stringify(asyncResult));
                    errors.log(asyncResult.error, "getAllInternetHeadersAsync failed.\nFallback to Rest.\n" + JSON.stringify(asyncResult, null, 2), true);
                    resolve("");
                }
            });
        });
    }

    public static async send(callbacks: HeaderCallbacks): Promise<string> {
        if (!GetHeaders.validItem() || !Office.context.mailbox.item) {
            errors.logMessage("No item selected (API)");
            return "";
        }

        if (!GetHeadersAPI.canUseAPI()) {
            return "";
        }

        callbacks.onStatus("Retrieving headers from server.");

        try {
            const headers = await GetHeadersAPI.getAllInternetHeaders(Office.context.mailbox.item);
            return headers;
        }
        catch (e) {
            errors.log(e, "Failed in getAllInternetHeadersAsync");
        }

        return "";
    }
}
