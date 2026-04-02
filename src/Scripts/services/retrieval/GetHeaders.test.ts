import { GetHeaders } from "./GetHeaders";
import { GetHeadersAPI } from "./GetHeadersAPI";
import { GetHeadersGraph } from "./GetHeadersGraph";

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
});
