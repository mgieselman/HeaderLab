# HeaderLab Privacy Policy

HeaderLab analyzes email transport headers to help diagnose delivery and security issues.

## Data Processing

All header analysis is performed locally in your browser. No email header data is sent to any server.

## Telemetry

HeaderLab may collect anonymous usage telemetry via Application Insights to improve the tool. You can opt out of telemetry at any time from the Settings menu. No telemetry is collected on localhost or during development.

The following telemetry events may be collected:

- **Page view** — when the app is loaded
- **Error / exception** — unhandled errors, including sanitized stack traces
- **Add-in: API headers** — when headers are retrieved via the Office.js API
- **Add-in: Graph headers** — when headers are retrieved via Microsoft Graph
- **App diagnostics** — version, build time, and feature flags (no personal data)

No email content, subject lines, sender/recipient addresses, or header values are included in telemetry.

## Outlook Add-in

When used as an Outlook add-in, HeaderLab retrieves message headers using the Office.js API or Microsoft Graph API. This requires the `Mail.Read` permission. Headers are processed locally and are not stored or transmitted beyond what is necessary for retrieval.

## Contact

For privacy questions or concerns, open an issue at [https://github.com/mgieselman/headerlab/issues](https://github.com/mgieselman/headerlab/issues).
