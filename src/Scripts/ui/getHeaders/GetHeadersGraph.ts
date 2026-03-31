import { type IPublicClientApplication, createNestablePublicClientApplication } from "@azure/msal-browser";

import { GetHeaders } from "./GetHeaders";
import { diagnostics } from "../../Diag";
import { Errors } from "../../Errors";
import { mhaStrings } from "../../mhaStrings";
import { naaClientId } from "../../naaClientId";
import { ParentFrame } from "../../ParentFrame";

/*
 * GetHeadersGraph.ts
 *
 * This file has all the methods to get PR_TRANSPORT_MESSAGE_HEADERS
 * from the current message via Microsoft Graph API using
 * Nested App Authentication (NAA).
 *
 * Requirement Sets and Permissions
 * NAA requires NestedAppAuth 1.1
 * Graph API requires Mail.Read (delegated)
 */

interface GraphExtendedProperty {
    id: string;
    value: string;
}

interface GraphMessageResponse {
    singleValueExtendedProperties?: GraphExtendedProperty[];
}

export class GetHeadersGraph {
    private static msalApp: IPublicClientApplication | null = null;

    // Public for unit testing
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
            // Silent failed (no cached token or consent needed), try popup
            try {
                const result = await msalApp.acquireTokenPopup({ scopes: scopes });
                return result.accessToken;
            } catch (popupError) {
                diagnostics.set("graphTokenFailure", JSON.stringify(popupError));
                Errors.log(popupError, "NAA acquireTokenPopup failed");
                return "";
            }
        }
    }

    private static async getHeaders(accessToken: string): Promise<string> {
        if (!accessToken) {
            Errors.logMessage("No Graph access token");
            return "";
        }

        if (!Office.context.mailbox.item) {
            Errors.logMessage("No item (Graph)");
            return "";
        }

        if (!Office.context.mailbox.item.itemId) {
            Errors.logMessage("No itemId (Graph)");
            return "";
        }

        // Graph accepts both EWS and REST format itemIds
        const itemId = Office.context.mailbox.item.itemId;

        // PR_TRANSPORT_MESSAGE_HEADERS via extended property
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
                    ParentFrame.showError(null, mhaStrings.mhaMessageMissing, true);
                }

                return "";
            }

            const item = await response.json();

            // Graph v1.0 uses camelCase property names
            const headers = GetHeadersGraph.extractHeadersFromResponse(item);
            if (headers) {
                return headers;
            } else {
                ParentFrame.showError(null, mhaStrings.mhaHeadersMissing, true);
                return "";
            }
        }
        catch (e) {
            ParentFrame.showError(e, "Failed fetching headers via Graph");
        }

        return "";
    }

    public static async send(): Promise<string> {
        if (!GetHeaders.validItem()) {
            Errors.logMessage("No item selected (Graph)");
            return "";
        }

        if (!GetHeadersGraph.canUseGraph()) {
            return "";
        }

        ParentFrame.updateStatus(mhaStrings.mhaRequestSent);

        try {
            const accessToken = await GetHeadersGraph.getAccessToken();
            const headers = await GetHeadersGraph.getHeaders(accessToken);
            return headers;
        }
        catch (e) {
            Errors.log(e, "Failed in Graph/NAA flow");
        }

        return "";
    }
}
