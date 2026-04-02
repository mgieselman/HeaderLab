import { expect } from "vitest";

import { DateWithNum } from "../core/DateWithNum";
import { ReceivedRow } from "../row/ReceivedRow";

export function datesEqual(this: { equals: (a: unknown, b: unknown) => boolean }, actualUnknown: unknown, expected: DateWithNum) {
    const actual = actualUnknown as ReceivedRow;
    let passed = true;
    const messages: string[] = [];

    if (actual.date === undefined) {
        passed = false;
        messages.push("date is undefined");
    } else {
        const date = new Date(actual.date.value ?? "");
        const dateStr = date.toLocaleString("en-US", { timeZone: "America/New_York" });
        if (dateStr !== expected.date) {
            passed = false;
            messages.push(`date: ${dateStr} !== ${expected.date}`);
        }

        const dateNum = actual.dateNum.toString();
        if (dateNum !== expected.dateNum.toString()) {
            passed = false;
            messages.push(`dateNum: ${dateNum} !== ${expected.dateNum}`);
        }
    }

    return {
        pass: passed,
        message: () => messages.join("; "),
    };
};

expect.extend({ datesEqual, });

declare module "vitest" {
    interface Assertion<T> {
        datesEqual(expected: DateWithNum ): T;
    }
}