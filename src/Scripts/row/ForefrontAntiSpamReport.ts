import { AntiSpamReport } from "./AntiSpamReport";
import { Header } from "./Header";
import { Row } from "./Row";
import { antispamLabels } from "../core/labels";

export class ForefrontAntiSpamReport extends AntiSpamReport {
    public override readonly tableName: string = "forefrontAntiSpamReport";
    public override readonly displayName: string = antispamLabels.forefrontAntiSpamReport;
    public override readonly tag: string = "FFAS";
    private forefrontAntiSpamRows: Row[] = [
        new Row("ARC", antispamLabels.arc, "X-Forefront-Antispam-Report"),
        new Row("CTRY", antispamLabels.countryRegion, "X-Forefront-Antispam-Report"),
        new Row("LANG", antispamLabels.lang, "X-Forefront-Antispam-Report"),
        new Row("SCL", antispamLabels.scl, "X-MS-Exchange-Organization-SCL"),
        new Row("PCL", antispamLabels.pcl, "X-Forefront-Antispam-Report"),
        new Row("SFV", antispamLabels.sfv, "X-Forefront-Antispam-Report"),
        new Row("IPV", antispamLabels.ipv, "X-Forefront-Antispam-Report"),
        new Row("H", antispamLabels.helo, "X-Forefront-Antispam-Report"),
        new Row("PTR", antispamLabels.ptr, "X-Forefront-Antispam-Report"),
        new Row("CIP", antispamLabels.cip, "X-Forefront-Antispam-Report"),
        new Row("CAT", antispamLabels.cat, "X-Forefront-Antispam-Report"),
        new Row("SFTY", antispamLabels.sfty, "X-Forefront-Antispam-Report"),
        new Row("SRV", antispamLabels.srv, "X-Forefront-Antispam-Report"),
        new Row("X-CustomSpam", antispamLabels.customSpam, "X-Forefront-Antispam-Report"),
        new Row("SFS", antispamLabels.sfs, "X-Forefront-Antispam-Report"),
        new Row("DIR", antispamLabels.dir, "X-Forefront-Antispam-Report"),
        new Row("source", antispamLabels.source, "X-Forefront-Antispam-Report"),
        new Row("unparsed", antispamLabels.unparsed, "X-Forefront-Antispam-Report")
    ];

    protected override shouldAddUnparsedField(key: string, value: string | undefined): boolean {
        void key;
        return value !== undefined && value !== "";
    }

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
