
# HeaderLab

[![Build and Deploy](https://github.com/mgieselman/headerlab/actions/workflows/build.yml/badge.svg)](https://github.com/mgieselman/headerlab/actions/workflows/build.yml)
[![Test](https://github.com/mgieselman/headerlab/actions/workflows/test.yml/badge.svg)](https://github.com/mgieselman/headerlab/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/mgieselman/HeaderLab/graph/badge.svg?branch=main)](https://codecov.io/gh/mgieselman/HeaderLab)
[![Node 22](https://img.shields.io/badge/node-22-brightgreen.svg)](https://nodejs.org/)
[![ESLint](https://img.shields.io/badge/ESLint-enabled-4B32C3.svg)](https://eslint.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Email header analyzer — parses raw transport headers into human-readable routing, timing, and security analysis. Runs as a standalone web app and as a Microsoft Outlook add-in.

**Live app:** [https://headerlab.gieselman.com](https://headerlab.gieselman.com)

![HeaderLab add-in showing Summary tab with routing, authentication, and spam analysis results](docs/screenshot-addin.png)

## Relationship to microsoft/MHA

HeaderLab started as a fork of [microsoft/MHA](https://github.com/microsoft/MHA) to fix the EWS authentication issues with M365.

With Exchange Web Services (EWS) being retired in modern Microsoft 365 tenants, the header retrieval layer was rewritten around the Office.js `getAllInternetHeadersAsync` API (Mailbox 1.9+). Outlook on Desktop and Outlook on the Web honor that API directly; Outlook for iOS has not implemented `getAllInternetHeadersAsync` despite advertising Mailbox 1.9 requirement-set support, so a Microsoft Graph fallback via Nested App Authentication (NAA + MSAL) is used on hosts where the direct API is unavailable. Alongside that, a full UI rebuild was undertaken — replacing the legacy frame-based multi-pane layout with a single-page TypeScript application, adding a proper component model, CSS custom properties for theming, and a Vite-based build pipeline.

The cumulative scope of these changes made merging back into the upstream MHA repository impractical.

## Features

- **Routing analysis** — visualizes the full delivery path with per-hop timing and delay attribution
- **Authentication results** — SPF, DKIM, and DMARC pass/fail with RFC links
- **Antispam verdicts** — parses `X-Forefront-Antispam-Report` and `X-Microsoft-Antispam` headers
- **Rule-based diagnostics** — flags configuration issues and anomalies
- **Outlook add-in** — retrieves headers directly from the selected message via Office.js, with a Microsoft Graph fallback (NAA) for Outlook on iOS where the native API is not yet implemented
- **Standalone web app** — paste raw headers and analyze without signing in
- **Light / dark / system theme** — persisted to localStorage
- **Copy to clipboard** — export the current view or a plain-text report

## Installing the Outlook Add-in

HeaderLab works as an Outlook add-in for Windows, Mac, and Outlook on the web. Once installed, it appears in the ribbon when you open or select a message and retrieves headers automatically.

Sideload the add-in using the hosted manifest URL — no AppSource listing required.

**Outlook on the web**
1. Open [Outlook on the web](https://outlook.office.com) and select any message
2. Click the **···** overflow menu → **Get Add-ins**
3. Select **My add-ins** → **Add a custom add-in** → **Add from URL**
4. Paste the manifest URL:
   ```
   https://headerlab.gieselman.com/manifest.json
   ```
5. Click **OK** and accept the warning — HeaderLab will appear in the ribbon

**Outlook for Windows / Mac**
1. Open Outlook and go to **Home** → **Get Add-ins** (or **Store**)
2. Select **My add-ins** → **Add a custom add-in** → **Add from URL**
3. Paste the same manifest URL above and click **Install**

**Organization-wide deployment (Microsoft 365 admin)**
1. Go to the [Microsoft 365 admin center](https://admin.microsoft.com) → **Settings** → **Integrated apps**
2. Click **Upload custom apps** → **Office Add-in** → **Upload manifest file (.xml or .json)**
3. Upload `manifest.json` from this repo (or point to the URL above)
4. Assign to users or groups and deploy

**Using the add-in**

1. Select or open a message in Outlook
2. Click **HeaderLab** in the ribbon (or the **···** overflow menu on mobile)
3. The add-in opens and displays the routing, security, and diagnostics tabs automatically

### Standalone web app

No installation needed — paste raw headers directly at:

**[https://headerlab.gieselman.com](https://headerlab.gieselman.com)**

## Quick Start (development)

**Requirements:** Node >= 18.12.0 (CI uses Node 22)

```bash
npm ci            # install dependencies
npm run dev       # dev server at http://localhost:44336
npm test          # lint + all tests
npm run build     # production build → Pages/
```

### Other commands

```bash
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run test:watch    # Vitest in watch mode
npm run size          # check bundle size budgets
npx vitest run src/Scripts/path/to/file.test.ts  # single test file
```

## Self-hosting

The manifests and hosted app at `headerlab.gieselman.com` are configured for the maintainer's deployment. **If you fork this repo and self-host, you must create your own Entra ID app registration** for the Graph/NAA fallback path — do not reuse the client ID in the manifests. The add-in's direct Office.js path works without any Entra setup, but the iOS fallback requires it.

Steps to self-host:

1. **Register an Entra ID app** (required for the Graph fallback used on Outlook for iOS)
   - Create a new app registration in [Entra ID](https://entra.microsoft.com)
   - Add a SPA redirect URI: `brk-multihub://<your-domain>`
   - Set the Application ID URI to `api://<your-domain>/<your-client-id>`
   - Grant the `Mail.Read` delegated permission (Microsoft Graph)

2. **Set build secrets / environment variables**
   - Entra client ID — set GitHub secret `HEADERLAB_NAA_CLIENT_ID` (this is also the env var name the build reads in [vite.config.ts](vite.config.ts)).
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` — your deployment token
   - `APPINSIGHTS_INSTRUMENTATIONKEY` — optional

3. **Update the manifests**
   - Replace all occurrences of `headerlab.gieselman.com` in `Manifest.xml` and `manifest.json` with your domain
   - Replace the client ID GUID with your own

> **Note:** The standalone web app (paste-and-analyze) works without any Entra setup. The Outlook add-in works without Entra on Desktop and Web, where the Office.js `getAllInternetHeadersAsync` API is implemented. Only Outlook for iOS requires the Graph/NAA fallback (and therefore the Entra registration), because Microsoft hasn't implemented the API on iOS.

## Deployment

Deployed to Azure Static Web Apps from `Pages/`. Push to `main` triggers the build and deploy workflow. Secrets required:

| Secret | Purpose |
|--------|---------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token |
| `HEADERLAB_NAA_CLIENT_ID` | Entra ID app registration for the Graph/NAA iOS fallback |
| `APPINSIGHTS_INSTRUMENTATIONKEY` | Application Insights (optional) |

Pushing to `main` runs CI; the deploy is gated by the `python3 .github/scripts/publish.py` script when invoked from the developer machine. See `.github/skills/publish/SKILL.md` for the full set of pre-push gates and post-push verifications.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

> **Note on copyright:** The MIT license originally carried a Microsoft copyright from the shared MHA codebase lineage. HeaderLab is independently maintained; the copyright has been updated to reflect the current maintainer.
