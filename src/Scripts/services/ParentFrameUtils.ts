import { diagnostics } from "./Diagnostics";
import { errors } from "./Errors";

/**
 * Utility functions extracted from ParentFrame for better testability
 */
export class ParentFrameUtils {
    /**
     * Parses a query string parameter from the current URL
     * @param variable The parameter name to look for
     * @returns The parameter value or empty string if not found
     */
    static getQueryVariable(variable: string, search: string = window.location.search): string {
        const vars: string[] = search.substring(1).split("&");

        let found = "";
        vars.forEach((v: string) => {
            if (found === "") {
                const pair: string[] = v.split("=");
                if (pair[0] === variable) {
                    found = pair[1] ?? "";
                }
            }
        });

        return found;
    }

    /**
     * Generates a settings key based on the Office host name
     * @returns Settings key string
     */
    static getSettingsKey(): string {
        try {
            return "frame" + Office.context.mailbox.diagnostics.hostName;
        } catch {
            return "frame";
        }
    }

    /**
     * Generates diagnostics string from current diagnostic data and errors
     * @returns Formatted diagnostics string
     */
    static getDiagnosticsString(): string {
        let diagnosticsString = "";

        try {
            const diagnosticMap = diagnostics.get();
            for (const diag in diagnosticMap) {
                if (Object.prototype.hasOwnProperty.call(diagnosticMap, diag)) {
                    diagnosticsString += diag + " = " + diagnosticMap[diag] + "\n";
                }
            }
        } catch {
            diagnosticsString += "ERROR: Failed to get diagnostics\n";
        }

        const errorList: string[] = errors.get();
        errorList.forEach((error: string) => {
            diagnosticsString += "ERROR: " + error + "\n";
        });

        return diagnosticsString;
    }
}
