import { GetHeadersGraph } from "./GetHeadersGraph";

describe("GetHeadersGraph.extractHeadersFromResponse", () => {
    test("extracts header string from extended property", () => {
        const response = {
            singleValueExtendedProperties: [
                { id: "String 0x007D", value: "Received: from server.example.com\r\nSubject: Test" }
            ]
        };

        expect(GetHeadersGraph.extractHeadersFromResponse(response)).toBe(
            "Received: from server.example.com\r\nSubject: Test"
        );
    });

    test("returns empty string when singleValueExtendedProperties is undefined", () => {
        expect(GetHeadersGraph.extractHeadersFromResponse({})).toBe("");
    });

    test("returns empty string when singleValueExtendedProperties is empty array", () => {
        expect(GetHeadersGraph.extractHeadersFromResponse({ singleValueExtendedProperties: [] })).toBe("");
    });

    test("handles headers with colons in values", () => {
        const response = {
            singleValueExtendedProperties: [
                { id: "String 0x007D", value: "Received: from server.example.com; Mon, 21 May 2018 16:08:55 +0000" }
            ]
        };

        expect(GetHeadersGraph.extractHeadersFromResponse(response)).toBe(
            "Received: from server.example.com; Mon, 21 May 2018 16:08:55 +0000"
        );
    });

    test("handles multiline received headers", () => {
        const headers = "Received: from BY2NAM01HT049.eop-nam01.prod.protection.outlook.com\r\n" +
            " (2a01:111:e400:5a6b::50) by BY2PR16MB0487.namprd16.prod.outlook.com with\r\n" +
            " HTTPS; Mon, 21 May 2018 16:08:55 +0000\r\n" +
            "Subject: Test message";

        const response = {
            singleValueExtendedProperties: [
                { id: "String 0x007D", value: headers }
            ]
        };

        expect(GetHeadersGraph.extractHeadersFromResponse(response)).toBe(headers);
    });
});
