# Security Overview

Lastboard is built from the ground up with defense-in-depth principles. We prioritize keeping your personal infrastructure safe and completely isolated.

## Security Features Summary

- **Authentication System:** Secure sessions using HMAC-SHA256 signed tokens with strict expiration. Passwords are hashed using bcrypt. Constant-time verification mitigates timing attacks.
- **CSRF Protection:** All state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a matching `csrf_token` cookie and `X-CSRF-Token` header. Mismatches strictly return `403 Forbidden`.
- **CSP Headers:** A strict Content-Security-Policy is enforced, restricting resource loading to `self` alongside specific trusted domains (e.g., Open-Meteo, jsdelivr). `X-Frame-Options` and `X-Content-Type-Options: nosniff` are applied to all responses.
- **Rate Limiting:** A token-bucket algorithm throttles API requests per IP (20 req/s, burst 50), with automatic cleanup of stale entries. Login is additionally protected by an attempt-based lockout: after 5 failed attempts, that IP is locked out for 5 minutes to prevent brute-force attacks.
- **XSS Prevention:** User-submitted content (like templates or Markdown blobs) is passed through a built-in HTML sanitizer (`htmlSanitizer.ts`) that strips disallowed tags and attributes before attachment to the DOM. No third-party sanitization library is used.
- **TRUST_PROXY:** For reverse proxy deployments, Lastboard safely reads the `X-Forwarded-For` header for IP blacklisting/rate-limiting, only when explicitly configured via the `TRUST_PROXY=true` flag.
- **Unprivileged Execution:** Lastboard can run as a non-root user via `PUID`/`PGID`. It defaults to root to avoid bind-mount permission issues (common on Proxmox/LXC); when `PUID`/`PGID` are set, it fixes the data-directory ownership automatically and then drops privileges before serving any request. See [Configuration](../getting-started/configuration.md#puid--pgid-running-unprivileged).

## Update Delivery

The web installer and in-app update mechanism communicate directly with our self-hosted Forgejo instance (`git.codigosh.com`). There are no intermediaries or third-party services involved in the update path.

- **No Tracking:** No IP addresses, user identifiers, or telemetry are collected at any point.
- **No Modification:** Release metadata and binaries are fetched directly from the official `CodigoSH/Lastboard` repository. Nothing is modified in transit.
- **Checksum Verification:** Every binary is verified against a `checksums.txt` published with each release. Mismatches abort the installation immediately.

## Reporting Vulnerabilities

If you discover a security vulnerability within this project, please contact us directly. 

We ask that you do not report security vulnerabilities through public issue trackers to prevent zero-day exposure. We will acknowledge your report within 48 hours and provide a timeline for resolution.
