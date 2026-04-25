import { TextDecoder, TextEncoder } from "util";

// Set UTC timezone for all tests
process.env["TZ"] = "UTC";

// Polyfill missing TextEncoder/TextDecoder for jsdom environment
// https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
Object.assign(global, { TextDecoder, TextEncoder }); // eslint-disable-line @typescript-eslint/naming-convention
