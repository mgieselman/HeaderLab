import { getRules, resetRulesState } from "./getRules";

// Mock fetch globally
global.fetch = jest.fn();

/* eslint-disable @typescript-eslint/naming-convention */
describe("getRules", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetRulesState();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("should load rules from JSON file successfully", async () => {
        const mockRulesResponse = {
            IsError: false,
            Message: "Rules loaded successfully",
            SimpleRules: [
                {
                    RuleType: "SimpleRule",
                    SectionToCheck: "Subject",
                    PatternToCheckFor: "spam",
                    MessageWhenPatternFails: "Spam detected",
                    SectionsInHeaderToShowError: ["Subject"],
                    Severity: "error"
                }
            ],
            AndRules: []
        };

        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockRulesResponse,
        } as Response);

        const rules = await getRules();

        expect(mockFetch).toHaveBeenCalledWith("/data/rules.json");
        expect(rules.simpleRuleSet).toHaveLength(1);
        expect(rules.simpleRuleSet[0]!.SectionToCheck).toBe("Subject");
    });

    test("should load AND rules from JSON file", async () => {
        const mockRulesResponse = {
            IsError: false,
            Message: "Rules loaded successfully",
            SimpleRules: [],
            AndRules: [
                {
                    Message: "Spam to inbox",
                    SectionsInHeaderToShowError: ["SFV"],
                    Severity: "error",
                    RulesToAnd: [
                        {
                            RuleType: "SimpleRule",
                            SectionToCheck: "X-Forefront-Antispam-Report",
                            PatternToCheckFor: "SFV:SPM",
                            MessageWhenPatternFails: "Spam",
                            SectionsInHeaderToShowError: ["SFV"],
                            Severity: "info"
                        }
                    ]
                }
            ]
        };

        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockRulesResponse,
        } as Response);

        const rules = await getRules();

        expect(rules.andRuleSet).toHaveLength(1);
        expect(rules.andRuleSet[0]!.Message).toBe("Spam to inbox");
    });

    test("should cache rules after first load", async () => {
        const mockRulesResponse = {
            IsError: false,
            Message: "Success",
            SimpleRules: [],
            AndRules: []
        };

        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockRulesResponse,
        } as Response);

        const rules1 = await getRules();
        const rules2 = await getRules();

        // Fetch called only once — second call uses cache
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(rules1).toBe(rules2);
    });

    test("should share in-flight request for concurrent calls", async () => {
        const mockRulesResponse = {
            IsError: false,
            Message: "Success",
            SimpleRules: [],
            AndRules: []
        };

        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockRulesResponse,
        } as Response);

        // Fire two concurrent calls
        const [rules1, rules2] = await Promise.all([getRules(), getRules()]);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(rules1).toBe(rules2);
    });

    describe("error handling", () => {
        test("should throw on network fetch failures", async () => {
            const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            await expect(getRules()).rejects.toThrow("Network error");
        });

        test("should throw on HTTP error responses", async () => {
            const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: "Not Found"
            } as Response);

            await expect(getRules()).rejects.toThrow("HTTP error! status: 404");
        });

        test("should throw on IsError response", async () => {
            const mockRulesResponse = {
                IsError: true,
                Message: "Server-side validation failed",
                SimpleRules: [],
                AndRules: []
            };

            const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRulesResponse,
            } as Response);

            await expect(getRules()).rejects.toThrow("Server-side validation failed");
        });

        test("should allow retry after failure", async () => {
            const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

            // First call fails
            mockFetch.mockRejectedValueOnce(new Error("Network error"));
            await expect(getRules()).rejects.toThrow("Network error");

            // Second call succeeds
            const mockRulesResponse = {
                IsError: false,
                Message: "Success",
                SimpleRules: [{ RuleType: "SimpleRule", SectionToCheck: "Subject", PatternToCheckFor: "test", MessageWhenPatternFails: "Test", SectionsInHeaderToShowError: ["Subject"], Severity: "error" }],
                AndRules: []
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRulesResponse,
            } as Response);

            const rules = await getRules();
            expect(rules.simpleRuleSet).toHaveLength(1);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        test("should handle invalid JSON responses", async () => {
            const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => {
                    throw new Error("Unexpected token < in JSON at position 0");
                }
            } as unknown as Response);

            await expect(getRules()).rejects.toThrow("Unexpected token");
        });

        test("should handle missing Message field in error response", async () => {
            const mockRulesResponse = {
                IsError: true,
                SimpleRules: [],
                AndRules: []
            };

            const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRulesResponse,
            } as Response);

            await expect(getRules()).rejects.toThrow("Failed to load rules");
        });
    });
});
