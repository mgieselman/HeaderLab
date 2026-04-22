import { GetHeaders } from "./GetHeaders";
import { GetHeadersAPI } from "./GetHeadersAPI";

describe("GetHeadersAPI.send", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("reports Office async API failures through callbacks", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "canUseAPI").mockReturnValue(true);

        const item = {
            getAllInternetHeadersAsync: (callback: (result: { status: string; error: Error; value: string; }) => void) => {
                callback({
                    status: "failed",
                    error: new Error("Office request failed"),
                    value: "",
                });
            },
        } as unknown as Office.MessageRead;

        const officeMock: Record<string, unknown> = {
            context: {
                mailbox: {
                    item,
                },
            },
        };
        officeMock["AsyncResultStatus"] = {};
        (officeMock["AsyncResultStatus"] as Record<string, string>)["Succeeded"] = "succeeded";

        vi.stubGlobal("Office", officeMock);

        const onStatus = vi.fn();
        const onError = vi.fn();

        const result = await GetHeadersAPI.send({ onStatus, onError });

        expect(result).toBe("");
        expect(onStatus).toHaveBeenCalledWith("Retrieving headers from server.");
        expect(onError).toHaveBeenCalledWith(expect.any(Error), "Office API header request failed (Office request failed).", true);
    });

    test("falls back to bare message when Office error has no code and no message", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "canUseAPI").mockReturnValue(true);

        const item = {
            getAllInternetHeadersAsync: (callback: (result: { status: string; error: undefined; value: string; }) => void) => {
                callback({ status: "failed", error: undefined, value: "" });
            },
        } as unknown as Office.MessageRead;

        const officeMock: Record<string, unknown> = {
            context: { mailbox: { item } },
            AsyncResultStatus: { Succeeded: "succeeded" },
        };
        vi.stubGlobal("Office", officeMock);

        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeadersAPI.send({ onStatus, onError });

        expect(onError).toHaveBeenCalledWith(undefined, "Office API header request failed.", true);
    });

    test("includes error code and message in user-facing detail when present", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "canUseAPI").mockReturnValue(true);

        const item = {
            getAllInternetHeadersAsync: (callback: (result: { status: string; error: { code: number; message: string; name: string; }; value: string; }) => void) => {
                callback({
                    status: "failed",
                    error: { code: 9020, message: "ItemNotFound", name: "Internal Error" },
                    value: "",
                });
            },
        } as unknown as Office.MessageRead;

        const officeMock: Record<string, unknown> = {
            context: { mailbox: { item } },
            AsyncResultStatus: { Succeeded: "succeeded" },
        };
        vi.stubGlobal("Office", officeMock);

        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeadersAPI.send({ onStatus, onError });

        expect(onError).toHaveBeenCalledWith(
            expect.any(Object),
            "Office API header request failed (9020: ItemNotFound).",
            true
        );
    });
});