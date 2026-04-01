import { Row } from "./Row";
import { Strings } from "../core/Strings";

export class OtherRow extends Row {
    constructor(number: number, header: string, value: string) {
        super(header, "", header);  // headerName is same as header for OtherRow
        this.number = number;
        this.value = value;
        this.url = Strings.mapHeaderToURL(header);
    }

    number: number;
    override toString() {
        return this.header + ": " + this.value;
    }
}
