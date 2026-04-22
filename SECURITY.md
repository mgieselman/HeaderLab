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

- **Item-scoped add-in permission** — the Outlook add-in requests `ReadWriteItem` on the current message only; no mailbox-wide access, no OAuth consent, no client secret. (`ReadItem` is what the API documentation requires, but Outlook for iOS rejects `getAllInternetHeadersAsync` at that level — see `docs/plans/ios-permission-bump.md`. The add-in does not write to messages; the elevated level only satisfies the iOS runtime check.)
- **No server-side processing** — all header parsing runs client-side in the browser; no headers are transmitted to a backend
- **Content Security Policy** — enforced via Azure Static Web Apps routing configuration; `connect-src` is restricted to `'self'` and the Application Insights ingestion endpoint
- **Strict TypeScript** — `noExplicitAny` and all strict checks enabled; reduces a class of runtime errors
- **Dependabot** — automated dependency vulnerability alerts and updates
- **Secret scanning and push protection** — enabled on the repository
