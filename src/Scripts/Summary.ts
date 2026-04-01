import { labels } from "./labels";
import { ArchivedRow } from "./row/ArchivedRow";
import { CreationRow } from "./row/CreationRow";
import { Header } from "./row/Header";
import { Row } from "./row/Row";
import { SummaryRow } from "./row/SummaryRow";
import { SummaryTable } from "./table/SummaryTable";

export class Summary extends SummaryTable {
    public readonly tableName: string = "summary";
    public readonly displayName: string = labels.summary;
    public readonly tag: string = "SUM";
    private totalTimeInternal = "";

    private creationPostFix(totalTime: string): string {
        if (!totalTime) {
            return "";
        }

        return ` ${labels.deliveredStart} ${totalTime}${labels.deliveredEnd}`;
    }

    private dateRow = new CreationRow("Date", labels.creationTime);

    private archivedRow = new ArchivedRow("Archived-At", labels.archivedAt,);

    private summaryRows: SummaryRow[] = [
        new SummaryRow("Subject", labels.subject),
        new SummaryRow("Message-ID", labels.messageId),
        this.archivedRow,
        this.dateRow,
        new SummaryRow("From", labels.from),
        new SummaryRow("Reply-To", labels.replyTo),
        new SummaryRow("To", labels.to),
        new SummaryRow("CC", labels.cc)
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
