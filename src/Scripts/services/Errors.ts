import { Diagnostics, diagnostics } from "./Diagnostics";
import { Stack } from "./Stack";
import { Strings } from "../core/Strings";

export class Errors {
    private errorArray: string[] = [];

    constructor(private readonly diag: Diagnostics) {}

    public clear(): void { this.errorArray = []; }

    public get() { return this.errorArray; }

    public add(eventName: string, stack: string[], suppressTracking: boolean): void {
        if (eventName || stack) {
            const stackString = Strings.joinArray(stack, "\n");
            this.errorArray.push(Strings.joinArray([eventName, stackString], "\n"));

            if (!suppressTracking) {
                this.diag.trackEvent({ name: eventName },
                    {
                        stack: stackString,
                        source: "Errors.add"
                    });
            }
        }
    }

    public isError(error: unknown): boolean {
        if (!error) return false;

        // We can't afford to throw while checking if we're processing an error
        // So just swallow any exception and fail.
        try {
            if (typeof (error) === "string") return false;
            if (typeof (error) === "number") return false;
            if (typeof error === "object" && "stack" in error) return true;
        } catch (e) {
            this.diag.trackEvent({ name: "isError exception with error", properties: { error: JSON.stringify(e) } });
        }

        return false;
    }

    // error - an exception object
    // message - a string describing the error
    // suppressTracking - boolean indicating if we should suppress tracking
    public log(error: unknown, message: string, suppressTracking?: boolean): void {
        if (error && !suppressTracking) {
            const event = { name: "Errors.log" };
            const props = {
                message: message,
                error: JSON.stringify(error, null, 2),
                source: "",
                stack: "",
                description: "",
                errorMessage: ""
            };

            if (this.isError(error) && (error as { exception?: unknown }).exception) {
                props.source = "Error.log Exception";
                event.name = "Exception";
            }
            else {
                props.source = "Error.log Event";
                if (typeof error === "object" && "description" in error) props.description = (error as { description: string }).description;
                if (typeof error === "object" && "message" in error) props.errorMessage = (error as { message: string }).message;
                if (typeof error === "object" && "stack" in error) props.stack = (error as { stack: string }).stack;
                if (typeof error === "object" && "description" in error) {
                    event.name = (error as { description: string }).description;
                } else if (typeof error === "object" && "message" in error) {
                    event.name = (error as { message: string }).message;
                } else if (props.message) {
                    event.name = props.message;
                } else {
                    event.name = "Unknown error object";
                }
            }

            this.diag.trackException(event, props);
        }

        Stack.parse(error, message, (eventName: string, stack: string[]): void => {
            this.add(eventName, stack, suppressTracking ?? false);
        });
    }

    public logMessage(message: string): void {
        this.add(message, [], true);
    }

    public getErrorMessage(error: unknown): string {
        if (!error) return "";
        if (typeof (error) === "string") return error;
        if (typeof (error) === "number") return error.toString();
        if (typeof error === "object" && error !== null && "message" in error) return (error as Error).message;
        return JSON.stringify(error, null, 2);
    }

    public getErrorStack(error: unknown): string {
        if (!error) return "";
        if (typeof (error) === "string") return "string thrown as error";
        if (typeof (error) === "number") return "number thrown as error";
        if (!this.isError(error)) return "";
        if (typeof error === "object" && error !== null && "stack" in error) return (error as Error).stack ?? "";
        return "";
    }
}

export const errors = new Errors(diagnostics);
