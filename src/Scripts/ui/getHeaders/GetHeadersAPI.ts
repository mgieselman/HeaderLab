import { GetHeaders, HeaderCallbacks } from "./GetHeaders";
import { diagnostics } from "../../Diag";
import { Errors } from "../../Errors";
import { mhaStrings } from "../../mhaStrings";

export class GetHeadersAPI {
    public static canUseAPI(): boolean { return GetHeaders.canUseAPI(); }

    private static async getAllInternetHeaders(item: Office.MessageRead): Promise<string> {
        return new Promise((resolve) => {
            item.getAllInternetHeadersAsync((asyncResult) => {
                if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
                    resolve(asyncResult.value);
                } else {
                    diagnostics.set("getAllInternetHeadersAsyncFailure", JSON.stringify(asyncResult));
                    Errors.log(asyncResult.error, "getAllInternetHeadersAsync failed.\nFallback to Rest.\n" + JSON.stringify(asyncResult, null, 2), true);
                    resolve("");
                }
            });
        });
    }

    public static async send(callbacks: HeaderCallbacks): Promise<string> {
        if (!GetHeaders.validItem() || !Office.context.mailbox.item) {
            Errors.logMessage("No item selected (API)");
            return "";
        }

        if (!GetHeadersAPI.canUseAPI()) {
            return "";
        }

        callbacks.onStatus(mhaStrings.mhaRequestSent);

        try {
            const headers = await GetHeadersAPI.getAllInternetHeaders(Office.context.mailbox.item);
            return headers;
        }
        catch (e) {
            Errors.log(e, "Failed in getAllInternetHeadersAsync");
        }

        return "";
    }
}
