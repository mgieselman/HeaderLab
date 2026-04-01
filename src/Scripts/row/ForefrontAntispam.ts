import { labels } from "../labels";
import { AntiSpamReport } from "./Antispam";
import { Header } from "./Header";
import { Row } from "./Row";

export class ForefrontAntiSpamReport extends AntiSpamReport {
    public override readonly tableName: string = "forefrontAntiSpamReport";
    public override readonly displayName: string = labels.forefrontAntiSpamReport;
    public override readonly tag: string = "FFAS";
    private forefrontAntiSpamRows: Row[] = [
        new Row("ARC", labels.arc, "X-Forefront-Antispam-Report"),
        new Row("CTRY", labels.countryRegion, "X-Forefront-Antispam-Report"),
        new Row("LANG", labels.lang, "X-Forefront-Antispam-Report"),
        new Row("SCL", labels.scl, "X-MS-Exchange-Organization-SCL"),
        new Row("PCL", labels.pcl, "X-Forefront-Antispam-Report"),
        new Row("SFV", labels.sfv, "X-Forefront-Antispam-Report"),
        new Row("IPV", labels.ipv, "X-Forefront-Antispam-Report"),
        new Row("H", labels.helo, "X-Forefront-Antispam-Report"),
        new Row("PTR", labels.ptr, "X-Forefront-Antispam-Report"),
        new Row("CIP", labels.cip, "X-Forefront-Antispam-Report"),
        new Row("CAT", labels.cat, "X-Forefront-Antispam-Report"),
        new Row("SFTY", labels.sfty, "X-Forefront-Antispam-Report"),
        new Row("SRV", labels.srv, "X-Forefront-Antispam-Report"),
        new Row("X-CustomSpam", labels.customSpam, "X-Forefront-Antispam-Report"),
        new Row("SFS", labels.sfs, "X-Forefront-Antispam-Report"),
        new Row("source", labels.source, "X-Forefront-Antispam-Report"),
        new Row("unparsed", labels.unparsed, "X-Forefront-Antispam-Report")
    ];

    public override add(header: Header): boolean {
        if (header.header.toUpperCase() === "X-Forefront-Antispam-Report".toUpperCase()) {
            this.parse(header.value);
            return true;
        }

        return false;
    }

    public override get rows(): Row[] { return this.forefrontAntiSpamRows; }
    public override toString(): string {
        if (!this.exists()) return "";
        const ret = ["ForefrontAntiSpamReport"];
        this.rows.forEach(function (row) {
            if (row.value) { ret.push(row.toString()); }
        });
        return ret.join("\n");
    }
}
