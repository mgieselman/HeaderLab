import  "../matchers/stacksEqual";

import { errors } from "./Errors";
import { Stack } from "./Stack";

function testParse(exception: unknown, message: string | null, expectedEventName: string, expectedStack: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        Stack.parse(exception, message, function (eventName, stack) {
            try {
                expect(eventName).toBe(expectedEventName);
                expect(stack).stacksEqual(expectedStack);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

describe("errors.parse Tests", () => {
    beforeAll(() => { Stack.options.offline = true; });

    test("stringError", () => {
        return testParse("stringError", "message", "message : stringError", [
            "testParse (src\\Scripts\\services\\Errors.test.ts)"
        ]);
    });

    test("notAFunction", async () => {
        try {
            // @ts-expect-error Intentional error to test error handling
            document.notAFunction();
        }
        catch (error) {
            await testParse(error, null, "document.notAFunction is not a function", []);
            return;
        }
        throw new Error("Expected error to be thrown");
    });

    test("Throw integer", () => {
        try {
            throw 42;
        }
        catch (error) {
            return testParse(error, "message", "message : 42", [
                "testParse (src\\Scripts\\services\\Errors.test.ts)"
            ]);
        }
    });

    test("Throw array", () => {
        try {
            throw { one: 1, two: 2, three: "three" };
        }
        catch (error) {
            return testParse(error, null,
                "{\n" +
                "  \"one\": 1,\n" +
                "  \"two\": 2,\n" +
                "  \"three\": \"three\"\n" +
                "}",
                [
                    "testParse (src\\Scripts\\services\\Errors.test.ts)"
                ]);
        }
    });

    test("Throw null", () => {
        try {
            throw null;
        }
        catch (error) {
            return testParse(error, null, "Unknown exception", [
                "testParse (src\\Scripts\\services\\Errors.test.ts)"
            ]);
        }
    });

    test("null error and string message", () => {
        return testParse(null, "message", "message", [
            "testParse (src\\Scripts\\services\\Errors.test.ts)"
        ]);
    });

    test("null error and null message", () => {
        return testParse(null, null, "Unknown exception", [
            "testParse (src\\Scripts\\services\\Errors.test.ts)"
        ]);
    });

    test("new Error()", () => {
        const brokenError = new Error();
        return testParse(brokenError, null, "Unknown exception", []);
    });

    test("integer error and string message", () => {
        return testParse(42, "message", "message : 42", [
            "testParse (src\\Scripts\\services\\Errors.test.ts)"
        ]);
    });
});

describe("getError* Tests", () => {
    test("notAFunction error", () => {
        try {
            // @ts-expect-error Intentional error to test error handling
            document.notAFunction();
        }
        catch (error) {
            expect(errors.getErrorMessage(error)).toEqual("document.notAFunction is not a function");
            expect(errors.getErrorStack(error).length).toBeGreaterThan(0);
        }
    });

    test("string thrown as error", () => {
        try { throw "string"; }
        catch (error) {
            expect(errors.getErrorMessage(error)).toEqual("string");
            expect(errors.getErrorStack(error)).toEqual("string thrown as error");
        }
    });

    test("number thrown as error", () => {
        try { throw 42; }
        catch (error) {
            expect(errors.getErrorMessage(error)).toEqual("42");
            expect(errors.getErrorStack(error)).toEqual("number thrown as error");
        }
    });

    test("object thrown as error", () => {
        try { throw { one: 1, two: 2, three: "three" }; }
        catch (error) {
            expect(errors.getErrorMessage(error)).toEqual("{\n  \"one\": 1,\n  \"two\": 2,\n  \"three\": \"three\"\n}");
            expect(errors.getErrorStack(error).length).toBe(0);
        }
    });

    test("null error message", () => { expect(errors.getErrorMessage(null)).toBe(""); });
    test("null errorstack", () => { expect(errors.getErrorStack(null)).toBe(""); });
    test("string error message", () => { expect(errors.getErrorMessage("stringError")).toBe("stringError"); });
    test("string errorstack", () => { expect(errors.getErrorStack("stringError")).toBe("string thrown as error"); });
    test("42 error message", () => { expect(errors.getErrorMessage(42)).toBe("42"); });
    test("42 errorstack", () => { expect(errors.getErrorStack(42)).toBe("number thrown as error"); });
});

describe("isError Tests", () => {
    // @ts-expect-error Intentional error to test error handling
    test("notAFunction is error", () => { try { document.notAFunction(); } catch (error) { expect(errors.isError(error)).toBeTruthy(); } });
    test("null is not error", () => { try { throw null; } catch (error) { expect(errors.isError(error)).toBeFalsy(); } });
    test("string is not error", () => { try { throw "string"; } catch (error) { expect(errors.isError(error)).toBeFalsy(); } });
    test("number is not error", () => { try { throw 42; } catch (error) { expect(errors.isError(error)).toBeFalsy(); } });
    test("string value is not error", () => { expect(errors.isError("string")).toBeFalsy(); });
    test("number value is not error", () => { expect(errors.isError(42)).toBeFalsy(); });
    test("null value is not error", () => { expect(errors.isError(null)).toBeFalsy(); });
});
