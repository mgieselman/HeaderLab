import { GetHeaders } from "./GetHeaders";
import { GetHeadersAPI } from "./GetHeadersAPI";
import { GetHeadersGraph } from "./GetHeadersGraph";
import { diagnostics } from "../Diagnostics";

describe("GetHeaders.send", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("calls onError when API and Graph return empty headers", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("");
        vi.spyOn(GetHeadersGraph, "send").mockResolvedValue("");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(null, "Failed to retrieve headers.", true);
    });

    test("loads headers from API when available", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("Received: test");
        const graphSpy = vi.spyOn(GetHeadersGraph, "send").mockResolvedValue("");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).toHaveBeenCalledWith("Received: test", "API");
        expect(graphSpy).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    test("does not overwrite detailed Graph error with generic retrieval message", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("");
        vi.spyOn(GetHeadersGraph, "send").mockImplementation(async (callbacks) => {
            callbacks.onError(null, "Message not located.", true);
            return "";
        });

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(null, "Message not located.", true);
        expect(onError).not.toHaveBeenCalledWith(null, "Failed to retrieve headers.", true);
    });

    test("does not overwrite detailed API error with generic retrieval message", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersGraph, "canUseGraph").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockImplementation(async (callbacks) => {
            callbacks.onError(new Error("test"), "Office API header request failed.");
            return "";
        });
        vi.spyOn(GetHeadersGraph, "send").mockResolvedValue("");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(expect.any(Error), "Office API header request failed.", undefined);
    });

    test("adds Graph fallback reason when API request fails and Graph is unavailable", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersGraph, "canUseGraph").mockReturnValue(false);
        vi.spyOn(diagnostics, "get").mockReturnValue({ "noGraphReason": "NestedAppAuth 1.1 not supported" });
        vi.spyOn(GetHeadersAPI, "send").mockImplementation(async (callbacks) => {
            callbacks.onError(new Error("test"), "Office API header request failed.", true);
            return "";
        });
        vi.spyOn(GetHeadersGraph, "send").mockResolvedValue("");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(
            expect.any(Error),
            "Office API header request failed. Graph fallback unavailable: NestedAppAuth 1.1 not supported.",
            true
        );
    });

    test("does not surface API error when Graph fallback succeeds", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockImplementation(async (callbacks) => {
            callbacks.onError(new Error("test"), "Office API header request failed.", true);
            return "";
        });
        vi.spyOn(GetHeadersGraph, "send").mockResolvedValue("Received: from graph");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).toHaveBeenCalledWith("Received: from graph", "Graph");
        expect(onError).not.toHaveBeenCalled();
    });

    test("does not overwrite Graph auth token error with generic retrieval message", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("");
        vi.spyOn(GetHeadersGraph, "send").mockImplementation(async (callbacks) => {
            callbacks.onError(null, "Unable to retrieve auth token for header request.", true);
            return "";
        });

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(null, "Unable to retrieve auth token for header request.", true);
        expect(onError).not.toHaveBeenCalledWith(null, "Failed to retrieve headers.", true);
    });

    test("falls back to Graph when API returns empty", async () => {
        vi.spyOn(GetHeaders, "validItem").mockReturnValue(true);
        vi.spyOn(GetHeaders, "sufficientPermission").mockReturnValue(true);
        vi.spyOn(GetHeadersAPI, "send").mockResolvedValue("");
        vi.spyOn(GetHeadersGraph, "send").mockResolvedValue("Received: from graph");

        const headersLoadedCallback = vi.fn();
        const onStatus = vi.fn();
        const onError = vi.fn();

        await GetHeaders.send(headersLoadedCallback, { onStatus, onError });

        expect(headersLoadedCallback).toHaveBeenCalledWith("Received: from graph", "Graph");
        expect(onError).not.toHaveBeenCalled();
    });
});
