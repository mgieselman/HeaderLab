import { TextDecoder, TextEncoder } from "util";

import { HeaderModel } from "./HeaderModel";

// Polyfill missing TextEncoder - https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
// TODO: Move this to a global setup file
Object.assign(global, { TextDecoder, TextEncoder }); // eslint-disable-line @typescript-eslint/naming-convention

// Full real-world headers from an ActiveCampaign spam message
const fullSpamHeaders =
    "Received: from DS7PR06MB6790.namprd06.prod.outlook.com (::1) by\r\n" +
    " CH3PPF3CC9C8367.namprd06.prod.outlook.com with HTTPS; Wed, 1 Apr 2026\r\n" +
    " 14:05:55 +0000\r\n" +
    "Received: from BY5PR04CA0017.namprd04.prod.outlook.com (2603:10b6:a03:1d0::27)\r\n" +
    " by DS7PR06MB6790.namprd06.prod.outlook.com (2603:10b6:5:2ce::8) with\r\n" +
    " Microsoft SMTP Server (version=TLS1_2,\r\n" +
    " cipher=TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384) id 15.20.9769.17; Wed, 1 Apr\r\n" +
    " 2026 14:05:52 +0000\r\n" +
    "Received: from CO1PEPF000066E8.namprd05.prod.outlook.com\r\n" +
    " (2603:10b6:a03:1d0:cafe::de) by BY5PR04CA0017.outlook.office365.com\r\n" +
    " (2603:10b6:a03:1d0::27) with Microsoft SMTP Server (version=TLS1_3,\r\n" +
    " cipher=TLS_AES_256_GCM_SHA384) id 15.20.9745.29 via Frontend Transport; Wed,\r\n" +
    " 1 Apr 2026 14:05:51 +0000\r\n" +
    "Authentication-Results: spf=pass (sender IP is 52.128.44.60)\r\n" +
    " smtp.mailfrom=em-4103690.goodchoicelending.com; dkim=pass (signature was\r\n" +
    " verified) header.d=goodchoicelending.com;dkim=pass (signature was verified)\r\n" +
    " header.d=mailersys.com;dmarc=pass action=none\r\n" +
    " header.from=goodchoicelending.com;compauth=pass reason=100\r\n" +
    "Received-SPF: Pass (protection.outlook.com: domain of\r\n" +
    " em-4103690.goodchoicelending.com designates 52.128.44.60 as permitted sender)\r\n" +
    " receiver=protection.outlook.com; client-ip=52.128.44.60;\r\n" +
    " helo=mail60.use2.acemsrvh.com; pr=C\r\n" +
    "Received: from mail60.use2.acemsrvh.com (52.128.44.60) by\r\n" +
    " CO1PEPF000066E8.mail.protection.outlook.com (10.167.249.6) with Microsoft\r\n" +
    " SMTP Server (version=TLS1_3, cipher=TLS_AES_256_GCM_SHA384) id 15.20.9769.17\r\n" +
    " via Frontend Transport; Wed, 1 Apr 2026 14:05:51 +0000\r\n" +
    "X-KumoRef: eyJfQF8iOiJcXF8vIiwicmVjaXBpZW50IjoibWF0dEBnaWVzZWxtYW4uY29tIn0=\r\n" +
    "DKIM-Signature: v=1; a=rsa-sha256; d=goodchoicelending.com; s=acdkim1; c=relaxed/relaxed;\r\n" +
    "\tbh=LGFsenwvDen6zoLqlaHutEa0zWNU4lgWt7YuL7Du/l4=;\r\n" +
    "\th=from:to:subject:date:mime-version:content-type;\r\n" +
    "\tb=nqTgOumUcI8+oLGtFF5P56ZgLLaMecxlQH5jenXZid8V;\r\n" +
    "Date: Wed, 1 Apr 2026 14:05:50 +0000 (GMT)\r\n" +
    "From: Christian Burke <cburke@goodchoicelending.com>\r\n" +
    "To: matt@gieselman.com\r\n" +
    "Message-ID: <1609494806.2994157.1775052350566@service-8>\r\n" +
    "Subject: LOC Updated Review - Gieselman Software\r\n" +
    "MIME-Version: 1.0\r\n" +
    "Content-Type: multipart/alternative;\r\n" +
    "\tboundary=\"----=_Part_2994156_470094321.1775052350566\"\r\n" +
    "X-MS-Exchange-Organization-SCL: 5\r\n" +
    "X-Forefront-Antispam-Report:\r\n" +
    " CIP:52.128.44.60;CTRY:US;LANG:en;SCL:5;SRV:;IPV:NLI;SFV:SPM;H:mail60.use2.acemsrvh.com;PTR:mail60.use2.acemsrvh.com;CAT:SPM;SFS:(13230040)(704162311799003)(4022899009);DIR:INB;\r\n" +
    "X-Microsoft-Antispam:\r\n" +
    " BCL:0;ARA:13230040|704162311799003;\r\n" +
    "X-Microsoft-Antispam-Mailbox-Delivery:\r\n" +
    "\tucf:0;jmr:0;auth:0;dest:J;OFR:SpamFilterAuthJ;ENG:(910005)(944490095);RF:JunkEmail;\r\n";

