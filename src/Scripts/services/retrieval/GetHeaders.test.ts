import { GetHeaders } from "./GetHeaders";
import { GetHeadersAPI } from "./GetHeadersAPI";

describe("GetHeaders.send", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("loads headers from API when available", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("Received: test");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).toHaveBeenCalledWith("Received: test", "API");
        expect(onError).not.toHaveBeenCalled();
    });

    test("calls onError when no item is selected", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(false);
        const apiSpy = vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(apiSpy).not.toHaveBeenCalled();
        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(null, "No item selected", true);
    });

    test("calls onError when permissions are insufficient", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(false);
        const apiSpy = vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(apiSpy).not.toHaveBeenCalled();
        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(null, "Insufficient permissions to request headers", false);
    });

    test("calls onError when API returns empty headers without a detailed error", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(null, "Failed to retrieve headers.", true);
    });

    test("does not overwrite detailed API error with generic retrieval message", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockImplementation(async (callbacks) => {
            callbacks.onError(new Error("test"), "Office API header request failed.");
            return "";
        });

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), "Office API header request failed.", undefined);
        expect(onError).not.toHaveBeenCalledWith(null, "Failed to retrieve headers.", true);
    });
});
