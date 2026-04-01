/**
 * @jest-environment jsdom
 */

import { diagnostics } from "./Diagnostics";
import { Errors } from "./Errors";
import { ParentFrameUtils } from "./ParentFrameUtils";

// Mock the Office context for testing
interface MockOfficeContext {
    context: {
        mailbox: {
            diagnostics: {
                hostName: string;
            };
        };
    };
}

// Extend global with Office property (optional)
interface Global {
    Office?: MockOfficeContext;
}

// Mock dependencies
jest.mock("./Diagnostics");
jest.mock("./Errors");

const mockDiagnostics = diagnostics as jest.Mocked<typeof diagnostics>;
const mockErrors = Errors as jest.Mocked<typeof Errors>;

describe("ParentFrameUtils", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset global Office mock
        (global as unknown as Global).Office = {
            context: {
                mailbox: {
                    diagnostics: {
                        hostName: "TestHost"
                    }
                }
            }
        };
    });

    afterEach(() => {
        delete (global as unknown as Global).Office;
    });

    describe("getQueryVariable", () => {
        test("returns parameter value when found", () => {
            const search = "?param1=value1&param2=value2&param3=value3";
            expect(ParentFrameUtils.getQueryVariable("param2", search)).toBe("value2");
        });

        test("returns first occurrence when parameter appears multiple times", () => {
            const search = "?param1=first&param1=second";
            expect(ParentFrameUtils.getQueryVariable("param1", search)).toBe("first");
        });

        test("returns empty string when parameter not found", () => {
            const search = "?param1=value1&param2=value2";
            expect(ParentFrameUtils.getQueryVariable("param3", search)).toBe("");
        });

        test("returns empty string when parameter has no value", () => {
            const search = "?param1=&param2=value2";
            expect(ParentFrameUtils.getQueryVariable("param1", search)).toBe("");
        });

        test("handles empty search string", () => {
            expect(ParentFrameUtils.getQueryVariable("param1", "")).toBe("");
        });

        test("handles search string without parameters", () => {
            expect(ParentFrameUtils.getQueryVariable("param1", "?")).toBe("");
        });

        test("handles URL encoded values", () => {
            const search = "?message=Hello%20World&encoded=test%2Bvalue";
            expect(ParentFrameUtils.getQueryVariable("message", search)).toBe("Hello%20World");
            expect(ParentFrameUtils.getQueryVariable("encoded", search)).toBe("test%2Bvalue");
        });

        test("handles complex parameter names", () => {
            const search = "?data-value=test&special_param=value&param-with-dashes=result";
            expect(ParentFrameUtils.getQueryVariable("data-value", search)).toBe("test");
            expect(ParentFrameUtils.getQueryVariable("special_param", search)).toBe("value");
            expect(ParentFrameUtils.getQueryVariable("param-with-dashes", search)).toBe("result");
        });
    });

    describe("getSettingsKey", () => {
        test("returns key with host name when Office context available", () => {
            expect(ParentFrameUtils.getSettingsKey()).toBe("frameTestHost");
        });

        test("returns default key when Office context throws error", () => {
            (global as unknown as { Office: MockOfficeContext }).Office = {
                context: {
                    mailbox: {
                        diagnostics: {
                            get hostName(): string {
                                throw new Error("Access denied");
                            }
                        }
                    }
                }
            };

            expect(ParentFrameUtils.getSettingsKey()).toBe("frame");
        });

        test("returns default key when Office context is undefined", () => {
            delete (global as unknown as { Office?: MockOfficeContext }).Office;
            expect(ParentFrameUtils.getSettingsKey()).toBe("frame");
        });
    });

    describe("getDiagnosticsString", () => {
        test("formats diagnostics and errors correctly", () => {
            mockDiagnostics.get.mockReturnValue({
                "apiUsed": "REST",
                "host": "Outlook",
                "version": "1.0"
            });
            mockErrors.get.mockReturnValue([
                "Connection failed",
                "Timeout occurred"
            ]);

            const result = ParentFrameUtils.getDiagnosticsString();

            expect(result).toContain("apiUsed = REST\n");
            expect(result).toContain("host = Outlook\n");
            expect(result).toContain("version = 1.0\n");
            expect(result).toContain("ERROR: Connection failed\n");
            expect(result).toContain("ERROR: Timeout occurred\n");
        });

        test("handles diagnostics retrieval failure", () => {
            mockDiagnostics.get.mockImplementation(() => {
                throw new Error("Diagnostics unavailable");
            });
            mockErrors.get.mockReturnValue([]);

            const result = ParentFrameUtils.getDiagnosticsString();
            expect(result).toContain("ERROR: Failed to get diagnostics\n");
        });

        test("handles empty diagnostics and errors", () => {
            mockDiagnostics.get.mockReturnValue({});
            mockErrors.get.mockReturnValue([]);

            const result = ParentFrameUtils.getDiagnosticsString();
            expect(result).toBe("");
        });

        test("handles null/undefined values in diagnostics", () => {
            mockDiagnostics.get.mockReturnValue({
                "validKey": "ValidValue",
                "nullKey": null as unknown as string,
                "undefinedKey": undefined as unknown as string
            });
            mockErrors.get.mockReturnValue([]);

            const result = ParentFrameUtils.getDiagnosticsString();
            expect(result).toContain("validKey = ValidValue\n");
            expect(result).toContain("nullKey = null\n");
            expect(result).toContain("undefinedKey = undefined\n");
        });
    });
});
