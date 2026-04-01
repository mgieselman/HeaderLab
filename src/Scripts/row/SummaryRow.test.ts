import { SummaryRow } from "./SummaryRow";
import { Strings } from "../core/Strings";

// Mock the Strings methods
jest.mock("../core/Strings", () => ({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Strings: {
        mapHeaderToURL: jest.fn(),
        mapValueToURL: jest.fn()
    }
}));

describe("SummaryRow", () => {
    beforeEach(() => {
        (Strings.mapHeaderToURL as jest.Mock).mockClear();
        (Strings.mapValueToURL as jest.Mock).mockClear();
    });

    it("should call Strings.mapHeaderToURL with correct parameters", () => {
        const header = "testHeader";
        const label = "testLabel";
        const url = "testURL";

        (Strings.mapHeaderToURL as jest.Mock).mockReturnValue(url);

        const summaryRow = new SummaryRow(header, label);

        expect(Strings.mapHeaderToURL).toHaveBeenCalledWith(header, label);
        expect(summaryRow.url).toBe(url);
    });

    it("should set the url property correctly", () => {
        const header = "anotherHeader";
        const label = "anotherLabel";
        const url = "anotherURL";

        (Strings.mapHeaderToURL as jest.Mock).mockReturnValue(url);

        const summaryRow = new SummaryRow(header, label);

        expect(summaryRow.url).toBe(url);
    });

    it("should return value without postFix when no options provided", () => {
        (Strings.mapHeaderToURL as jest.Mock).mockReturnValue("");
        const row = new SummaryRow("header", "label");
        row.value = "test";
        expect(row.value).toBe("test");
        expect(row.postFix).toBeUndefined();
    });

    describe("with valueUrlMapper option", () => {
        it("should set url using Strings.mapHeaderToURL", () => {
            (Strings.mapHeaderToURL as jest.Mock).mockReturnValue("mockedHeaderURL");
            (Strings.mapValueToURL as jest.Mock).mockReturnValue("mockedValueURL");

            const row = new SummaryRow("testHeader", "testLabel", {
                valueUrlMapper: Strings.mapValueToURL
            });

            expect(Strings.mapHeaderToURL).toHaveBeenCalledWith("testHeader", "testLabel");
            expect(row.url).toBe("mockedHeaderURL");
        });

        it("should return valueUrl using the provided mapper", () => {
            (Strings.mapHeaderToURL as jest.Mock).mockReturnValue("mockedHeaderURL");
            (Strings.mapValueToURL as jest.Mock).mockReturnValue("mockedValueURL");

            const row = new SummaryRow("testHeader", "testLabel", {
                valueUrlMapper: Strings.mapValueToURL
            });
            row["valueInternal"] = "internalValue";

            expect(row.valueUrl).toBe("mockedValueURL");
            expect(Strings.mapValueToURL).toHaveBeenCalledWith("internalValue");
        });
    });

    describe("with postFix option", () => {
        it("should initialize postFix to the provided value", () => {
            (Strings.mapHeaderToURL as jest.Mock).mockReturnValue("");
            const row = new SummaryRow("header", "label", { postFix: "" });
            expect(row.postFix).toBe("");
        });

        it("should initialize url using Strings.mapHeaderToURL", () => {
            (Strings.mapHeaderToURL as jest.Mock).mockReturnValue("url-for-header-label");
            const row = new SummaryRow("header", "label", { postFix: "" });
            expect(Strings.mapHeaderToURL).toHaveBeenCalledWith("header", "label");
            expect(row.url).toBe("url-for-header-label");
        });

        it("should append postFix to value", () => {
            (Strings.mapHeaderToURL as jest.Mock).mockReturnValue("");
            const row = new SummaryRow("header", "label", { postFix: "" });
            row["valueInternal"] = "internalValue";
            row.postFix = "PostFix";
            expect(row.value).toBe("internalValuePostFix");
        });

        it("should set value correctly", () => {
            (Strings.mapHeaderToURL as jest.Mock).mockReturnValue("");
            const row = new SummaryRow("header", "label", { postFix: "" });
            row.value = "newValue";
            expect(row["valueInternal"]).toBe("newValue");
        });
    });
});
