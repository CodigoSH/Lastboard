# Security Policy & Infrastructure Transparency

## 🛡️ Secure Update Delivery
**Lastboard** is committed to transparency and user security. Updates are delivered directly and verifiably — no third-party intermediaries.

### Direct Forgejo Release Distribution
The web installer and in-app update mechanism communicate directly with our self-hosted Forgejo instance (`git.codigosh.com`). Release metadata and binaries are fetched without any proxy or intermediary.

* **No middlemen:** Version checks and binary downloads go directly from your server to `git.codigosh.com`.
* **Signature verification:** `checksums.txt` is signed with Ed25519 by the CI pipeline, and the installer verifies that signature against public keys compiled into it before it believes a single hash. A release signed by anything else is refused, not warned about. This needs `openssl` 3.0 or newer on the machine; older versions cannot verify Ed25519 from the command line at all, and the installer says so plainly rather than failing on an unknown option.
* **Checksum verification:** Every binary download is then verified against that `checksums.txt`. Installation aborts if the hash does not match.
* **No tracking:** No IP addresses, user identifiers, or telemetry are collected at any point in the update process.
* **Verified source:** All releases are signed by the CI pipeline and published exclusively to the official `CodigoSH/Lastboard` repository on `git.codigosh.com`.

### Reporting a Vulnerability
If you discover a security vulnerability within this project, please contact us directly at **admin@codigosh.com**.

We ask that you do not report security vulnerabilities through public issue trackers.