// Real-world headers where antispam values are on continuation lines
const spamHeaders =
    "X-Forefront-Antispam-Report:\r\n" +
    " CIP:52.128.44.60;CTRY:US;LANG:en;SCL:5;SRV:;IPV:NLI;SFV:SPM;H:mail60.use2.acemsrvh.com;PTR:mail60.use2.acemsrvh.com;CAT:SPM;SFS:(13230040)(704162311799003);DIR:INB;\r\n" +
    "X-Microsoft-Antispam:\r\n" +
    " BCL:0;ARA:13230040|704162311799003;\r\n" +
    "X-Microsoft-Antispam-Mailbox-Delivery:\r\n" +
    "\tucf:0;jmr:0;auth:0;dest:J;OFR:SpamFilterAuthJ;ENG:(910005)(944490095);RF:JunkEmail;\r\n" +
    "Subject: Test message\r\n";

describe("Security headers with folded values", () => {
    test("forefrontAntiSpamReport is populated when header value is on continuation line", async () => {
        const model = await HeaderModel.create(spamHeaders);
        expect(model.forefrontAntiSpamReport.exists()).toBe(true);
    });

    test("antiSpamReport is populated when header value is on continuation line", async () => {
        const model = await HeaderModel.create(spamHeaders);
        expect(model.antiSpamReport.exists()).toBe(true);
    });

    test("getHeaderList correctly unfolds antispam headers", () => {
        const headerList = HeaderModel.getHeaderList(spamHeaders);
        const ffas = headerList.find(h => h.header === "X-Forefront-Antispam-Report");
        const as = headerList.find(h => h.header === "X-Microsoft-Antispam");
        expect(ffas).toBeDefined();
        expect(ffas!.value).toContain("SFV:SPM");
        expect(as).toBeDefined();
        expect(as!.value).toContain("BCL:0");
    });

    test("full real-world spam message has security data", async () => {
        const model = await HeaderModel.create(fullSpamHeaders);
        expect(model.forefrontAntiSpamReport.exists()).toBe(true);
        expect(model.antiSpamReport.exists()).toBe(true);
        // Check specific parsed values
        const sfvRow = model.forefrontAntiSpamReport.rows.find(r => r.header === "SFV");
        expect(sfvRow?.value).toBe("SPM");
        const bclRow = model.antiSpamReport.rows.find(r => r.header === "BCL");
        expect(bclRow?.value).toBe("0");
    });
});

describe("GetHeaderList Tests", () => {
    test("h1", () => {
        const headerList = HeaderModel.getHeaderList(
            "Subject: =?UTF-8?B?8J+PiCAgMjAxOSdzIE5vLjEgUmVjcnVpdCwgVGhlIFdvcmxkJ3Mg?=\n" +
            " =?UTF 8?B?VGFsbGVzdCBUZWVuYWdlciwgVG9wIFBsYXlzIG9mIHRoZSBXZWVrICYgbW9y?=\n" +
            " =?UTF-8?B?ZQ==?=\n" +
            "Date: Fri, 26 Jan 2018 15:54:11 - 0600\n");
        expect(headerList).toEqual([
            {
                "header": "Subject",
                "value": "🏈  2019's No.1 Recruit, The World's Tallest Teenager, Top Plays of the Week & more"
            },
            {
                "header": "Date",
                "value": "Fri, 26 Jan 2018 15:54:11 - 0600"
            }
        ]);
    });

    test("h2", () => {
        const headerList = HeaderModel.getHeaderList(
            "X-Microsoft-Antispam-Mailbox-Delivery:\n" +
            "\tabwl:0;wl:0;pcwl:0;kl:0;iwl:0;ijl:0;dwl:0;dkl:0;rwl:0;ex:0;auth:1;dest:I;ENG:(400001000128)(400125000095)(5062000261)(5061607266)(5061608174)(4900095)(4920089)(6250004)(4950112)(4990090)(400001001318)(400125100095)(61617190)(400001002128)(400125200095);");
        expect(headerList).toEqual([
            {
                "header": "X-Microsoft-Antispam-Mailbox-Delivery",
                "value": "abwl:0;wl:0;pcwl:0;kl:0;iwl:0;ijl:0;dwl:0;dkl:0;rwl:0;ex:0;auth:1;dest:I;ENG:(400001000128)(400125000095)(5062000261)(5061607266)(5061608174)(4900095)(4920089)(6250004)(4950112)(4990090)(400001001318)(400125100095)(61617190)(400001002128)(400125200095);"
            }
        ]);
    });

    test("h3", () => {
        const headerList = HeaderModel.getHeaderList(
            "Content-Type: multipart/alternative;\n" +
            "\tboundary=\"ErclWH56b6W5=_?:\"");
        expect(headerList).toEqual([
            {
                "header": "Content-Type",
                "value": "multipart/alternative; boundary=\"ErclWH56b6W5=_?:\""
            }
        ]);
    });
});
