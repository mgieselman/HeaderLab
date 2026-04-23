import { Insight } from "./Insight";
import { renderInsightList } from "./InsightList";

const insights: Insight[] = [
    { severity: "info", label: "Origin: US", category: "security" },
    { severity: "error", label: "DMARC fail", detail: "From address doesn't match", category: "auth" },
    { severity: "success", label: "TLS on all hops", category: "security" },
    { severity: "warning", label: "SCL 5", detail: "Sent to Junk by default", category: "spam" },
];

describe("renderInsightList", () => {
    test("renders one <li> per insight with severity class", () => {
        const list = renderInsightList(insights);
        expect(list.tagName).toBe("UL");
        expect(list.classList.contains("hl-insights")).toBe(true);

        const items = list.querySelectorAll("li");
        expect(items.length).toBe(4);
        for (const item of items) {
            expect(item.className).toMatch(/hl-insight hl-insight--(error|warning|success|info)/);
        }
    });

    test("sorts error first, then warning, success, info", () => {
        const list = renderInsightList(insights);
        const labels = Array.from(list.querySelectorAll(".hl-insight__label")).map((n) => n.textContent);
        expect(labels).toEqual(["DMARC fail", "SCL 5", "TLS on all hops", "Origin: US"]);
    });

    test("renders detail span when insight.detail is set", () => {
        const list = renderInsightList([
            { severity: "error", label: "DMARC fail", detail: "From mismatch", category: "auth" },
        ]);
        const detail = list.querySelector(".hl-insight__detail");
        expect(detail?.textContent).toBe(" — From mismatch");
    });

    test("omits detail span when insight.detail is absent", () => {
        const list = renderInsightList([
            { severity: "info", label: "bare", category: "security" },
        ]);
        expect(list.querySelector(".hl-insight__detail")).toBeNull();
    });

    test("applies filter predicate", () => {
        const list = renderInsightList(insights, (i) => i.category === "auth");
        const items = list.querySelectorAll("li");
        expect(items.length).toBe(1);
        expect(items[0]?.textContent).toContain("DMARC fail");
    });

    test("renders empty <ul> when all insights filtered out", () => {
        const list = renderInsightList(insights, () => false);
        expect(list.querySelectorAll("li").length).toBe(0);
    });
});
