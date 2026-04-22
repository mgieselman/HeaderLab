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

- **Add-in permission** — the XML manifest (`Manifest.xml`) declares `ReadWriteMailbox` because that is the smallest value above `ReadWriteItem` in Outlook's four-level XML scheme, and anything less is rejected by Outlook for iOS. The unified manifest (`manifest.json`) declares the narrower `Mailbox.Read.User` scope. The add-in only ever reads the transport headers of the currently selected message via `getAllInternetHeadersAsync`; it never writes to messages, never sends mail, and never reads other messages. No OAuth consent flow and no client secret are involved. See `docs/plans/ios-permission-bump.md`, `ios-permission-bump-2.md`, and `ios-permission-bump-3.md` for the rationale trail.
- **No server-side processing** — all header parsing runs client-side in the browser; no headers are transmitted to a backend
- **Content Security Policy** — enforced via Azure Static Web Apps routing configuration; `connect-src` is restricted to `'self'` and the Application Insights ingestion endpoint
- **Strict TypeScript** — `noExplicitAny` and all strict checks enabled; reduces a class of runtime errors
- **Dependabot** — automated dependency vulnerability alerts and updates
- **Secret scanning and push protection** — enabled on the repository
