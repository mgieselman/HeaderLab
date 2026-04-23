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

- **Least-privilege add-in permission** — the Outlook add-in manifest declares `<Permissions>ReadItem</Permissions>` (XML) and `MailboxItem.Read.User` (unified). The header-retrieval path on Outlook Desktop and Outlook on the Web uses `getAllInternetHeadersAsync` (Mailbox 1.9), which runs inside `ReadItem`. On Outlook for iOS — where Microsoft has not implemented `getAllInternetHeadersAsync` despite advertising Mailbox 1.9 requirement-set support (see `docs/plans/restore-naa-graph.md` for the full story) — the add-in falls back to Microsoft Graph using Nested App Authentication. The NAA path asks the user to consent to the `Mail.Read` delegated scope on first use; this is a user-level OAuth consent, scoped to the signed-in user's own mailbox, with no stored client secret on our side.
- **No server-side processing** — all header parsing runs client-side in the browser; no headers are transmitted to a HeaderLab backend. The Graph fallback makes a single direct browser-to-Microsoft-Graph call; responses are processed client-side and not sent anywhere else.
- **Content Security Policy** — applied per-route in `staticwebapp.config.json`. The standalone web pages (`/`, `/headerlab.html`, `/privacy.html`) get a strict CSP with `connect-src 'self' https://dc.services.visualstudio.com` and `frame-src 'none'`. The add-in pages (`Default.html`, `DesktopPane.html`, `MobilePane.html`, `Functions.html`) intentionally have **no CSP** because Office.js frames first-party Microsoft telemetry and auth hosts at runtime; applying a CSP to those pages breaks Office.js initialization. Isolation there is provided by Outlook's add-in sandbox rather than our CSP.
- **Strict TypeScript** — `noExplicitAny` and all strict checks enabled; reduces a class of runtime errors
- **Dependabot** — automated dependency vulnerability alerts and updates
- **Secret scanning and push protection** — enabled on the repository
- **Publish gates** — the `python3 .github/scripts/publish.py` script used for deploys enforces a `code-review` gate (every changed file must be declared in backticks in a `docs/plans/*.md` file), a `security-review` gate (`npm audit --omit=dev --audit-level=high` clean, no common secret patterns in the diff, manifest `<Permissions>` non-regression versus `origin/main` unless the commit message carries `[permission-upgrade]`, and CSP `connect-src` non-regression on `staticwebapp.config.json`), and a `doc-sync` gate (`src/Scripts/` changes require a top-level doc change unless `[no-docs]` is in the commit message). Failed CI auto-dumps `gh run view --log-failed` output inline; live-site verification polls for the just-pushed commit SHA in the served JS bundle before declaring success.
