import { labels } from "../labels";
import { ReceivedField } from "./ReceivedField";

export class ReceivedRow {
    constructor(receivedHeader: string | null) {
        this.sourceHeader = new ReceivedField("", receivedHeader);
        this.hop = new ReceivedField(labels.receivedHop);
        this.from = new ReceivedField(labels.receivedFrom);
        this.by = new ReceivedField(labels.receivedBy);
        this.with = new ReceivedField(labels.receivedWith);
        this.id = new ReceivedField(labels.receivedId);
        this.for = new ReceivedField(labels.receivedFor);
        this.via = new ReceivedField(labels.receivedVia);
        this.date = new ReceivedField(labels.receivedDate);
        this.delay = new ReceivedField(labels.receivedDelay);
        this.percent = new ReceivedField(labels.receivedPercent, 0);
        this.delaySort = new ReceivedField("", -1);
        this.dateNum = new ReceivedField("");
    }
    [index: string]: ReceivedField | ((fieldName: string, fieldValue: string) => void) | (() => string);
    sourceHeader: ReceivedField;
    hop: ReceivedField;
    from: ReceivedField;
    by: ReceivedField;
    with: ReceivedField;
    id: ReceivedField;
    for: ReceivedField;
    via: ReceivedField;
    date: ReceivedField;
    delay: ReceivedField;
    percent: ReceivedField;
    delaySort: ReceivedField;
    dateNum: ReceivedField;

    setField(fieldName: string, fieldValue: string) {
        if (!fieldName || !fieldValue) {
            return;
        }

        const field = this[fieldName.toLowerCase()] as unknown as ReceivedField;
        if (!field) return;

        if (field.value) { field.value += "; " + fieldValue; }
        else { field.value = fieldValue; }
    }

    toString(): string {
        const str: string[] = [];
        for (const key in this) {
            const field = this[key] as ReceivedField;
            if (field && field.label && field.toString()) {
                str.push(field.label + ": " + field.toString());
            }
        }

        return str.join("\n");
    }
}
