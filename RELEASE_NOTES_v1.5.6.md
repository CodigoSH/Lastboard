### Added
- Accessibility improvements for modals and keyboard navigation
- Clearer, consistent save model in preferences
- Ed25519 release signing, verified in the auto-updater (OPS-02)
- Enable release signing (embed public key) + sign verify mode
- Fix profile editing on upgraded databases and require signed updates
- Improve modal and keyboard accessibility
- One honest "Saved" per auto-saved preference
- Quieter WebSocket reconnect logging
- Redesigned preferences panel with auto-save and consistent labels
- Regroup preferences so every card says what it holds
- Require a valid signature on every update (OPS-02)
- Security and reliability improvements with updated dependencies
- Signed updates, security hardening, accessibility and a redesigned preferences panel

### Fixed
- Accept X-Forwarded-Host in WS origin check for reverse proxies
- Body limits, IDOR checks, proxy-header gating and robustness
- Dispatch retention prune after a successful release, not on tag push
- Drop script-src 'unsafe-inline', use a per-request nonce (SEC-06)
- Escape user-controlled values across templates (XSS hardening)
- Harden WebSocket hub and validate Markdown link schemes
- Quick wins — healthcheck PORT, install RED, noopener, strings.Contains
- Quieter WebSocket reconnect logging
- Restore dropped column migrations so upgrades never break
- Sanitize Notepad content on load (XSS-01)

### Changed
- Add shared escape helpers and harden sanitizer URL scheme
- Drop now-unused serveFile helper
- Drop unnecessary 'as any' casts in BookmarkGrid (CAL-03)
- Migrate inline event handlers to addEventListener (CSP step 1)
- Add .env.example documenting all runtime variables (OPS-01)
- Add -race, govulncheck and staticcheck to the test workflow (TEST-04)
- Build the frontend in the security job before govulncheck/staticcheck
- Chore(deps): bump golang.org/x/net to v0.53.0 and Go to 1.26.5 (govulncheck)
- Chore(settings): drop the leftovers of the removed density slider
- Chore(test): use b.Loop() in crypto benchmarks
- Cover auth middleware, WS hub and Docker client (TEST-02)
- Docs(go): clarify migration ordering and host-vs-cgroup telemetry (CAL-04/05)
- Make NOTICE match what the project actually ships
- Revert(api): DeleteItem stays idempotent (undo ROB-06 404)
- Revert(api): keep IsSecureRequest lax on X-Forwarded-Proto (undo SEC-02)
- Sync guides with the current settings panel and update path
- Trim credits to licence-required attributions
