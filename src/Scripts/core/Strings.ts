export class Strings {
    public static joinArray(array: unknown[] | null, separator: string): string {
        if (!array) return "";
        return array.filter((item) => item !== null && item !== undefined && item !== "").join(separator);
    }

    public static htmlEncode(value: string): string {
        const div = document.createElement("div");
        div.appendChild(document.createTextNode(value));
        return div.innerHTML;
    }

    private static headerToUrlMap = new Map<string, string>([
        ["Subject", "https://tools.ietf.org/html/rfc5322#section-3.6.5"],
        ["Date", "https://tools.ietf.org/html/rfc5322#section-3.6.1"],
        ["From", "https://tools.ietf.org/html/rfc5322#section-3.6.2"],
        ["Reply-To", "https://tools.ietf.org/html/rfc5322#section-3.6.2"],
        ["To", "https://tools.ietf.org/html/rfc5322#section-3.6.3"],
        ["CC", "https://tools.ietf.org/html/rfc5322#section-3.6.3"],
        ["Message-ID", "https://tools.ietf.org/html/rfc5322#section-3.6.4"],
        ["Archived-At", "https://tools.ietf.org/html/rfc5064"],
        ["Received", "https://tools.ietf.org/html/rfc5322#section-3.6.7"],
        ["MIME-Version", "https://tools.ietf.org/html/rfc2045#section-4"],
        ["Content-Type", "https://tools.ietf.org/html/rfc2045#section-5"],
        ["Content-Transfer-Encoding", "https://tools.ietf.org/html/rfc2045#section-6"],
        ["X-Mailer", "https://tools.ietf.org/html/rfc4021#section-2.1.48"],
        ["DKIM-Signature", "https://tools.ietf.org/html/rfc6376"],
        ["ARC-Seal", "https://tools.ietf.org/html/rfc8617#section-4.1.1"],
        ["ARC-Message-Signature", "https://tools.ietf.org/html/rfc8617#section-4.1.2"],
        ["ARC-Authentication-Results", "https://tools.ietf.org/html/rfc8617#section-4.1.3"],
        ["Authentication-Results", "https://tools.ietf.org/html/rfc8601"],
        ["X-Microsoft-Antispam", "https://docs.microsoft.com/en-us/microsoft-365/security/office-365-security/anti-spam-message-headers"],
        ["X-Forefront-Antispam-Report", "https://docs.microsoft.com/en-us/microsoft-365/security/office-365-security/anti-spam-message-headers"],
        ["X-MS-Exchange-Organization-SCL", "https://technet.microsoft.com/en-us/library/aa996878"],
    ]);

    public static mapHeaderToURL(headerName: string, value?: string): string {
        const url = Strings.headerToUrlMap.get(headerName);
        if (!url) return "";
        if (value === undefined) return url;
        const displayText = value || headerName;
        return `<a href = '${url}' target = '_blank'>${displayText}</a>`;
    }

    public static mapValueToURL(value: string): string {
        if (!value) return "";
        // If the value looks like a URL, return it directly
        if (value.match(/^https?:\/\//i)) {
            return value;
        }

        // If the value looks like a mailto, strip angle brackets
        const mailTo = value.match(/<?(mailto:.*?)>?$/i);
        if (mailTo && mailTo[1]) {
            return mailTo[1];
        }

        // If the value is wrapped in angle brackets and looks like a URL
        const bracketUrl = value.match(/<?(https?:\/\/.*?)>?$/i);
        if (bracketUrl && bracketUrl[1]) {
            return bracketUrl[1];
        }

        return "";
    }

    public static copyToClipboard(text: string): Promise<void> {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        }

        return new Promise((resolve) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            resolve();
        });
    }
}
