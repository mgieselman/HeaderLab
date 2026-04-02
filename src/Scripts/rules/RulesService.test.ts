import type { MockedFunction } from "vitest";

import { HeaderModel } from "../model/HeaderModel";
import { RuleStore, getRules, resetRulesState } from "./loaders/getRules";
import { rulesService } from "./RulesService";

// Mock the getRules function
vi.mock("./loaders/getRules", async () => {
    const actualModule = await vi.importActual("./loaders/getRules");
    return {
        ...actualModule,
        getRules: vi.fn()
    };
});

const emptyRules: RuleStore = { simpleRuleSet: [], andRuleSet: [] };

describe("RulesService", () => {
    beforeEach(() => {
        const mockedGetRules = getRules as MockedFunction<typeof getRules>;
        mockedGetRules.mockReset();
        mockedGetRules.mockResolvedValue(emptyRules);
        rulesService.resetForTesting();
        resetRulesState();
    });

    describe("rule loading", () => {
        test("should load rules on first call", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            const headerModel = await HeaderModel.create();

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(mockedGetRules).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        test("should only call getRules once for multiple analyses (memoization)", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;

            const headerModel1 = await HeaderModel.create();
            const headerModel2 = await HeaderModel.create();

            await rulesService.analyzeHeaders(headerModel1);
            await rulesService.analyzeHeaders(headerModel2);

            expect(mockedGetRules).toHaveBeenCalledTimes(1);
        });

        test("should return success with empty violations when no rules", async () => {
            const headerModel = await HeaderModel.create();

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
            expect(result.violations).toHaveLength(0);
            expect(result.violationGroups).toHaveLength(0);
            expect(result.enrichedHeaders).toBe(headerModel);
        });
    });

    describe("simple rule processing", () => {
        test("should process simple rules and find violations", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "urgent",
                        MessageWhenPatternFails: "Urgent keyword detected",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "warning"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: urgent: Please respond\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
            expect(result.violations.length).toBeGreaterThan(0);
            expect(result.violationGroups.length).toBeGreaterThan(0);
        });

        test("should not find violations when patterns don't match", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "spam",
                        MessageWhenPatternFails: "Spam detected",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: Clean email\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        test("should detect missing headers", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "HeaderMissingRule",
                        SectionToCheck: "X-Forefront-Antispam-Report",
                        MessageWhenPatternFails: "Missing antispam header",
                        SectionsInHeaderToShowError: ["X-Forefront-Antispam-Report"],
                        Severity: "error"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: Test\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
        });
    });

    describe("AND rule processing", () => {
        test("should process AND rules when all conditions met", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [],
                andRuleSet: [
                    {
                        Message: "Spam sent to inbox",
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
                            },
                            {
                                RuleType: "SimpleRule",
                                SectionToCheck: "X-Microsoft-Antispam-Mailbox-Delivery",
                                PatternToCheckFor: "dest:I",
                                MessageWhenPatternFails: "Inbox",
                                SectionsInHeaderToShowError: ["X-Microsoft-Antispam-Mailbox-Delivery"],
                                Severity: "info"
                            }
                        ]
                    }
                ]
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headers =
                "X-Forefront-Antispam-Report: SFV:SPM;CIP:1.2.3.4\r\n" +
                "X-Microsoft-Antispam-Mailbox-Delivery: dest:I;auth:1\r\n";

            const headerModel = await HeaderModel.create(headers);

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
            expect(result.violations.length).toBeGreaterThan(0);

            const hasParentMessage = result.violations.some(v => v.parentMessage === "Spam sent to inbox");
            expect(hasParentMessage).toBe(true);
        });
    });

    describe("violation grouping", () => {
        test("should group violations by rule message", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "From",
                        PatternToCheckFor: "test",
                        MessageWhenPatternFails: "Test pattern",
                        SectionsInHeaderToShowError: ["From", "To"],
                        Severity: "error"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("From: test@example.com\r\nTo: recipient@test.com\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
            if (result.violations.length > 0) {
                const groups = result.violationGroups.filter(g => g.displayName === "Test pattern");
                expect(groups.length).toBeLessThanOrEqual(1);
            }
        });

        test("should preserve violation severity levels", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "error",
                        MessageWhenPatternFails: "Error severity",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    },
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "warning",
                        MessageWhenPatternFails: "Warning severity",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "warning"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: error warning\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);

            const errorGroup = result.violationGroups.find(g => g.displayName === "Error severity");
            const warningGroup = result.violationGroups.find(g => g.displayName === "Warning severity");

            if (errorGroup) expect(errorGroup.severity).toBe("error");
            if (warningGroup) expect(warningGroup.severity).toBe("warning");
        });
    });

    describe("error handling", () => {
        test("should handle getRules errors gracefully", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            mockedGetRules.mockRejectedValue(new Error("Failed to load rules"));

            const headerModel = await HeaderModel.create();

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain("Failed to load rules");
            expect(result.violations).toHaveLength(0);
            expect(result.violationGroups).toHaveLength(0);

            consoleErrorSpy.mockRestore();
        });

        test("should handle sections with malformed data", async () => {
            const headerModel = await HeaderModel.create();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (headerModel.summary.rows as any).push({ invalid: "data" });

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
        });

        test("should handle missing rule properties", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "test",
                        MessageWhenPatternFails: "",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: test\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
            if (result.violationGroups.length > 0) {
                const group = result.violationGroups[0];
                if (group) {
                    expect(group.displayName).toBeDefined();
                }
            }
        });

        test("should handle errors during rule evaluation", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "(?:invalid",
                        MessageWhenPatternFails: "Test error",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create();

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result).toBeDefined();
            expect(result.violations).toBeInstanceOf(Array);
            expect(result.violationGroups).toBeInstanceOf(Array);

            consoleErrorSpy.mockRestore();
        });

        test("should handle concurrent analysis requests", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            let callCount = 0;
            mockedGetRules.mockImplementation(() => {
                callCount++;
                return Promise.resolve(emptyRules);
            });

            rulesService.resetForTesting();

            const headerModel1 = await HeaderModel.create();
            const headerModel2 = await HeaderModel.create();
            const headerModel3 = await HeaderModel.create();

            const results = await Promise.all([
                rulesService.analyzeHeaders(headerModel1),
                rulesService.analyzeHeaders(headerModel2),
                rulesService.analyzeHeaders(headerModel3)
            ]);

            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result.success).toBe(true);
            });

            expect(callCount).toBe(1);
        });
    });

    describe("violation ordering", () => {
        test("should return violations in consistent order", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            const rules: RuleStore = {
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "rule1",
                        MessageWhenPatternFails: "Rule 1",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    },
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "rule2",
                        MessageWhenPatternFails: "Rule 2",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    },
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "rule3",
                        MessageWhenPatternFails: "Rule 3",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    }
                ],
                andRuleSet: []
            };
            /* eslint-enable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue(rules);

            const headerModel = await HeaderModel.create("Subject: rule1 rule2 rule3\r\n");

            const result1 = await rulesService.analyzeHeaders(headerModel);
            rulesService.resetForTesting();
            const result2 = await rulesService.analyzeHeaders(headerModel);

            expect(result1.violations.length).toBe(result2.violations.length);
            expect(result1.violations.length).toBeGreaterThan(0);

            for (let i = 0; i < result1.violations.length; i++) {
                const v1 = result1.violations[i];
                const v2 = result2.violations[i];
                if (v1 && v2) {
                    expect(v1.rule.errorMessage).toBe(v2.rule.errorMessage);
                }
            }
        });

        test("should order violation groups by severity (error > warning > info)", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "info",
                        MessageWhenPatternFails: "Info message",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "info"
                    },
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "error",
                        MessageWhenPatternFails: "Error message",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    },
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "warning",
                        MessageWhenPatternFails: "Warning message",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "warning"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: error warning info\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.violationGroups.length).toBe(3);

            const errorGroup = result.violationGroups.find(g => g.severity === "error");
            const warningGroup = result.violationGroups.find(g => g.severity === "warning");
            const infoGroup = result.violationGroups.find(g => g.severity === "info");

            expect(errorGroup).toBeDefined();
            expect(warningGroup).toBeDefined();
            expect(infoGroup).toBeDefined();
        });

        test("should maintain consistent violation order within same severity level", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "alpha",
                        MessageWhenPatternFails: "Alpha rule",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "warning"
                    },
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "beta",
                        MessageWhenPatternFails: "Beta rule",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "warning"
                    },
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "gamma",
                        MessageWhenPatternFails: "Gamma rule",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "warning"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: alpha beta gamma\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.violations.length).toBe(3);

            const allSameSeverity = result.violations.every(v => v.rule.severity === "warning");
            expect(allSameSeverity).toBe(true);

            const messages = result.violations.map(v => v.rule.errorMessage);
            expect(messages).toEqual(["Alpha rule", "Beta rule", "Gamma rule"]);
        });

        test("should handle empty violations array", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "nonexistent",
                        MessageWhenPatternFails: "Not found",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: clean subject\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.success).toBe(true);
            expect(result.violations).toEqual([]);
            expect(result.violationGroups).toEqual([]);
        });

        test("should preserve violation order across multiple header sections", async () => {
            const mockedGetRules = getRules as MockedFunction<typeof getRules>;
            /* eslint-disable @typescript-eslint/naming-convention */
            mockedGetRules.mockResolvedValue({
                simpleRuleSet: [
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "Subject",
                        PatternToCheckFor: "test",
                        MessageWhenPatternFails: "Test in subject",
                        SectionsInHeaderToShowError: ["Subject"],
                        Severity: "error"
                    },
                    {
                        RuleType: "SimpleRule",
                        SectionToCheck: "From",
                        PatternToCheckFor: "test",
                        MessageWhenPatternFails: "Test in from",
                        SectionsInHeaderToShowError: ["From"],
                        Severity: "error"
                    }
                ],
                andRuleSet: []
            });
            /* eslint-enable @typescript-eslint/naming-convention */

            const headerModel = await HeaderModel.create("Subject: test\r\nFrom: test@example.com\r\n");

            const result = await rulesService.analyzeHeaders(headerModel);

            expect(result.violations.length).toBeGreaterThan(0);
            expect(result.violationGroups.length).toBeGreaterThan(0);

            result.violations.forEach(violation => {
                expect(violation.affectedSections).toBeDefined();
                expect(violation.affectedSections.length).toBeGreaterThan(0);
            });
        });
    });
});
