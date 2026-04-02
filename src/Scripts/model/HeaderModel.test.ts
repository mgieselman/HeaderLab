import { TextDecoder, TextEncoder } from "util";

import { HeaderModel } from "./HeaderModel";

// Polyfill missing TextEncoder - https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
// TODO: Move this to a global setup file
Object.assign(global, { TextDecoder, TextEncoder }); // eslint-disable-line @typescript-eslint/naming-convention

// Full real-world headers from an ActiveCampaign spam message (SFV:SPM).
// Antispam headers have values entirely on continuation lines (folded per RFC 5322).
const fullSpamHeaders = [
    "Received: from DS7PR06MB6790.namprd06.prod.outlook.com (::1) by",
    " CH3PPF3CC9C8367.namprd06.prod.outlook.com with HTTPS; Wed, 1 Apr 2026",
    " 14:05:55 +0000",
    "Received: from BY5PR04CA0017.namprd04.prod.outlook.com (2603:10b6:a03:1d0::27)",
    " by DS7PR06MB6790.namprd06.prod.outlook.com (2603:10b6:5:2ce::8) with",
    " Microsoft SMTP Server (version=TLS1_2,",
    " cipher=TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384) id 15.20.9769.17; Wed, 1 Apr",
    " 2026 14:05:52 +0000",
    "Received: from CO1PEPF000066E8.namprd05.prod.outlook.com",
    " (2603:10b6:a03:1d0:cafe::de) by BY5PR04CA0017.outlook.office365.com",
    " (2603:10b6:a03:1d0::27) with Microsoft SMTP Server (version=TLS1_3,",
    " cipher=TLS_AES_256_GCM_SHA384) id 15.20.9745.29 via Frontend Transport; Wed,",
    " 1 Apr 2026 14:05:51 +0000",
    "Authentication-Results: spf=pass (sender IP is 52.128.44.60)",
    " smtp.mailfrom=em-4103690.goodchoicelending.com; dkim=pass (signature was",
    " verified) header.d=goodchoicelending.com;dkim=pass (signature was verified)",
    " header.d=mailersys.com;dmarc=pass action=none",
    " header.from=goodchoicelending.com;compauth=pass reason=100",
    "Received-SPF: Pass (protection.outlook.com: domain of",
    " em-4103690.goodchoicelending.com designates 52.128.44.60 as permitted sender)",
    " receiver=protection.outlook.com; client-ip=52.128.44.60;",
    " helo=mail60.use2.acemsrvh.com; pr=C",
    "Received: from mail60.use2.acemsrvh.com (52.128.44.60) by",
    " CO1PEPF000066E8.mail.protection.outlook.com (10.167.249.6) with Microsoft",
    " SMTP Server (version=TLS1_3, cipher=TLS_AES_256_GCM_SHA384) id 15.20.9769.17",
    " via Frontend Transport; Wed, 1 Apr 2026 14:05:51 +0000",
    "X-KumoRef: eyJfQF8iOiJcXF8vIiwicmVjaXBpZW50IjoibWF0dEBnaWVzZWxtYW4uY29tIn0=",
    "DKIM-Signature: v=1; a=rsa-sha256; d=goodchoicelending.com; s=acdkim1; c=relaxed/relaxed;",
    "\tbh=LGFsenwvDen6zoLqlaHutEa0zWNU4lgWt7YuL7Du/l4=;",
    "\th=from:to:subject:date:mime-version:content-type:sender:cc:date:message-id:",
    "\t\tlist-unsubscribe:list-unsubscribe-post; t=1775052350; x=1775138750;",
    "\tb=nqTgOumUcI8+oLGtFF5P56ZgLLaMecxlQH5jenXZid8V+cQRK6CqZW1OxpV9+HKtNJ40kQLAP",
    "\tIO+IUDkL9qzKm5cCXpjzGGIBUxAMtFizMVki2Chl6sSig8vOp4r+zLfz9orXmLCeZGpJRSTMG6r",
    "\tW7NzDEI20lNwFxPSjaHoXWNd8Rw5cZFykzAktyv/NWNeAj3dHCllFcGdjYafmEqCqfgLF+LO52D",
    "\t+9sUJq0ZxSQcUn690JE6ygLzf3j6pcKMMLsKgt9T1I5NwcIcQWB35BBu4jpfAJUJaAyi6FC03+s",
    "\trb5XjYpBfAhr6FnuvSwdA57S6PCyXXl2OI96c4jhwd/w==;",
    "DKIM-Signature: v=1; a=rsa-sha256; d=mailersys.com; s=acdkim1; c=relaxed/relaxed;",
    "\tbh=LGFsenwvDen6zoLqlaHutEa0zWNU4lgWt7YuL7Du/l4=;",
    "\th=from:to:subject:date:mime-version:content-type:sender:cc:date:message-id:",
    "\t\tlist-unsubscribe:list-unsubscribe-post; t=1775052350; x=1775138750;",
    "\tb=dA2BDC/fUDdAjgp6nTKcQQlzVa1kRL2IwYHPT9F1jRaRpsvpT2lJHoPhtK1+zlicNfQNo6smr",
    "\t4d4OedDcYeUbo3uERs8HZPClFQXqQY786DTv0Jh24aZGT/GIvAXyBhMo0sh+a7uI3My+VQqnLH1",
    "\tlQaBs1icJwgwXos1e/JYYGfeVx1264CpKbjg05ZrMXgu4oxoOBYOIkAWWqQPC626rdPFjiqk8bl",
    "\tIExXpUOM0tgv44nLYYXcTtRiHvxYitoku5EUt34Dsitqs/tpAP//2vdi5y06j31VaEJ7hfbeH45",
    "\tS0Xlwlos+DnPXGDKEuWIZxzwBZk5ylL/GAmuaF8YD5wA==;",
    "CFBL-Address: fbl-report@acems1.com; report=arf",
    "X-Mailer: ActiveCampaign Mailer",
    "Received: from service-8 (10.96.153.38)",
    "  by acems1.com (KumoMTA 10.96.112.98)",
    "  with ESMTPS (TLSv1_3:TLS13_AES_256_GCM_SHA384)  id e3a3b8582dd311f1a07502c82f9c3d17 for <matt@gieselman.com>;",
    "  Wed, 1 Apr 2026 14:05:50 +0000",
    "Date: Wed, 1 Apr 2026 14:05:50 +0000 (GMT)",
    "From: Christian Burke <cburke@goodchoicelending.com>",
    "To: matt@gieselman.com",
    "Message-ID: <1609494806.2994157.1775052350566@service-8>",
    "Subject: LOC Updated Review - Gieselman Software",
    "MIME-Version: 1.0",
    "Content-Type: multipart/alternative;",
    "\tboundary=\"----=_Part_2994156_470094321.1775052350566\"",
    "X-DKIM-Options: s=acdkim1",
    "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
    "X-Virtual-Mta: camp-use2-a-c4-60-60",
    "X-250ok-CID: 4103690-66",
    "List-Unsubscribe: <https://ongreencapital.activehosted.com/box.php?nl=4&c=66&m=70&s=e94fa5aeb419eb68df1cb36bda1efdf4&funcml=unsub2&luha=1>,<mailto:unsubscribe-1745852455e72478b3f2f7925720917d-66-e94fa5aeb419eb68df1cb36bda1efdf4@mail60.use2.acemsrvh.com>",
    "Feedback-ID: 4103690:activecampaign",
    "X-Sending-Engine: Hedwig PCS",
    "X-Report-Abuse: Please report abuse to abuse@activecampaign.com",
    "X-lid: bWF0dEBnaWVzZWxtYW4uY29tICwgYzY2ICwgbTcwICwgczYxICwgbDQ=",
    "X-mid: bWF0dEBnaWVzZWxtYW4uY29tICwgYzY2ICwgbTcwICwgczYx",
    "Return-Path:",
    " bounce-4103690-66-257966-matt=gieselman.com@em-4103690.goodchoicelending.com",
    "X-MS-Exchange-Organization-ExpirationStartTime: 01 Apr 2026 14:05:51.4542",
    " (UTC)",
    "X-MS-Exchange-Organization-ExpirationStartTimeReason: OriginalSubmit",
    "X-MS-Exchange-Organization-ExpirationInterval: 1:00:00:00.0000000",
    "X-MS-Exchange-Organization-ExpirationIntervalReason: OriginalSubmit",
    "X-MS-Exchange-Organization-Network-Message-Id:",
    " 47b268fb-f2f8-4bdb-d917-08de8ff7c85e",
    "X-EOPAttributedMessage: 0",
    "X-EOPTenantAttributedMessage: 69f07252-6e66-4044-a080-41efced2196f:0",
    "X-MS-Exchange-Organization-MessageDirectionality: Incoming",
    "X-MS-PublicTrafficType: Email",
    "X-MS-TrafficTypeDiagnostic:",
    " CO1PEPF000066E8:EE_|DS7PR06MB6790:EE_|CH3PPF3CC9C8367:EE_",
    "X-MS-Exchange-Organization-AuthSource:",
    " CO1PEPF000066E8.namprd05.prod.outlook.com",
    "X-MS-Exchange-Organization-AuthAs: Anonymous",
    "X-MS-Office365-Filtering-Correlation-Id: 47b268fb-f2f8-4bdb-d917-08de8ff7c85e",
    "X-MS-Exchange-Organization-SCL: 5",
    "X-Forefront-Antispam-Report:",
    " CIP:52.128.44.60;CTRY:US;LANG:en;SCL:5;SRV:;IPV:NLI;SFV:SPM;H:mail60.use2.acemsrvh.com;PTR:mail60.use2.acemsrvh.com;CAT:SPM;SFS:(13230040)(704162311799003)(4022899009)(4123199012)(5062899012)(7049299003)(3072899012)(2092899012)(3109299003)(5073199012)(5063199012)(12012899012)(69100299015)(1032899013)(7149299003)(20209132999009)(2066899003)(4076899003)(8096899003)(13003099007)(16102099003)(56012099003)(21082099003)(19002099003)(18002099003)(8112999003);DIR:INB;",
    "X-Microsoft-Antispam:",
    " BCL:0;ARA:13230040|704162311799003|4022899009|4123199012|5062899012|7049299003|3072899012|2092899012|3109299003|5073199012|5063199012|12012899012|69100299015|1032899013|7149299003|20209132999009|2066899003|4076899003|8096899003|13003099007|16102099003|56012099003|21082099003|19002099003|18002099003|8112999003;",
    "X-MS-Exchange-CrossTenant-OriginalArrivalTime: 01 Apr 2026 14:05:51.2293",
    " (UTC)",
    "X-MS-Exchange-CrossTenant-Network-Message-Id: 47b268fb-f2f8-4bdb-d917-08de8ff7c85e",
    "X-MS-Exchange-CrossTenant-Id: 69f07252-6e66-4044-a080-41efced2196f",
    "X-MS-Exchange-CrossTenant-AuthSource:",
    " CO1PEPF000066E8.namprd05.prod.outlook.com",
    "X-MS-Exchange-CrossTenant-AuthAs: Anonymous",
    "X-MS-Exchange-CrossTenant-FromEntityHeader: Internet",
    "X-MS-Exchange-Transport-CrossTenantHeadersStamped: DS7PR06MB6790",
    "X-MS-Exchange-Transport-EndToEndLatency: 00:00:03.8550345",
    "X-MS-Exchange-Processed-By-BccFoldering: 15.20.9769.009",
    "X-MS-Exchange-ExternalInOutlookResult: IsExternal",
    "X-Microsoft-Antispam-Mailbox-Delivery:",
    "\tucf:0;jmr:0;auth:0;dest:J;OFR:SpamFilterAuthJ;ENG:(910005)(944490095)(944506478)(944626604)(4710137)(4715077)(4999163)(920097)(930201)(3100021)(140003)(1310096);RF:JunkEmail;",
    "X-Microsoft-Antispam-Message-Info:",
    "\t=?us-ascii?Q?7yy8+1Kb8d/aLdMCHBjByQjPqvKoRSPKxG0kfHIkhFNuxsGYIxxBuJRGsgwY?=",
    " =?us-ascii?Q?7UQTjrGcjTv7g53ehYcHLBtjoAdmhL/sZ6V8NBw9Corm5eBmfjM1hGzNTFN0?=",
].join("\r\n");

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
