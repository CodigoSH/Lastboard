# Release: v1.5.0

## Highlights

**Multi-Dashboard** is here! Create, switch, and manage multiple dashboards with custom icons — organize your widgets exactly how you want.

### New Features
- Multi-Dashboard system with icon picker and per-dashboard configuration
- Docker widget: monitor and manage containers directly from your dashboard
- Individual dashboard backgrounds with preview and auto-resize
- Per-user project logo in topbar
- Global unit system (metric/imperial) replacing individual widget configs
- Clock widget: city name display, blank state, and timezone improvements
- Reactive ping monitoring for bookmarks
- Unified glassmorphism effects across all widgets
- Simplified role system (admin/user only)
- Health check endpoint for Docker/Coolify deployments
- Remember me (30-day session) on login

### Improvements
- Localization improvements across all 20 supported languages
- Adaptive modals and sidebar with responsive container queries
- Telemetry widget rewritten with SVG gauge layout
- Docker widget: optimized stats polling with concurrent chunking
- Performance: dirty check caching for telemetry and clock widgets
- GPU-accelerated animations replacing heavy box-shadow transitions
- Memory leak fixes in global event listeners
- Integration tests for dashboard, user, system, and handler layers
- Version displayed dynamically in Settings (no more hardcoding)

### Bug Fixes
- Weather widget: fixed DOM thrashing and silent retry on failure
- Docker widget: resolved state flip-flop causing infinite flickering
- Docker widget: removed hardcoded API version to support Docker v29+
- Fixed modal dropdown clipping and UI persistence issues
- Fixed SQLite lock issues and LastInsertId error handling
- Fixed i18n: corrected wrong-language strings in zh, fr, and ru locales

### Infrastructure
- Migrated from GitHub to Forgejo (git.codigosh.com)
- CI/CD with Forgejo Actions and Docker registry
- Multi-arch Docker images (amd64 + arm64)
- Docker image now available at `git.codigosh.com/codigosh/lastboard:latest`

---
**Full Changelog**: [v1.4.1...v1.5.0](https://git.codigosh.com/CodigoSH/Lastboard/compare/v1.4.1...v1.5.0)
