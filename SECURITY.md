# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in HeaderLab, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please use [GitHub's private vulnerability reporting](https://github.com/mgieselman/headerlab/security/advisories/new) to submit your report.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You should receive an acknowledgment within 48 hours. We will work with you to understand and address the issue before any public disclosure.

## Security Measures

- **Least-privilege add-in permission** — the add-in requests only `ReadItem` on the current message. Header retrieval uses `getAllInternetHeadersAsync` (Office.js, Mailbox 1.9) on Outlook Desktop and Outlook on the Web where that API is implemented. On Outlook for iOS, where the API is not yet implemented by Microsoft, headers are fetched via Microsoft Graph using Nested App Authentication (NAA) with the `Mail.Read` delegated scope — the user consents at first use, no client secret is stored, and the add-in's access is scoped to the signed-in user's mailbox only. See `docs/plans/restore-naa-graph.md` for why the direct API alone is insufficient on iOS.
- **No server-side processing** — all header parsing runs client-side in the browser; no headers are transmitted to a backend
- **Content Security Policy** — enforced via Azure Static Web Apps routing configuration; `connect-src` is restricted to `'self'` and the Application Insights ingestion endpoint
- **Strict TypeScript** — `noExplicitAny` and all strict checks enabled; reduces a class of runtime errors
- **Dependabot** — automated dependency vulnerability alerts and updates
- **Secret scanning and push protection** — enabled on the repository
