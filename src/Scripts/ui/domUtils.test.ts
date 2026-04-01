/**
 * @jest-environment jsdom
 */

import { DomUtils } from "./domUtils";

describe("DomUtils", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    describe("getElement", () => {
        test("returns element when found", () => {
            document.body.innerHTML = "<div id=\"elem\">content</div>";
            expect(DomUtils.getElement("#elem")?.textContent).toBe("content");
        });

        test("returns null when not found", () => {
            expect(DomUtils.getElement("#missing")).toBeNull();
        });
    });

    describe("setText", () => {
        test("sets text content", () => {
            document.body.innerHTML = "<div id=\"target\"></div>";
            DomUtils.setText("#target", "hello");
            expect(document.getElementById("target")?.textContent).toBe("hello");
        });

        test("handles missing element", () => {
            expect(() => DomUtils.setText("#missing", "text")).not.toThrow();
        });
    });

    describe("showElement", () => {
        test("sets display to block", () => {
            document.body.innerHTML = "<div id=\"el\" style=\"display:none\"></div>";
            DomUtils.showElement("#el");
            expect((document.getElementById("el") as HTMLElement).style.display).toBe("block");
        });
    });

    describe("hideElement", () => {
        test("sets display to none", () => {
            document.body.innerHTML = "<div id=\"el\" style=\"display:block\"></div>";
            DomUtils.hideElement("#el");
            expect((document.getElementById("el") as HTMLElement).style.display).toBe("none");
        });
    });
});
