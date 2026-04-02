import { Row } from "./Row";
import { Strings } from "../core/Strings";

interface SummaryRowOptions {
    postFix?: string;
    valueUrlMapper?: (value: string) => string;
}

export class SummaryRow extends Row {
    postFix?: string;

    constructor(header: string, label: string, options?: SummaryRowOptions) {
        super(header, label, "");
        this.url = Strings.mapHeaderToURL(header, label);
        if (options?.postFix !== undefined) {
            this.postFix = options.postFix;
        }
        if (options?.valueUrlMapper) {
            const mapper = options.valueUrlMapper;
            this.onGetUrl = (_header, value) => mapper(value);
        }
    }

    override get value(): string {
        return this.postFix !== undefined ? this.valueInternal + this.postFix : this.valueInternal;
    }

    override set value(value: string) { this.valueInternal = value; }
}
