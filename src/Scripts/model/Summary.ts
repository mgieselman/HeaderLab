import { summaryLabels, timeLabels } from "../core/labels";
import { Strings } from "../core/Strings";
import { Header } from "../row/Header";
import { Row } from "../row/Row";
import { SummaryRow } from "../row/SummaryRow";
import { SummaryTable } from "../table/SummaryTable";

export class Summary extends SummaryTable {
    public readonly tableName: string = "summary";
    public readonly displayName: string = summaryLabels.summary;
    public readonly tag: string = "SUM";
    private totalTimeInternal = "";

    private creationPostFix(totalTime: string): string {
        if (!totalTime) {
            return "";
        }

        return ` ${timeLabels.deliveredStart} ${totalTime}${timeLabels.deliveredEnd}`;
    }

    private dateRow = new SummaryRow("Date", summaryLabels.creationTime, { postFix: "" });

    private archivedRow = new SummaryRow("Archived-At", summaryLabels.archivedAt, { valueUrlMapper: Strings.mapValueToURL });

    private summaryRows: SummaryRow[] = [
        new SummaryRow("Subject", summaryLabels.subject),
        new SummaryRow("Message-ID", summaryLabels.messageId),
        this.archivedRow,
        this.dateRow,
        new SummaryRow("From", summaryLabels.from),
        new SummaryRow("Reply-To", summaryLabels.replyTo),
        new SummaryRow("To", summaryLabels.to),
        new SummaryRow("CC", summaryLabels.cc)
    ];

    public override exists(): boolean {
        let row: Row | undefined;
        this.rows.forEach((r: Row) => { if (!row && r.value) row = r; });
        return row !== undefined;
    }

    public add(header: Header) {
        if (!header) {
            return false;
        }

        let row: SummaryRow | undefined;
        this.rows.forEach((r: Row) => { if (!row && r.header.toUpperCase() === header.header.toUpperCase()) row = r; });
        if (row) {
            row.value = header.value;
            return true;
        }

        return false;
    }

    public get rows(): SummaryRow[] { return this.summaryRows; }
    public get totalTime(): string { return this.totalTimeInternal; }
    public set totalTime(value: string) {
        this.totalTimeInternal = value;
        this.dateRow.postFix = this.creationPostFix(value);
    }

    public override toString(): string {
        if (!this.exists()) return "";
        const ret = ["Summary"];
        this.rows.forEach(function (row) {
            if (row.value) { ret.push(row.toString()); }
        });
        return ret.join("\n");
    }
}
