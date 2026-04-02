import { expect } from "vitest";

import { receivedEqual } from "./receivedEqual";
import { ReceivedRow } from "../row/ReceivedRow";

async function arrayEqual(this: { equals: (a: unknown, b: unknown) => boolean }, actualUnknown: unknown, expected: { [index: string]: string }[]) {
    const actual = actualUnknown as ReceivedRow[];
    const messages: string[] = [];
    let passed = true;

    if (actual.length !== expected.length) {
        passed = false;
        messages.push("length = " + actual.length);
        messages.push("length = " + expected.length);
    }

    for (let i = 0; i < actual.length; i++) {
        const expectedValue = expected[i] as { [index: string]: string };
        const result = receivedEqual.call(this, actual[i], expectedValue);
        if (!result.pass) {
            passed = false;
            messages.push("[" + i + "]");
            messages.push(result.message());
        }
    }

    return {
        message: () => messages.join("\n"),
        pass: passed
    };
}

expect.extend({ arrayEqual, });

declare module "vitest" {
    interface Assertion<T> {
        arrayEqual(expected: { [index: string]: string }[] ): T;
    }
}