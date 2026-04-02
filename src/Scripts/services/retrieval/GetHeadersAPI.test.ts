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
        expect(onError).toHaveBeenCalledWith(expect.any(Error), "Office API header request failed.", true);
    });
});