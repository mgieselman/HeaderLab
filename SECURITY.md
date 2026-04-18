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

- **Nested App Authentication (NAA)** — the Outlook add-in uses modern OAuth 2.0 / NAA for header retrieval; legacy EWS has been removed
- **No server-side processing** — all header parsing runs client-side in the browser; no headers are transmitted to a backend
- **Content Security Policy** — enforced via Azure Static Web Apps routing configuration
- **Strict TypeScript** — `noExplicitAny` and all strict checks enabled; reduces a class of runtime errors
- **Dependabot** — automated dependency vulnerability alerts and updates
- **Secret scanning and push protection** — enabled on the repository
