import { expect } from "vitest";

// Strip stack of rows with vitest.
// Used to normalize cross environment differences strictly for testing purposes
// Real stacks sent up will contain cross browser quirks
function cleanStack(stack: string[]) {
    if (!stack) return null;
    return stack.map(function (item: string): string {
        return item
            .replace(/\(.*[/\\](?=src[/\\]Scripts[/\\])/, "(") // Strip path prefix inside parens up to src/Scripts (any platform)
            .replace(/\//g, "\\") // Normalize forward slashes to backslashes
            .replace(/Function\.get \[as parse\]/, "Function.parse") // normalize function name
            .replace(/.*(?:jest|vitest).*/, "") // Don't care about jest/vitest internals
            .replace(/.*node:internal.*/, "") // Don't care about node internals (vary by version)
            .replace(/:\d+:\d*\)/, ")") // remove column and line # since they may vary
        ;
    }).filter(function (item: string): boolean {
        return !!item;
    });
}

export function stacksEqual(this: { equals: (a: unknown, b: unknown) => boolean }, actualUnknown: unknown, expected: string[]) {
        const actual = actualUnknown as string[];
        let passed = true;
        const messages: string[] = [];

        const actualStack = cleanStack(actual);
        const expectedStack = cleanStack(expected);

        if (actualStack === undefined || actualStack === null) {
            passed = false;
            messages.push("actual is undefined");
        } else if (expectedStack === undefined || expectedStack === null) {
            passed = false;
            messages.push("expected is undefined");
        }
        else {
            passed = this.equals(actualStack, expectedStack);
            if (!passed) {
                messages.push("Stacks do not match");
                messages.push("Actual stack:");
                actualStack.forEach((actualItem) => { messages.push("\t" + actualItem); });
                messages.push("Expected stack:");
                expectedStack.forEach((expectedItem) => { messages.push("\t" + expectedItem); });
            }
        }

        return {
            pass: passed,
            message: () => messages.join("\n"),
        };
    };

expect.extend({ stacksEqual, });

declare module "vitest" {
    interface Assertion<T> {
        stacksEqual(expected: string[]): T;
    }
}