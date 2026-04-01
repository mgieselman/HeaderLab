import { type IPublicClientApplication, createNestablePublicClientApplication } from "@azure/msal-browser";

import { GetHeaders, HeaderCallbacks } from "./GetHeaders";
import { naaClientId } from "../../config/naaClientId";
import { diagnostics } from "../Diagnostics";
import { errors } from "../Errors";

interface GraphExtendedProperty {
    id: string;
    value: string;
}

interface GraphMessageResponse {
    singleValueExtendedProperties?: GraphExtendedProperty[];
}

export class GetHeadersGraph {
    private static msalApp: IPublicClientApplication | null = null;

    public static extractHeadersFromResponse(item: GraphMessageResponse): string {
        if (item.singleValueExtendedProperties !== undefined && item.singleValueExtendedProperties.length > 0) {
            const prop = item.singleValueExtendedProperties[0];
            if (prop) {
                return prop.value;
            }
        }
        return "";
    }

    public static canUseGraph(): boolean {
        if (typeof (Office) === "undefined") { diagnostics.set("noGraphReason", "Office undefined"); return false; }
        if (!Office) { diagnostics.set("noGraphReason", "Office false"); return false; }
        if (!Office.context) { diagnostics.set("noGraphReason", "context false"); return false; }
        if (!Office.context.requirements) { diagnostics.set("noGraphReason", "requirements false"); return false; }
        if (!Office.context.requirements.isSetSupported("NestedAppAuth", "1.1")) { diagnostics.set("noGraphReason", "NestedAppAuth 1.1 not supported"); return false; }
        const clientId = naaClientId();
        if (!clientId) { diagnostics.set("noGraphReason", "No NAA client ID configured"); return false; }
        return true;
    }

    private static async initMsal(): Promise<IPublicClientApplication> {
        if (GetHeadersGraph.msalApp) {
            return GetHeadersGraph.msalApp;
        }

        const msalConfig = {
            auth: {
                clientId: naaClientId(),
                authority: "https://login.microsoftonline.com/common",
            }
        };

        GetHeadersGraph.msalApp = await createNestablePublicClientApplication(msalConfig);
        return GetHeadersGraph.msalApp;
    }

    private static async getAccessToken(): Promise<string> {
        const msalApp = await GetHeadersGraph.initMsal();
        const scopes = ["https://graph.microsoft.com/Mail.Read"];

        try {
            const result = await msalApp.acquireTokenSilent({ scopes: scopes });
            return result.accessToken;
        } catch {
            try {
                const result = await msalApp.acquireTokenPopup({ scopes: scopes });
                return result.accessToken;
            } catch (popupError) {
                diagnostics.set("graphTokenFailure", JSON.stringify(popupError));
                errors.log(popupError, "NAA acquireTokenPopup failed");
                return "";
            }
        }
    }

    private static async getHeaders(accessToken: string, callbacks: HeaderCallbacks): Promise<string> {
        if (!accessToken) {
            errors.logMessage("No Graph access token");
            return "";
        }

        if (!Office.context.mailbox.item) {
            errors.logMessage("No item (Graph)");
            return "";
        }

        if (!Office.context.mailbox.item.itemId) {
            errors.logMessage("No itemId (Graph)");
            return "";
        }

        const itemId = Office.context.mailbox.item.itemId;
        const graphUrl = "https://graph.microsoft.com/v1.0/me/messages/" +
            encodeURIComponent(itemId) +
            "?$select=singleValueExtendedProperties" +
            "&$expand=singleValueExtendedProperties($filter=id eq 'String 0x007D')";

        try {
            const response = await fetch(graphUrl, {
                headers: {
                    "Authorization": "Bearer " + accessToken, //eslint-disable-line @typescript-eslint/naming-convention
                    "Accept": "application/json" //eslint-disable-line @typescript-eslint/naming-convention
                }
            });

            if (!response.ok) {
                diagnostics.set("graphGetHeadersFailure", response.status + " " + response.statusText);
                if (response.status === 404) {
                    callbacks.onError(null, "Message not located.", true);
                }

                return "";
            }

            const item = await response.json();
            const headers = GetHeadersGraph.extractHeadersFromResponse(item);
            if (headers) {
                return headers;
            } else {
                callbacks.onError(null, "Message was missing transport headers. If this is a sent item this may be expected.", true);
                return "";
            }
        }
        catch (e) {
            callbacks.onError(e, "Failed fetching headers via Graph");
        }

        return "";
    }

    public static async send(callbacks: HeaderCallbacks): Promise<string> {
        if (!GetHeaders.validItem()) {
            errors.logMessage("No item selected (Graph)");
            return "";
        }

        if (!GetHeadersGraph.canUseGraph()) {
            return "";
        }

        callbacks.onStatus("Retrieving headers from server.");

        try {
            const accessToken = await GetHeadersGraph.getAccessToken();
            const headers = await GetHeadersGraph.getHeaders(accessToken, callbacks);
            return headers;
        }
        catch (e) {
            errors.log(e, "Failed in Graph/NAA flow");
        }

        return "";
    }
}
