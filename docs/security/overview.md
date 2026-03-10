# Security Overview

Lastboard is built from the ground up with defense-in-depth principles. We prioritize keeping your personal infrastructure safe and completely isolated.

## Security Features Summary

- **Authentication System:** Secure sessions using HMAC-SHA256 signed tokens with strict expiration. Passwords are hashed using bcrypt. Constant-time verification mitigates timing attacks.
- **CSRF Protection:** All state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a matching `csrf_token` cookie and `X-CSRF-Token` header. Mismatches strictly return `403 Forbidden`.
- **CSP Headers:** A strict Content-Security-Policy is enforced, restricting resource loading to `self` alongside specific trusted domains (e.g., Open-Meteo, jsdelivr). `X-Frame-Options` and `X-Content-Type-Options: nosniff` are applied to all responses.
- **Rate Limiting:** A token-bucket algorithm strictly throttles protected API routes (20 req/s, burst 50) and auth paths (5 req/s) to prevent bruteforce attacks, with automatic cleanup of stale IP entries.
- **XSS Prevention:** User-submitted content (like templates or Markdown blobs) is processed via DOMPurify to sanitize HTML payloads before attachment to the DOM.
- **TRUST_PROXY:** For reverse proxy deployments, Lastboard safely reads the `X-Forwarded-For` header for IP blacklisting/rate-limiting, only when explicitly configured via the `TRUST_PROXY=true` flag.

## Update Proxy Transparency

To provide a secure, reliable update experience, our web installer and UI update mechanism communicate with a private proxy server (`api-updates.codigosh.com`) rather than hitting the GitHub API directly.

- **No Tracking:** The proxy does not store IP addresses, user identifiers, or telemetry.
- **No Modification:** It strictly parses JSON metadata from the official repository release channels. Binaries are never modified.
- **Token Protection:** It prevents exposure of organization GitHub Personal Access Tokens (PATs) used to bypass rate limits.

## Reporting Vulnerabilities

If you discover a security vulnerability within this project, please contact us directly. 

We ask that you do not report security vulnerabilities through public GitHub issues to prevent zero-day exposure. We will acknowledge your report within 48 hours and provide a timeline for resolution.

---
[← Previous page](../widgets/docker.md) | [Next page →](headers.md)
