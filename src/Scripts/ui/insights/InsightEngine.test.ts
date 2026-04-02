import { TextDecoder, TextEncoder } from "util";

import { Insight } from "./Insight";
import { generateInsights } from "./InsightEngine";
import { HeaderModel } from "../../model/HeaderModel";

Object.assign(global, { TextDecoder, TextEncoder }); // eslint-disable-line @typescript-eslint/naming-convention

// Real-world spam message headers (SFV:SPM, SCL:5, CAT:SPM, BCL:0)
const spamHeaders = [
    "Received: from BY5PR04CA0017.namprd04.prod.outlook.com (2603:10b6:a03:1d0::27)",
    " by DS7PR06MB6790.namprd06.prod.outlook.com (2603:10b6:5:2ce::8) with",
    " Microsoft SMTP Server (version=TLS1_2,",
    " cipher=TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384) id 15.20.9769.17; Wed, 1 Apr",
    " 2026 14:05:52 +0000",
    "Received: from mail60.use2.acemsrvh.com (52.128.44.60) by",
    " CO1PEPF000066E8.mail.protection.outlook.com (10.167.249.6) with Microsoft",
    " SMTP Server (version=TLS1_3, cipher=TLS_AES_256_GCM_SHA384) id 15.20.9769.17",
    " via Frontend Transport; Wed, 1 Apr 2026 14:05:51 +0000",
    "Received: from service-8 (10.96.153.38)",
    "  by acems1.com (KumoMTA 10.96.112.98)",
    "  with ESMTPS (TLSv1_3:TLS13_AES_256_GCM_SHA384)  id e3a3b8582dd311f1a07502c82f9c3d17 for <matt@gieselman.com>;",
    "  Wed, 1 Apr 2026 14:05:50 +0000",
    "Authentication-Results: spf=pass (sender IP is 52.128.44.60)",
    " smtp.mailfrom=em-4103690.goodchoicelending.com; dkim=pass (signature was",
    " verified) header.d=goodchoicelending.com;dmarc=pass action=none",
    " header.from=goodchoicelending.com;compauth=pass reason=100",
    "Date: Wed, 1 Apr 2026 14:05:50 +0000 (GMT)",
    "From: Christian Burke <cburke@goodchoicelending.com>",
    "To: matt@gieselman.com",
    "Subject: LOC Updated Review - Gieselman Software",
    "X-Forefront-Antispam-Report:",
    " CIP:52.128.44.60;CTRY:US;LANG:en;SCL:5;SRV:;IPV:NLI;SFV:SPM;H:mail60.use2.acemsrvh.com;PTR:mail60.use2.acemsrvh.com;CAT:SPM;SFS:(13230040);DIR:INB;",
    "X-Microsoft-Antispam:",
    " BCL:0;",
    "X-Priority: 1",
].join("\r\n");

// Minimal clean message with auth pass
const cleanHeaders = [
    "Received: from mail.example.com (192.168.1.1) by mx.example.com with ESMTPS; Wed, 1 Apr 2026 14:05:50 +0000",
    "Authentication-Results: spf=pass; dkim=pass; dmarc=pass",
    "Date: Wed, 1 Apr 2026 14:05:50 +0000",
    "From: sender@example.com",
    "To: recipient@example.com",
    "Subject: Clean message",
    "X-Forefront-Antispam-Report: SCL:0;SFV:NSPM;CAT:NONE;DIR:INB;",
    "X-Microsoft-Antispam: BCL:0;",
].join("\r\n");

// Headers with auth failures
const authFailHeaders = [
    "Authentication-Results: spf=fail; dkim=fail (bad signature); dmarc=fail",
    "Date: Wed, 1 Apr 2026 14:05:50 +0000",
    "From: attacker@example.com",
    "Subject: Suspicious message",
].join("\r\n");

// Headers with high BCL (bulk)
const bulkHeaders = [
    "Date: Wed, 1 Apr 2026 14:05:50 +0000",
    "From: newsletter@bulk.com",
    "Subject: Newsletter",
    "X-Microsoft-Antispam: BCL:8;",
    "X-Forefront-Antispam-Report: SCL:1;SFV:NSPM;CAT:BULK;DIR:INB;",
].join("\r\n");

// Headers with unencrypted hop
const unencryptedHeaders = [
    "Received: from relay.example.com (10.0.0.1) by mx.example.com with SMTP; Wed, 1 Apr 2026 14:05:52 +0000",
    "Received: from sender.example.com (192.168.1.1) by relay.example.com with ESMTPS; Wed, 1 Apr 2026 14:05:50 +0000",
    "Date: Wed, 1 Apr 2026 14:05:50 +0000",
    "From: sender@example.com",
    "Subject: Mixed encryption",
].join("\r\n");

function findInsight(insights: Insight[], labelPattern: string | RegExp): Insight | undefined {
    if (typeof labelPattern === "string") {
        return insights.find(i => i.label.includes(labelPattern));
    }
    return insights.find(i => labelPattern.test(i.label));
}

