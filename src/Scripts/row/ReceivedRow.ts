import { ReceivedField } from "./ReceivedField";
import { receivedLabels } from "../core/labels";

export class ReceivedRow {
    constructor(receivedHeader: string | null) {
        this.sourceHeader = new ReceivedField("", receivedHeader);
        this.hop = new ReceivedField(receivedLabels.receivedHop);
        this.from = new ReceivedField(receivedLabels.receivedFrom);
        this.by = new ReceivedField(receivedLabels.receivedBy);
        this.with = new ReceivedField(receivedLabels.receivedWith);
        this.id = new ReceivedField(receivedLabels.receivedId);
        this.for = new ReceivedField(receivedLabels.receivedFor);
        this.via = new ReceivedField(receivedLabels.receivedVia);
        this.date = new ReceivedField(receivedLabels.receivedDate);
        this.delay = new ReceivedField(receivedLabels.receivedDelay);
        this.percent = new ReceivedField(receivedLabels.receivedPercent, 0);
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

        const rawField = this[fieldName.toLowerCase()];
        if (!rawField || typeof rawField === "function") return;
        const field = rawField as ReceivedField;

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
