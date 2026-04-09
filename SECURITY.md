# Security Policy & Infrastructure Transparency

## 🛡️ Secure Update Delivery
**Lastboard** is committed to transparency and user security. Updates are delivered directly and verifiably — no third-party intermediaries.

### Direct Forgejo Release Distribution
The web installer and in-app update mechanism communicate directly with our self-hosted Forgejo instance (`git.codigosh.com`). Release metadata and binaries are fetched without any proxy or intermediary.

* **No middlemen:** Version checks and binary downloads go directly from your server to `git.codigosh.com`.
* **Checksum verification:** Every binary download is verified against a `checksums.txt` file published alongside each release. Installation aborts if the hash does not match.
* **No tracking:** No IP addresses, user identifiers, or telemetry are collected at any point in the update process.
* **Verified source:** All releases are signed by the CI pipeline and published exclusively to the official `CodigoSH/Lastboard` repository on `git.codigosh.com`.

### Reporting a Vulnerability
If you discover a security vulnerability within this project, please contact us directly.

We ask that you do not report security vulnerabilities through public issue trackers. We will acknowledge your report within 48 hours and provide a timeline for resolution.
