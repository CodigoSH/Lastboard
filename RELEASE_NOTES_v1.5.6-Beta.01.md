Beta build focused on security hardening, reliability and maintenance. Safe to upgrade from any recent version — no manual steps required.

### Security & Hardening
- Hardened Content-Security-Policy: inline scripts replaced with a per-request nonce.
- More thorough HTML escaping and content sanitization across the interface.
- Optional signed releases (Ed25519), verified automatically during auto-update.
- Stricter WebSocket origin handling and request size limits.

### Reliability
- Sturdier real-time telemetry connection, including behind reverse proxies.
- Assorted robustness fixes across the API and the updater.

### Under the hood
- Updated Go toolchain and dependencies.
- Expanded automated test coverage and stricter CI checks.