describe("InsightEngine", () => {
    describe("authentication insights", () => {
        test("generates SPF/DKIM/DMARC pass insights from clean headers", async () => {
            const model = await HeaderModel.create(cleanHeaders);
            const insights = generateInsights(model);

            expect(findInsight(insights, "SPF pass")).toBeDefined();
            expect(findInsight(insights, "SPF pass")?.severity).toBe("success");
            expect(findInsight(insights, "DKIM pass")).toBeDefined();
            expect(findInsight(insights, "DMARC pass")).toBeDefined();
        });

        test("generates auth failure insights", async () => {
            const model = await HeaderModel.create(authFailHeaders);
            const insights = generateInsights(model);

            expect(findInsight(insights, "SPF fail")).toBeDefined();
            expect(findInsight(insights, "SPF fail")?.severity).toBe("error");
            expect(findInsight(insights, "DKIM fail")).toBeDefined();
            expect(findInsight(insights, "DKIM fail")?.severity).toBe("error");
            expect(findInsight(insights, "DMARC fail")).toBeDefined();
        });

        test("generates compauth insight from real spam headers", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            expect(findInsight(insights, "CompAuth")).toBeDefined();
            expect(findInsight(insights, "CompAuth")?.severity).toBe("success");
        });
    });

    describe("spam score insights", () => {
        test("generates SCL insight from spam headers", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            const scl = findInsight(insights, "SCL 5");
            expect(scl).toBeDefined();
            expect(scl?.severity).toBe("warning");
        });

        test("generates SCL 0 as success for clean headers", async () => {
            const model = await HeaderModel.create(cleanHeaders);
            const insights = generateInsights(model);

            const scl = findInsight(insights, "SCL 0");
            expect(scl).toBeDefined();
            expect(scl?.severity).toBe("success");
        });

        test("generates SFV:SPM insight for spam", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            expect(findInsight(insights, "Spam")).toBeDefined();
            expect(findInsight(insights, "Spam")?.severity).toBe("error");
        });

        test("generates SFV:NSPM insight for clean mail", async () => {
            const model = await HeaderModel.create(cleanHeaders);
            const insights = generateInsights(model);

            expect(findInsight(insights, "Not spam")).toBeDefined();
            expect(findInsight(insights, "Not spam")?.severity).toBe("success");
        });

        test("generates CAT insight", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            // CAT:SPM generates a "Spam" label from catDescription
            const catInsight = insights.find(i => i.category === "spam" && i.detail.includes("protection polic"));
            expect(catInsight).toBeDefined();
        });

        test("generates BCL warning for high bulk level", async () => {
            const model = await HeaderModel.create(bulkHeaders);
            const insights = generateInsights(model);

            const bcl = findInsight(insights, "BCL 8");
            expect(bcl).toBeDefined();
            expect(bcl?.severity).toBe("error");
        });

        test("generates bulk mail CAT insight", async () => {
            const model = await HeaderModel.create(bulkHeaders);
            const insights = generateInsights(model);

            expect(findInsight(insights, "Bulk mail")).toBeDefined();
        });
    });

    describe("delivery insights", () => {
        test("generates hop count insight", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            const hops = findInsight(insights, "hop");
            expect(hops).toBeDefined();
            expect(hops?.category).toBe("delivery");
        });

        test("generates transit time insight when available", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            const transit = findInsight(insights, "Transit");
            expect(transit).toBeDefined();
            expect(transit?.category).toBe("delivery");
        });
    });

    describe("security insights", () => {
        test("generates country of origin insight", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            const ctry = findInsight(insights, "Origin: US");
            expect(ctry).toBeDefined();
            expect(ctry?.severity).toBe("info");
        });

        test("generates directionality insight", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            expect(findInsight(insights, "INB")).toBeDefined();
        });

        test("generates connecting IP insight", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            const ip = findInsight(insights, "IP:");
            expect(ip).toBeDefined();
            expect(ip?.detail).toContain("52.128.44.60");
        });

        test("generates TLS insight for all-encrypted hops", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            const tls = findInsight(insights, "encrypted");
            expect(tls).toBeDefined();
            expect(tls?.severity).toBe("success");
        });

        test("generates warning for mixed encryption hops", async () => {
            const model = await HeaderModel.create(unencryptedHeaders);
            const insights = generateInsights(model);

            const tls = findInsight(insights, "unencrypted");
            expect(tls).toBeDefined();
            expect(tls?.severity).toBe("warning");
        });
    });

    describe("priority insights", () => {
        test("generates high priority insight", async () => {
            const model = await HeaderModel.create(spamHeaders);
            const insights = generateInsights(model);

            const priority = findInsight(insights, "High priority");
            expect(priority).toBeDefined();
            expect(priority?.severity).toBe("warning");
        });
    });

    describe("empty/minimal headers", () => {
        test("returns empty insights for minimal headers", async () => {
            const model = await HeaderModel.create("Subject: test\r\n");
            const insights = generateInsights(model);

            // Should only have no auth/spam/delivery insights
            expect(insights.length).toBe(0);
        });
    });
});
