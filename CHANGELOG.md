# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/spec/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.1] - 2026-08-01

### Added
- Add six API presets and a searchable service picker
- Show uptime monitoring in the demo
- Six more API widget presets, a searchable service picker and uptime monitoring in the demo

### Changed
- Chore(go): point the module path at the real repository
- Cover the updater file helpers and extract the colour maths
- Docs(api-widget): cover the third preset field and the list-mode limit

## [1.6.0] - 2026-07-31

### Added
- 1.6.0 beta cycle: cross-dashboard item moves, generic API widget with presets, uptime monitoring with history and alerts, Homepage/Dashy import and native export, and a card motion system
- Accept dashboard_id in UpdateItem to move items
- Add 8 more service presets
- Add a Move action to the reorder sheet
- Add an Open Collective donation link to About
- Add append-only monitor_checks history store
- Add block auto-place primitives
- Alerts via ntfy/Gotify/webhook
- Always-on backend scheduler
- Arrival highlight after moving between dashboards
- Auto-refresh the open history drawer
- Bucket the heartbeat across the whole range
- Built-in uptime monitoring, a generic API widget, cross-dashboard moves and Homepage/Dashy import
- Bulk-move items via a kebab menu and topbar selection
- Clear-data action, Exit button, wider list
- Coordinated ranges and Uptime-Kuma-style hover
- Dissolve cards on delete
- Exclusive topbar modes and a donation link in About
- Full-screen status page with shared detail
- Generic API widget (metric mode)
- Group the service picker by category
- Guided service presets (AdGuard, Paperless, Immich)
- Import UI + materializer + native export button
- Keep topbar, redesign list rows, red clear menu
- Latency chart, incidents and range selector
- Make edit, settings and the status page exclusive modes
- Materialize newly-created cards
- Move bookmarks and widgets between dashboards
- Move sections between dashboards with their subtree
- Native YAML export + competitor parsers
- On/off toggle and topbar status icon
- Per-item history and uptime endpoint
- Redesign toasts (bottom-center, actions, progress bar)
- Rich hover tooltip on status dots
- Server-side fetch endpoint for the generic API widget
- Settings endpoint for mode and interval
- Status-checks toggle in settings
- Status-history detail drawer
- Status-page overview of all monitors
- Support list mode via array path extraction
- Support non-selectable category headers
- Timed probe and monitored-item enumeration
- Uptime-Kuma-grade detail redesign
- Visible board entrance + stronger create/move/delete cues

### Fixed
- Allow selecting an option with an empty value
- API config polish and config-on-add
- History drawer crashed on services with no outages
- Invalid Date in history timestamps
- Probe the URL stored in bookmark content
- Robust positioning, centered callout, click-to-toggle
- Stop run-together changelog headers
- Use the panel's own field styling for notify URL/token

### Changed
- Dedicated Data section, disambiguate backup vs import
- Drawer footer and modal-style close button
- Recent-beats heartbeat like Uptime Kuma
- Split Monitoring and Notifications sections
- Chore(lint): modernize remaining b.N benchmarks to b.Loop()
- Chore(lint): satisfy sqlrowserr and modernize analyzers
- Clarify that new dashboards are created from the Add menu, not the switcher
- Docs(changelog): reflow historical entries to the correct formatting
- Docs(readme): cover the API widget, monitoring and import/export
- Document API widget, monitoring, dashboards, import/export and preferences
- I18n(dashboard): clarify move picker title as 'Move to… (Dashboard)'
- I18n(dashboard): translate the move-to picker into all locales
- Revert(mobile): drop move-to-dashboard from the reorder sheet
- Show the Add (+) menu when creating dashboards and bookmarks
- Style(monitoring): wider, column-aligned status-page list
- Use the new product mockup as the README hero

## [1.5.6] - 2026-07-24

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

## [1.5.5] - 2026-07-14

### Added
- Content widgets fill their tile (no redundant card padding); docker widget 5x3 for a legible container list
- Demo telemetry widget uses its real 1x3 size
- Fix mobile edit sheet (eye toggle, alphabetical hidden) and demo clock, status pings and Docker update notice
- Fixed 3x2 size and a 6-day forecast
- Fuller, tidier dashboards with more sections and bookmarks
- Make all widgets and multiple dashboards work without a backend
- Markdown widget uses interior space (reduced padding); demo Home layout with real widget sizes
- Mobile bookmark visibility toggle and a revamped interactive demo
- Notepad read-only padding and a fuller, tidier demo with more sections and bookmarks
- Notepad toolbar docked inside the widget (no more overflow in edit mode)
- Refresh seed content with two dashboards and modern icons
- Revamped interactive demo (all widgets, two dashboards, modern icons) and mobile bookmark visibility
- Tighten widget padding to use the interior space
- Toggle bookmark visibility from the reorder sheet
- Verify the automated release/image retention pipeline end-to-end
- Weather widget fixed 3x2 with 6-day forecast, and a leaner curated demo at real widget sizes

### Fixed
- Clock size, green status pings and Docker update notice
- Dock the toolbar inside the widget
- Give the telemetry widget its real 1x3 size
- Let content widgets fill their tile
- Minimal padding in read-only mode
- Repair eye-toggle, sort hidden alphabetically, shorten label
- Size the welcome markdown to its content and rebalance Home

### Changed
- Docker widget at 5x3 for a legible container list
- Leaner, curated dashboards at real widget sizes
- Add automated release/image retention (prune-releases)
- Add bookmarks guide covering mobile visibility and ordering
- Correct outdated details and remove broken footer nav
- Fix ineffective .gitignore patterns
- Point README documentation links to codigosh.com
- Remove deployment platform reference

## [1.5.4] - 2026-07-01

### Added
- Localized, informative update error messages

### Fixed
- Log the underlying cause when download/checksum fails
- Publish the Forgejo release as draft until assets are uploaded
- Show real, localized messages when an update fails

### Changed
- Ci(forgejo): revert upload-artifact to v3 (v4 unsupported on Forgejo)

## [1.5.3] - 2026-07-01

### Added
- Minor updates

### Fixed
- Normalize release notes to Keep-a-Changelog format

### Changed
- Extract pure i18n/icon-search logic into testable helpers
- Ci(forgejo): drop dead develop branch triggers
- Ci(forgejo): run full frontend test suite and bump upload-artifact to v4
- Docs(changelog): remove deployment platform references
- I18n: translate remaining English phrases (el, ur, hi, fa, id, ar, bn)
- Style(widgets): capitalize clock/weather text instead of uppercase
- Test(api): add characterization tests for UpdatePreferences, PerformUpdate guards and compareVersions

## [1.5.2] - 2026-06-08

### Added
- Block the in-app updater when the binary isn't writable
- Minor updates
- Optional unprivileged execution via PUID/PGID

### Fixed
- Preselect profile, stop toggle-close, remove section-switch zoom

### Changed
- Extract templates and stylesheets from components
- Remove dead types and tighten any usage
- Split long handlers into cohesive helpers
- Add native characterization tests for core logic
- Apply gofmt (struct tag alignment, Go 1.26)
- Compile the cmd/lastboard package instead of main.go only
- Docs(security): replace DOMPurify reference with actual htmlSanitizer
- Document PUID/PGID and unprivileged-mode updates
- Gofmt api/user.go (struct tag alignment, Go 1.26)

## [1.5.1] - 2026-04-28

### Added
- Add mobile reorder — drag-to-reorder bookmarks on touch devices
- Eliminate all 40 ts-ignore directives via proper type declarations
- Fix gopls warnings: unused params in serveLoginPage/serveIndexDemo and tagged switch on dbTheme
- Fix section drag and WebSocket server timeout
- Fix static asset gzip compression and immutable cache headers
- Improve status dots, notepad dock UX and health check resilience
- Minor updates
- Security hardening: zip-bomb cap, stricter file/dir perms, full cookie flags on logout, errcheck fixes in update flow
- Show skeleton cards immediately on page load instead of blank screen
- Stable release 1.5.1 - auditoria QA completa, Go 1.26.2, security hardening
- Test release for update system verification
- Upgrade Go 1.26.2, eliminate 49 unused variables/imports, enforce noUnusedLocals in tsconfig

### Changed
- Batch health checks, modal blur, faster boot sequence
- Rename FORGEJO_TOKEN secret to CI_TOKEN

## [1.5.0] - 2026-04-09

### Added
- Add automated release cleanup workflow
- Add beta/stable release channel selection
- Add favicon to all pages
- Add offline indicator and strict backend validation
- Add option to display selected city name with translations
- Add 'Remember Me' translations for all 20 supported languages
- Added docker installations counter to readme
- Added official live demo link to readme
- Adjust telemetry padding to 1/5th of standard
- Adopt Apache 2.0 license with proper attribution
- Apply accent color to personalization sliders
- Apply native translations for the clock widget location config prompt
- Audit findings fixes (Tasks 1-10)
- Automate CHANGELOG.md updates in release script
- Changed default github bookmark icon to git
- Clean development and demo logs from console
- Clock dirty check cache on render, remove telemetry text
- Complete account persistence and fix avatar database schema
- Complete dashboard reset with professional 1x1 and 1x2 sizing parity
- Complete icon picker and translations
- Complete notepad i18n system and global translation rollout
- Complete widget localization, styling polish, and telemetry fixes
- Comprehensive internationalization and code health improvements
- Core fixes: transparent hover, native backup modal, TRUST_PROXY support, SQL locks resolved.n
- Corrected installations badge label to english
- Critical fix for redirect loops (DB Version 4) and UI layout improvements in update modal.n
- CSP Policies, fix modal outlines, and markdown widget display bug
- Customize default install, fix setup, debug bookmark visibility
- Deep fix for responsive dashboard grid
- Demo mode aesthetics and readme organization
- Demo mode overhaul: isolated localStorage demo, DEMO_ONLY env var, and demo route gating
- Demo mode visibility and widget 1x2 sizing parity
- Dirty check caching for telemetry and clock widgets
- Disable stop action for lastboard-agent container in docker widget to prevent accidental disconnection
- Display dynamic version in installer banner
- Display fallback choose location text on clock widget when no city is configured
- Enhance security with non-root user and healthcheck
- Exact dashboard layout parity with reference image
- Extend session duration to 30 days and improve release changelog accuracy
- Final translation refinements and UI parity fixes
- Finalize translations and improve factory reset UX
- Fix: Client-side avatar resizing to prevent LocalStorage quota errors.
- Fix color picker visibility, positioning, and styling
- Fix github release workflow authentication and diagnostics
- Fix login credentials bug by using text/template for login.html
- Fix manifest.json build error and mobile view bookmark aspect ration
- Fix remaining hardcoded strings in WidgetConfigModal and sync locales
- Fix sqlite permission issues in docker with proactive checks
- Fixed broken docker pulls badge by using github downloads
- Fixed invalid badges by switching to v/tag endpoint
- Global security hardening, brand unification (Kashboard), and UX polish
- Global translations, login FOUC fix, and detailed drag/resize improvements
- Hotfix: Update Dockerfile base image to Go 1.24
- I18n refactor and unificationni18n refactor and unification
- I18n: translate tooltips and finalize 20-language supportni18n: translate tooltips and finalize 20-language support
- Implement advanced system settings and factory reset
- Implement atomic binary update system and about page
- Implement blank state for clock widget
- Implement client-side avatar resizing to prevent storage quota issues
- Implement complete setup system with premium UI and secure backend
- Implement fixed grid layout and touch mode architecture
- Implement fluid content scaling with container queries
- Implement global unit system (metric/imperial) replacing individual widget configs
- Implement intelligent dropdowns with drop-up logic and max-height
- Implement light mode, theme persistence, and unify button styles
- Implement native elastic infinite grid and stealth scroll
- Implement premium color picker with presets
- Implement professional plug-and-play docker permissions with smart entrypoint
- Implement professional release notes with categorization and cleanup commits
- Implement professional search filtering and dynamic layout
- Implement 'remember me' functionality with 30-day session option
- Implement resizable bookmarks and full backend api
- Implement responsive scaling for large screens (<27 inch monitors)
- Implement smart cleanup for release notes while preserving tag history
- Implement user management, fix auth security, and restrict access
- Implementar sistema i18n global y corregir textos hardcodeados en Preferencias
- Implemented public health check endpoint for container orchestrators
- Improve settings UI labels and fix release script
- Improve settings UI labels and remove background size hint
- Individual dashboard background with preview, auto-resize, and translations
- Integrate CI GitHub Actions and Full Backend Audit fixes
- Launching v1.5.0-Beta.01
- Memory leak fixes and performance optimization
- Merge project name and logo into a single settings row
- Migrate from GitHub to Forgejo (git.codigosh.com)
- Minor updates
- Minor updates and synchronization
- Modal dropdown clipping and update default widget settings
- Multi-Dashboard, Reactive Pings, Localization (20 locales), and Layout Fixes
- Multi-dashboard system, icon picker improvements and bug fixes
- Optimization: Enable native cross-compilation (CGO disabled) for faster Docker builds.
- Optimize box-shadow animations for cpu
- Optimize mobile TopBar and refine search UI
- Optimize ping reactivity in BookmarkGrid
- Per-user project logo in topbar
- Premium Color Picker & Border Width Control
- Professional i18n refinements, UI glassmorphism fixes, and Docker config sync
- Professionalize demo mode aesthetics and content, update README docker docs
- Professionalize distribution (multi-stage build, ghcr workflow, fixed port)
- Refactor AddBookmarkModal layout, icons selection and UI polish
- Refactor clock and telemetry widgets, professionalize add widget modal and UI refinements
- Refactor nested layouts and enhance visuals
- Refine dashboard UI
- Refine setup UI, add translations (Back/Next/User), integrate logo & avatar, fix crash
- Refine widget density to 12px padding (retry)
- Release 1.3.3-Beta.01
- Remove ping pulse animation for 0% cpu idle
- Responsive bookmarks with larger icons and better typography
- Restore action buttons functionality and upgrade confirmation modal UI
- Restore technical documentation and finalize transparent docker architecture
- Restore theme persistence and polish dashboard spacing
- Revert docker agent port default to 2375 and update documentation
- Robust health monitoring, premium UI animations, and UX refinements
- Security & Stability Update: Implemented persistent SQLite rate limiting, structured logging with slog, graceful HTTP server shutdown, and comprehensive integration tests. Hardened backend APIs with MaxBytesReader, strict Content-Type headers, and Superadmin-only backup access. Added GitHub Actions CI for automated testing.
- Security enhancements, demo mode isolation, and release script cleanup
- Security hardening, performance optimization (DB pool, telemetry), and comprehensive test suite.
- Simplify role system to admin/user only
- Skip update check in demo mode to avoid JSON parsing error
- Smart port detection in install script
- Smooth resizing and refined bookmark hover animations
- Stable release 1.3.3
- Style: Enhance Login UI with glassmorphism Remember Me checkbox.
- Switch to tar.gz artifacts for better performance
- Telemetry widget blinking on reload
- Translate missing strings across all 20 locales
- Transparent and professional docker architecture with native permission handling
- UI tweaks for Notepad and Markdown widgets (lock position and scrollbar)
- Unificated glassmorphism and telemetry standardization
- Unified glassmorphism effects and telemetry widget standardization
- Unified login routing and diagnostic logs for remote debugging
- Unify bookmark modal aesthetics with widget config modal
- Unify docker persistence paths to /var/lib/lastboard
- Unify hidden label icon and fix modal persistence
- Unify shake effect and toast messaging in login and password modal
- Update docker widget translations and UI
- Use official github cli and persistent notes for reliable releases
- V1.3.0 release: border customization, public demo, and unified feedback
- V1.3.1 stable: demo mode overhaul, minor bug fixes and visual improvements

### Fixed
- Adaptive modals and sidebar with clamp() container queries
- Add auto-migration from Lashboard to Lastboard
- Add default value for download count in update-stats workflow
- Add diagnostic test push step
- Add fluid grid architecture translation to all 20 languages
- Add missing dependencies to benchmark and security jobs
- Add missing weather/clock translations and remove image feature from notepad
- Add non-hidden file to dist for go:embed compatibility
- Add sanitizer and relax mobile filters (Beta 7)
- Add write permissions to cleanup workflow
- Address multiple backend issues: IPv6 parsing, dead comments, and unused fields
- Adjust core widget sizes to 1x2 parity standard
- Allow resizing sections containing items
- Banner escaping and always prompt for release channel
- Complete dashboard reset to professional parity standard (1x1 and 1x2)
- Configure explicit HTTP timeouts to prevent memory leaks from idle connections
- Copy favicon.png to dist root
- Correct delete_prerelease_only parameter name
- Correct repository name from Lashboard to Lastboard
- Correct telemetry label to TEMP and sync all languages
- Correct wrong-language strings in zh, fr and ru locales
- Diagnose and fix docker socket permissions
- Disable CGO and remove Zig from release workflow
- Disable CGO to fix arm64 build hang
- Disable go cache and add 5m timeout to debug hang
- Disable manual bun cache to prevent timeouts, keep setup-go cache
- Disable provenance/sbom attestation (not supported by Forgejo registry)
- Drop buildx/skopeo, use direct docker build+push via daemon socket
- Enable BuildKit for docker build
- Enable native cross-compilation (fast build)
- Enable user preference inheritance in Shadow DOM
- Filter beta releases for non-beta users
- Fix bookmark custom icon rendering, modal duplicate selections and Papirus symlink handling
- Fix drag marker overlap issue by increasing z-index
- Fix formatting and update API call in update-stats.yml
- Fix gh release edit to not accept file uploads as positional arguments, use gh release upload instead
- Fix gosec action version to v2.25.0
- Fix modal grays clashing in light mode with adaptive CSS variables
- Fix Notepad modal UI leak and rewrite Telemetry widget with SVG gauge layout for consistent scaling
- Fix payload construction for stats update
- Fix search results layout for nested items
- Fix section resize layout bug refactor logic to store and cleanup db migration logs
- Fix shell quoting in gh release command
- Fix syntax in update-stats.yml script
- Force Installations badge cache refresh
- Force kill process on target port before start
- Force mobile layout on small screens (Beta 4)
- Grant security-events write permission for sarif upload
- Handle LastInsertId errors, log rate-limit failures, cleanup stale refs
- Implement public health check endpoint for container orchestrators
- Implement --version flag to prevent CI hang
- Include manifest.json in build output
- Increase input height to 46px to prevent text clipping
- Install docker cli in job container for docker workflow
- Install gosec via go install (not mirrored on data.forgejo.org)
- Make embed pattern explicit (dist/*) for IDE support
- Make release workflow resilient to missing release notes file
- Modernize script and improve robustness
- Move binary to /opt/kashboard to fix permission issues
- Output raw binaries matching install.sh expectations
- Panel logo tooltip, remove button and action button visibility
- Pin bun version to 1.3.11 to avoid GitHub API rate limit
- Pin gosec version to v2.21.0 for valid sarif output
- Prevent aggressive html caching with cache-control headers
- Prevent dashboard overlaps and invalid nesting using global collision logic
- Prevent DOM thrash on every stats update, reduce retry delay to 3s
- Release v1.1.2 hotfix for update logic
- Remove dead 'administrator' role checks and update stale references
- Remove docker-buildx from apt (not a package)
- Remove hardcoded v1.41 API version to support Docker v29+
- Remove inline grid styles in mobile mode (Beta 6)
- Remove redundant cp command incompatible with new build script
- Remove unused i18n keys, fix locale errors, and dead role check
- Rename changelog to RELEASE_NOTES_v1.1.1-beta.2.md for build script
- Replace broken ghcr badge with reliable downloads counter
- Replace buildx docker-container driver with direct docker build + manifest
- Replace gitea.* expressions in run blocks with env vars
- Replace gitea.* with github.* in docker workflow (schema validation)
- Replace gitea.* with github.*, install jq in release job
- Resolve double tooltips and transparent hovers on disabled docker action buttons
- Resolve redirect loop after update and UI clipping in update modal
- Resolve SQL locks, improve backup modal, adjust UI hovers and fix accent DB population
- Resolve state flip-flop causing infinite flickering loops
- Restore accidentally deleted collisionService test file
- Restore stable release version in latest badge
- Retry fetch silently on failure instead of showing error immediately
- Serialize unit_system to backend api correctly in user store and wind mph formatting
- Shorten settings labels for better UI density (advanced, backup, restore, grid)
- Show current version in Info section without hardcoding
- Stabilize drag ghost layout and enforce square rows
- Standardize workflows for consistency
- Strict release channel selection
- Sync widget config from store on item-id change
- Unify docker persistence paths to /var/lib/lastboard
- Unify frontend build process across all environments
- Update base image to go 1.24
- Update bun action to v2 and add debug steps
- Update checksum generation and release v1.0.3
- Update Go version to 1.26.0 to match go.mod
- Use docker.io for build + skopeo for push to bypass daemon auth
- Use dynamic port in healthcheck
- Use exact repository casing for badges to resolve invalid status
- Use Forgejo local IP for docker push
- Use git.codigosh.com registry (packages now enabled, fixes token endpoint mismatch)
- Use local Forgejo address for docker push (bypass Pangolin)
- Use official Docker CLI binary instead of docker.io package
- Use robust v/tag endpoint for release badge
- Use skopeo --all instead of --multi-arch
- Use skopeo for docker push to bypass buildx auth proxy bug
- Use Type=exec and show logs on failure
- Use upload-artifact@v3 (v4 not supported on Forgejo)
- Use upload/download-artifact@v3 in release workflow
- Whitelist internal/web/dist for IDE compatibility
- Write docker config directly without login, debug credential passing
- Write docker credentials directly for buildx builder access

### Changed
- Event-driven architecture, telemetry fixes, and optimizations
- Finalize UI polish (Z-Index fix, Notepad/Markdown setup, Task cleanup)
- Fix memory leaks in global event listeners
- Fixed Coordinate Fluid Grid & Layout Cleanup
- Fixed Coordinate Fluid Grid (Final Force Push)
- Limit db conns to 25 and pause telemetry when idle
- Optimize stats polling, enable concurrent chunking, and remove scrollbar
- Refactor Light Theme: Eliminate hardcoded legacy colors and shift to variable-based border/shadow system
- Refactor payload creation for stats update
- Refactor section headings in CONTRIBUTING.md
- Refactor update status UI, improve UX stability, and sync translations
- Remove findFirstAvailableSlot and replace with findCompactPosition
- Rename isSuperAdmin to isFirstAdmin and update docs
- Replace heavy box-shadow animations with GPU-accelerated pseudo-elements
- Restructure sync script and unify backup labels
- Rewrite API polling to sequential queue to fix 429 rate limit and UI flickering
- Simplified detection logic & cleanup (Beta 5)
- Simplify schema initialization with CREATE TABLE IF NOT EXISTS
- Unify release scripts into single release.sh
- Add .agent to .gitignore to keep assistant workflows local
- Add comprehensive backend and frontend tests
- Add concurrency to auto-cancel redundant runs
- Add Docker Compose example for Lastboard Agent
- Add docker pulls counter to README
- Add dynamic release badge
- Add FUNDING.yml
- Add gallery, config, and data sections to README
- Add GitHub Actions CI and remove redundant front-end console.logs
- Add GitHub Actions workflow to update install count
- Add .gitkeep to dist so go embed does not fail during tests before a build
- Add initial changelog.md following template
- Add integration tests for dashboard, user, system, and helpers handlers
- Add Logo
- Add missing icon to build section
- Add official live demo link to readme
- Add professional README
- Add release notes for v1.1.1-beta
- Add release notes for v1.1.4-beta.2
- Add release notes for v1.1.4-beta.3
- Add release notes for v1.1.4-beta.4
- Add release notes for v1.1.4-beta.5
- Add release notes for v1.3.0-Beta.01
- Add release trigger to update-stats workflow
- Add release workflow with proper permissions
- Add rel=noopener to demo link for security and better tab behavior
- Add Security & Widgets section, remove duplicate Key Features
- Add TRUST_PROXY support and update security notes
- Add workflow for cleaning up old releases
- Align Go version to 1.26.1 across all workflows and Dockerfile
- Audit: Security and code quality improvements (Tasks 1-10)
- Build frontend before running Go tests to fix go:embed error
- Change cron schedule to run every 6 hours
- Change cron schedule to run every hour
- Change default github icon to git
- Chore(ci): disable caching entirely for maximum robustness
- Chore(ci): re-enable go cache and cleanup debug comments
- Chore(ci): update release cleanup logic for tiered retention
- Chore(ci): upgrade artifact actions to v4/v3
- Chore(cleanup): remove unused websocket upgrader var
- Chore(docs): document translation workflow and update sync script with 'Remember Me' keys
- Clean up narrative comments and dead code references in dashboardStore.ts
- Cleanup: Remove release notes after tag
- Commit pending frontend files for grid persistence and cleanup
- Complete project rename to Lastboard
- Configure production install.sh with github releases URL and update binary
- Correct release script and revert incorrect CHANGELOG.md header
- Correct theme mode description (UI only supports light/dark)
- Create SECURITY.md
- Credit Homarr and Glassmorphism for theme inspiration
- Deep scrollbar suppression and persistent theme polish
- Delete logo
- Delete web/public/images/logo.png
- Deployment Infrastructure: Single Binary, Docker, & Installer
- Docker widget implementation, UI unification, and multi-language localization fixes
- Enable caching for go and bun to speed up workflows
- Enhance remember me checkbox with glassmorphism and fix localization
- Enhance update-stats workflow with latest version
- Exhaustive audit and telemetry fahrenheit support
- Expand configuration guide with full settings overview
- Final layout stability and scrollbar-free dashboard
- Finalize badges and push user tweaks
- Fix: Add non-hidden file to dist for go:embed compatibility
- Fix formatting and update API call in update-stats.yml
- Fix .gitignore to anchor root binaries and restore cmd source code
- Fix go vet warnings - check http errors before using response
- Fix go:embed failure by building frontend before go steps
- Fix: Make embed pattern explicit (dist/*) for IDE support
- Fix mobile view bookmark aspect ratio override
- Fix Notepad modal UI leak and rewrite Telemetry widget with SVG gauge layout for consistent scaling
- Fix payload construction for stats update
- Fix: Prevent dashboard overlaps and invalid nesting using global collision logic
- Fix release action (Go 1.24) and gitignore for notes
- Fix search results layout for nested items
- Fix section resize layout bug refactor logic to store and cleanup db migration logs
- Fix syntax in update-stats.yml script
- Fix tests.yml formatting and build frontend before go tests
- Fix: Whitelist internal/web/dist for IDE compatibility
- Generate comprehensive documentation
- Highlight quick install command
- I18n: add translations for metric/imperial settings and docker stop agent safe-guard to all 20 languages
- I18n: externalize remaining strings and synchronize translations across all locales
- I18n: fix remaining hardcoded strings in WidgetConfigModal and sync locales
- I18n: improve Settings UI labels for better clarity across all languages
- I18n: remove explicit 2MB size limit from background hints across all languages
- I18n: Translate UI tooltips and finalize 20-language support
- I18n: Update and synchronize translations for 20 languages
- I18n: Update clock widget description for timezone accuracy
- Ignore .claude directory
- Ignore kashboard binary and remove it from tracking
- Implement authentication system with secure login page matching setup design
- Implement change password UI and enable Enter key login
- Implement touch-based responsive layout for tablet and mobile
- Improve installation instructions and credits
- Improve project documentation and DX (makefile, air)
- Include install script and icon credits
- Increase opacity of add menu dropdown for better legibility
- Initial commit: Modular architecture refactor complete
- Integrate configuration and data into docker section to improve installation flow
- Limpieza de cache
- Migration: Bun + TypeScript architecture, modular components, and production build pipeline
- Minor cleanup in README docker-compose example
- Move credits section to bottom of README
- Move touch visibility to general tab, keep border color in customization
- Production Release: Silent Console, Notepad UX Final, & Global I18n Fixes
- Professional project-wide audit and cleanup
- Reduce bookmark modal height to 480px for better density
- Refactor: Finalize UI polish (Z-Index fix, Notepad/Markdown setup, Task cleanup)
- Refactor Light Theme: Eliminate hardcoded legacy colors and shift to variable-based border/shadow system
- Refactor payload creation for stats update
- Refactor section headings in CONTRIBUTING.md
- Refactor update status UI, improve UX stability, and sync translations
- Refine documentation formatting and remove redundant icons
- Refine edit mode aesthetics and fix border alignment
- Refine IconSelectionModal UI (fixed 3-row layout, alignment and centering)
- Refinement: Solidify Go-TS bridge, fix settings spacing, and restore bookmark hover effects
- Release v1.0.1 with UI polish, bug fixes and CI improvements
- Release v1.0.10
- Release v1.0.11
- Release v1.0.2
- Release v1.0.4 with release notes integration
- Release v1.0.5
- Release v1.0.6
- Release v1.0.7
- Release v1.0.8
- Release v1.0.9
- Release v1.1.0: Dynamic Login, Setup Fixes, and UI Polish
- Release v1.1.1
- Release v1.1.1-beta (fix responsive grid & item placement)
- Release v1.1.1-beta.2
- Release v1.1.3 (stability fix)
- Remove .agent from gitignore to track docs
- Remove .agent from tracking (keeping it locally)
- Remove deprecated downlevelIteration from tsconfig
- Remove deprecated set_version.ts script
- Remove development and demo logs from production console
- Remove Gallery section from README
- Remove leftover RELEASE_NOTES
- Remove redundant icon preview from icon picker
- Remove redundant @ts-ignore for window.notifier in userStore
- Remove release notes after release
- Remove release notes file
- Remove remaining release notes files
- Remove temporary scan file
- Remove tracked binary Lastboard and update gitignore
- Remove [Unreleased] and simplify CHANGELOG automation
- Rename cmd/dashboard to cmd/lastboard and update references
- Rename cmd/verify_version to cmd/lastboard-verify for consistency
- Reorder README sections for better installation flow
- Replace visible card borders with subtle shadows in light theme for a cleaner UI
- Restore centered footprint
- Restore original 'Kashboard Team' footer
- Restructure and polish documentation, improve DockerWidget UI
- Restructure installation instructions for visibility
- Retain last 10 stable releases in cleanup workflow
- Screenshot
- Security and Tech Debt: Persistent Rate Limiting, slog Migration, Graceful Shutdown, and systemd limits
- Security fixes: MarkdownWidget XSS, auth.go bcrypt hash timing mitigation, and reverse proxy documentation
- Simplify .gitignore to only include .agent/ per user request
- Streamline README and direct details to new docs folder
- Style Bun/TS badge with standard blue color
- Style(dashboard): increase edit button to 30px and icons to 16px
- Style(install): fix ASCII art legibility
- Style(install): polish UI for better user experience
- Style(install): use robust standard ASCII font
- Style(installer): apply robust 3D ASCII banner
- Style(installer): final banner polish
- Style(installer): improve ASCII banner aesthetics
- Style(installer): revert to clean standard ASCII
- Style(installer): use professional block ASCII banner
- Style(ui): apply custom dark tooltips to docker widget header buttons
- Style(ui): improve city name scaling and overflow handling in clock widget
- Style(ui): restore premium styles for dropdown items
- Style(ui): use clock icon instead of sun for clock widget blank state
- Sync build assets after manual revert
- Tests: Add integration tests for Login, Rate Limit, Backup/Restore and Dashboard isolation
- Translate Spanish comments to English in collisionService and WidgetConfigModal
- Trigger workflows after runner update
- UI: improve Add Bookmark modal (fix scrollbar, padding asymmetry, and enlarge icon selector to 52px)
- Untrack internal/web/dist/ build artifacts, update .gitignore
- Update badge URLs in README.md
- Update clock widget documentation defaults
- Update credits in README and adjust air config
- Update documentation with dashboard background and global unit system
- Update frontend artifacts for v1.1.4
- Update funding configuration
- Update .gitignore and remove build artifacts from tracking
- Update .gitignore with AI tools exclusion and sync pending changes
- Update go version to 1.26.0
- Update Homarr link to GitHub repository
- Update installation badge in README.md
- Update license badge to Apache 2.0
- Update logo
- Update Logo
- Update logo image width in README
- Update main README with links to new documentation, i18n support, and Docker widget
- Update README.md
- Update release notes for v1.0.4
- Update release workflow to use unified script
- Update section headers in README.md
- Update SECURITY.md
- Update setup-go version to 1.26.0 to fix covdata tool error
- Update support and recognition section in README
- Update touch visibility icons to mobile device style
- Update version badge in README.md
- Update widget documentation with new screenshots
- Use english label for installations badge
- Use standard CHANGELOG.md and include full project history
- Use target=_blank for demo link

## [1.4.1] - 2026-03-19

### Added
- Adjust telemetry padding to 1/5th of standard
- Unificated glassmorphism and telemetry standardization
- Unified glassmorphism effects and telemetry widget standardization

### Changed
- Update README.md

## [1.4.0] - 2026-03-10

### 🚀 Major Highlights
- **Docker Widget**: Native monitoring and management for containers with sequential API polling to prevent rate limits and flickering.
- **Personalization**: Individual dashboard backgrounds with per-user persistence, live previews, and auto-resizing.
- **Global Unit System**: Unified Metric vs. Imperial preferences across all compatible widgets.
- **Enhanced Clock**: New city name display options, improved blank state, and responsive scaling.

### Added
- Add automated release cleanup workflow
- Add option to display selected city name with translations
- Apply native translations for the clock widget location config prompt
- Automate CHANGELOG.md updates in release script
- Disable stop action for lastboard-agent container in docker widget to prevent accidental disconnection
- Display fallback choose location text on clock widget when no city is configured
- Implement blank state for clock widget
- Implement global unit system (metric/imperial) replacing individual widget configs
- Improve settings UI labels and fix release script
- Improve settings UI labels and remove background size hint
- Individual dashboard background with preview, auto-resize, and translations
- Minor updates
- Revert docker agent port default to 2375 and update documentation
- Update docker widget translations and UI

### Fixed
- Add default value for download count in update-stats workflow
- Add write permissions to cleanup workflow
- Correct delete_prerelease_only parameter name
- Remove hardcoded v1.41 API version to support Docker v29+
- Resolve double tooltips and transparent hovers on disabled docker action buttons
- Resolve state flip-flop causing infinite flickering loops
- Serialize unit_system to backend api correctly in user store and wind mph formatting

### Changed
- Optimize stats polling, enable concurrent chunking, and remove scrollbar
- Rewrite API polling to sequential queue to fix 429 rate limit and UI flickering
- Add Docker Compose example for Lastboard Agent
- Add initial changelog.md following template
- Add workflow for cleaning up old releases
- Chore(ci): update release cleanup logic for tiered retention
- Correct release script and revert incorrect CHANGELOG.md header
- Correct theme mode description (UI only supports light/dark)
- Docker widget implementation, UI unification, and multi-language localization fixes
- Exhaustive audit and telemetry fahrenheit support
- Expand configuration guide with full settings overview
- Fix .gitignore to anchor root binaries and restore cmd source code
- Generate comprehensive documentation
- I18n: add translations for metric/imperial settings and docker stop agent safe-guard to all 20 languages
- I18n: improve Settings UI labels for better clarity across all languages
- I18n: remove explicit 2MB size limit from background hints across all languages
- Professional project-wide audit and cleanup
- Refine documentation formatting and remove redundant icons
- Remove [Unreleased] and simplify CHANGELOG automation
- Rename cmd/dashboard to cmd/lastboard and update references
- Rename cmd/verify_version to cmd/lastboard-verify for consistency
- Restructure and polish documentation, improve DockerWidget UI
- Streamline README and direct details to new docs folder
- Style(ui): apply custom dark tooltips to docker widget header buttons
- Style(ui) improve city name scaling and overflow handling in clock widget
- Style(ui): use clock icon instead of sun for clock widget blank state
- Update badge URLs in README.md
- Update clock widget documentation defaults
- Update documentation with dashboard background and global unit system
- Update .gitignore and remove build artifacts from tracking
- Update go version to 1.26.0
- Update main README with links to new documentation, i18n support, and Docker widget
- Update README.md
- Update setup-go version to 1.26.0 to fix covdata tool error
- Use standard CHANGELOG.md and include full project history

## [1.3.3] - 2026-03-03

### Added
- Core fixes: transparent hover, native backup modal, TRUST_PROXY support, SQL locks resolved.n
- Critical fix for redirect loops (DB Version 4) and UI layout improvements in update modal.n
- Fix manifest.json build error and mobile view bookmark aspect ration
- Release 1.3.3-Beta.01
- Stable release 1.3.3

### Fixed
- Address multiple backend issues: IPv6 parsing, dead comments, and unused fields
- Fix formatting and update API call in update-stats.yml
- Fix Notepad modal UI leak and rewrite Telemetry widget with SVG gauge layout for consistent scaling
- Fix payload construction for stats update
- Fix syntax in update-stats.yml script
- Include manifest.json in build output
- Resolve redirect loop after update and UI clipping in update modal
- Resolve SQL locks, improve backup modal, adjust UI hovers and fix accent DB population

### Changed
- Add .gitkeep to dist so go embed does not fail during tests before a build
- Add Security & Widgets section, remove duplicate Key Features
- Add TRUST_PROXY support and update security notes
- Build frontend before running Go tests to fix go:embed error
- Clean up narrative comments and dead code references in dashboardStore.ts
- Fix go:embed failure by building frontend before go steps
- Fix mobile view bookmark aspect ratio override
- Fix tests.yml formatting and build frontend before go tests
- Refactor Light Theme: Eliminate hardcoded legacy colors and shift to variable-based border/shadow system
- Refactor payload creation for stats update
- Remove findFirstAvailableSlot and replace with findCompactPosition
- Remove redundant @ts-ignore for window.notifier in userStore
- Replace visible card borders with subtle shadows in light theme for a cleaner UI
- Translate Spanish comments to English in collisionService and WidgetConfigModal
- Untrack internal/web/dist/ build artifacts, update .gitignore
- Update credits in README and adjust air config

## [1.3.2] - 2026-02-23

### Added
- Audit findings fixes (Tasks 1-10)
- Clean development and demo logs from console
- Clock dirty check cache on render, remove telemetry text
- Complete icon picker and translations
- Comprehensive internationalization and code health improvements
- CSP Policies, fix modal outlines, and markdown widget display bug
- Dirty check caching for telemetry and clock widgets
- Fix login credentials bug by using text/template for login.html
- Fix remaining hardcoded strings in WidgetConfigModal and sync locales
- Integrate CI GitHub Actions and Full Backend Audit fixes
- Memory leak fixes and performance optimization
- Modal dropdown clipping and update default widget settings
- Optimize box-shadow animations for cpu
- Optimize ping reactivity in BookmarkGrid
- Remove ping pulse animation for 0% cpu idle
- Security & Stability Update: Implemented persistent SQLite rate limiting, structured logging with slog, graceful HTTP server shutdown, and comprehensive integration tests. Hardened backend APIs with MaxBytesReader, strict Content-Type headers, and Superadmin-only backup access. Added GitHub Actions CI for automated testing.
- Skip update check in demo mode to avoid JSON parsing error
- Telemetry widget blinking on reload
- Translate missing strings across all 20 locales
- UI tweaks for Notepad and Markdown widgets (lock position and scrollbar)
- Unified login routing and diagnostic logs for remote debugging

### Fixed
- Fix bookmark custom icon rendering, modal duplicate selections and Papirus symlink handling

### Changed
- Add .agent to .gitignore to keep assistant workflows local
- Add GitHub Actions CI and remove redundant front-end console.logs
- Fix memory leaks in global event listeners
- Remove deprecated set_version.ts script
- Remove development and demo logs from production console
- Replace heavy box-shadow animations with GPU-accelerated pseudo-elements

## [1.3.1] - 2026-02-19

### Added
- Demo mode overhaul: isolated localStorage demo, DEMO_ONLY env var, and demo route gating
- V1.3.1 stable: demo mode overhaul, minor bug fixes and visual improvements

## [1.3.0] - 2026-02-19

### Added
- Added docker installations counter to readme
- Added official live demo link to readme
- Changed default github bookmark icon to git
- Complete dashboard reset with professional 1x1 and 1x2 sizing parity
- Corrected installations badge label to english
- Demo mode aesthetics and readme organization
- Demo mode visibility and widget 1x2 sizing parity
- Exact dashboard layout parity with reference image
- Final translation refinements and UI parity fixes
- Fix color picker visibility, positioning, and styling
- Fix github release workflow authentication and diagnostics
- Fix sqlite permission issues in docker with proactive checks
- Fixed broken docker pulls badge by using github downloads
- Fixed invalid badges by switching to v/tag endpoint
- I18n refactor and unificationni18n refactor and unification
- I18n: translate tooltips and finalize 20-language supportni18n: translate tooltips and finalize 20-language support
- Implement intelligent dropdowns with drop-up logic and max-height
- Implement premium color picker with presets
- Implement professional plug-and-play docker permissions with smart entrypoint
- Implement smart cleanup for release notes while preserving tag history
- Implemented public health check endpoint for container orchestrators
- Premium Color Picker & Border Width Control
- Professional i18n refinements, UI glassmorphism fixes, and Docker config sync
- Professionalize demo mode aesthetics and content, update README docker docs
- Refactor AddBookmarkModal layout, icons selection and UI polish
- Refine dashboard UI
- Restore technical documentation and finalize transparent docker architecture
- Security enhancements, demo mode isolation, and release script cleanup
- Transparent and professional docker architecture with native permission handling
- Unify bookmark modal aesthetics with widget config modal
- Unify docker persistence paths to /var/lib/lastboard
- Unify hidden label icon and fix modal persistence
- Unify shake effect and toast messaging in login and password modal
- Use official github cli and persistent notes for reliable releases
- V1.3.0 release: border customization, public demo, and unified feedback

### Fixed
- Adjust core widget sizes to 1x2 parity standard
- Complete dashboard reset to professional parity standard (1x1 and 1x2)
- Correct telemetry label to TEMP and sync all languages
- Fix modal grays clashing in light mode with adaptive CSS variables
- Force Installations badge cache refresh
- Implement public health check endpoint for container orchestrators
- Increase input height to 46px to prevent text clipping
- Replace broken ghcr badge with reliable downloads counter
- Restore accidentally deleted collisionService test file
- Restore stable release version in latest badge
- Shorten settings labels for better UI density (advanced, backup, restore, grid)
- Unify docker persistence paths to /var/lib/lastboard
- Use exact repository casing for badges to resolve invalid status
- Use robust v/tag endpoint for release badge

### Changed
- Add docker pulls counter to README
- Add official live demo link to readme
- Add release notes for v1.3.0-Beta.01
- Add rel=noopener to demo link for security and better tab behavior
- Change default github icon to git
- Finalize badges and push user tweaks
- Finalize UI polish (Z-Index fix, Notepad/Markdown setup, Task cleanup)
- Fix release action (Go 1.24) and gitignore for notes
- Integrate configuration and data into docker section to improve installation flow
- Minor cleanup in README docker-compose example
- Move credits section to bottom of README
- Move touch visibility to general tab, keep border color in customization
- Reduce bookmark modal height to 480px for better density
- Refine edit mode aesthetics and fix border alignment
- Refine IconSelectionModal UI (fixed 3-row layout, alignment and centering)
- Remove redundant icon preview from icon picker
- Remove temporary scan file
- Reorder README sections for better installation flow
- Restore premium styles for dropdown items
- Restructure sync script and unify backup labels
- Sync build assets after manual revert
- Update funding configuration
- Update support and recognition section in README
- Update touch visibility icons to mobile device style
- Use english label for installations badge
- Use target=_blank for demo link

## [1.2.5] - 2026-02-15

### Added
- Fix: Client-side avatar resizing to prevent LocalStorage quota errors.
- Implement client-side avatar resizing to prevent storage quota issues

## [1.2.4] - 2026-02-15

### Added
- Style: Enhance Login UI with glassmorphism Remember Me checkbox.

### Changed
- Enhance remember me checkbox with glassmorphism and fix localization
- Highlight quick install command
- Restructure installation instructions for visibility

## [1.2.3] - 2026-02-14

### Added
- Optimization: Enable native cross-compilation (CGO disabled) for faster Docker builds.

### Fixed
- Disable CGO to fix arm64 build hang
- Enable native cross-compilation (fast build)

## [1.2.2] - 2026-02-14

### Added
- Hotfix: Update Dockerfile base image to Go 1.24

### Fixed
- Update base image to go 1.24

## [1.2.1] - 2026-02-14

### Added
- Add 'Remember Me' translations for all 20 supported languages
- Enhance security with non-root user and healthcheck
- Extend session duration to 30 days and improve release changelog accuracy
- Implement 'remember me' functionality with 30-day session option
- Professionalize distribution (multi-stage build, ghcr workflow, fixed port)
- Security hardening, performance optimization (DB pool, telemetry), and comprehensive test suite.

### Fixed
- Add missing dependencies to benchmark and security jobs
- Configure explicit HTTP timeouts to prevent memory leaks from idle connections
- Disable go cache and add 5m timeout to debug hang
- Disable manual bun cache to prevent timeouts, keep setup-go cache
- Grant security-events write permission for sarif upload
- Implement --version flag to prevent CI hang
- Pin gosec version to v2.21.0 for valid sarif output
- Prevent aggressive html caching with cache-control headers
- Remove redundant cp command incompatible with new build script
- Unify frontend build process across all environments
- Use dynamic port in healthcheck

### Changed
- Add concurrency to auto-cancel redundant runs
- Add gallery, config, and data sections to README
- Disable caching entirely for maximum robustness
- Document translation workflow and update sync script with 'Remember Me' keys
- Enable caching for go and bun to speed up workflows
- Improve project documentation and DX (makefile, air)
- Limit db conns to 25 and pause telemetry when idle
- Re-enable go cache and cleanup debug comments
- Refactor section headings in CONTRIBUTING.md
- Refactor update status UI, improve UX stability, and sync translations
- Remove unused websocket upgrader var
- Simplify .gitignore to only include .agent/ per user request
- Unify release scripts into single release.sh
- Update .gitignore with AI tools exclusion and sync pending changes
- Update release workflow to use unified script
- Upgrade artifact actions to v4/v3

## [1.2.0] - 2026-02-11

### Added
- Implement professional release notes with categorization and cleanup commits
- Minor updates and synchronization

### Fixed
- Add missing weather/clock translations and remove image feature from notepad

### Changed
- Add FUNDING.yml
- Remove release notes file

## [1.1.8] - 2026-02-08

### Fixed
- Add sanitizer and relax mobile filters (Beta 7)
- Force mobile layout on small screens (Beta 4)
- Remove inline grid styles in mobile mode (Beta 6)

### Changed
- Simplified detection logic & cleanup (Beta 5)

## [1.1.6] - 2026-02-08

## [1.1.5] - 2026-02-08

### Changed
- Remove tracked binary Lastboard and update gitignore
- Update frontend artifacts for v1.1.4

## [1.1.4] - 2026-02-08

### Added
- Add beta/stable release channel selection
- Implement fixed grid layout and touch mode architecture
- Implement fluid content scaling with container queries
- Implement responsive scaling for large screens (<27 inch monitors)

### Fixed
- Add auto-migration from Lashboard to Lastboard
- Add fluid grid architecture translation to all 20 languages
- Banner escaping and always prompt for release channel
- Correct repository name from Lashboard to Lastboard
- Enable user preference inheritance in Shadow DOM
- Filter beta releases for non-beta users
- Force kill process on target port before start
- Strict release channel selection
- Use Type=exec and show logs on failure

### Changed
- Add release notes for v1.1.4-beta.2
- Add release notes for v1.1.4-beta.3
- Add release notes for v1.1.4-beta.4
- Add release notes for v1.1.4-beta.5
- Apply robust 3D ASCII banner
- Complete project rename to Lastboard
- Final banner polish
- Improve ASCII banner aesthetics
- Remove remaining release notes files
- Revert to clean standard ASCII
- Use professional block ASCII banner

## [1.1.3] - 2026-02-06

### Changed
- Release v1.1.3 (stability fix)

## [1.1.2] - 2026-02-06

### Fixed
- Release v1.1.2 hotfix for update logic

## [1.1.1] - 2026-02-06

### Fixed
- Rename changelog to RELEASE_NOTES_v1.1.1-beta.2.md for build script

### Changed
- Add release notes for v1.1.1-beta
- Fixed Coordinate Fluid Grid & Layout Cleanup
- Fixed Coordinate Fluid Grid (Final Force Push)
- Release v1.1.1
- Release v1.1.1-beta (fix responsive grid & item placement)
- Release v1.1.1-beta.2

## [1.1.0] - 2026-02-05

### Changed
- Release v1.1.0: Dynamic Login, Setup Fixes, and UI Polish

## [1.0.11] - 2026-02-03

### Changed
- Release v1.0.11

## [1.0.10] - 2026-02-03

### Changed
- Release v1.0.10

## [1.0.9] - 2026-02-03

### Changed
- Release v1.0.9

## [1.0.8] - 2026-02-03

### Changed
- Release v1.0.8

## [1.0.7] - 2026-02-03

### Added
- Display dynamic version in installer banner

### Changed
- Release v1.0.7

## [1.0.6] - 2026-02-03

### Changed
- Release v1.0.6

## [1.0.5] - 2026-02-03

### Fixed
- Move binary to /opt/kashboard to fix permission issues

### Changed
- Release v1.0.5
- Remove release notes after release

## [1.0.4] - 2026-02-03

### Changed
- Release v1.0.4 with release notes integration
- Update release notes for v1.0.4

## [1.0.3] - 2026-02-03

### Fixed
- Update checksum generation and release v1.0.3

## [1.0.2] - 2026-02-02

### Added
- Smart port detection in install script

### Changed
- Release v1.0.2

## [1.0.1] - 2026-02-02

### Added
- Add favicon to all pages
- Adopt Apache 2.0 license with proper attribution

### Fixed
- Allow resizing sections containing items
- Copy favicon.png to dist root
- Disable CGO and remove Zig from release workflow
- Update bun action to v2 and add debug steps

### Changed
- Credit Homarr and Glassmorphism for theme inspiration
- Fix ASCII art legibility
- Increase opacity of add menu dropdown for better legibility
- Release v1.0.1 with UI polish, bug fixes and CI improvements
- Restore centered footprint
- Restore original 'Kashboard Team' footer
- Style Bun/TS badge with standard blue color
- Update Homarr link to GitHub repository
- Update license badge to Apache 2.0
- Use robust standard ASCII font

## [1.0.0] - 2026-02-02

### Added
- Add offline indicator and strict backend validation
- Apply accent color to personalization sliders
- Complete account persistence and fix avatar database schema
- Complete notepad i18n system and global translation rollout
- Complete widget localization, styling polish, and telemetry fixes
- Customize default install, fix setup, debug bookmark visibility
- Deep fix for responsive dashboard grid
- Finalize translations and improve factory reset UX
- Global security hardening, brand unification (Kashboard), and UX polish
- Global translations, login FOUC fix, and detailed drag/resize improvements
- Implement advanced system settings and factory reset
- Implement atomic binary update system and about page
- Implement complete setup system with premium UI and secure backend
- Implement light mode, theme persistence, and unify button styles
- Implement native elastic infinite grid and stealth scroll
- Implement professional search filtering and dynamic layout
- Implement resizable bookmarks and full backend api
- Implement user management, fix auth security, and restrict access
- Implementar sistema i18n global y corregir textos hardcodeados en Preferencias
- Optimize mobile TopBar and refine search UI
- Refactor clock and telemetry widgets, professionalize add widget modal and UI refinements
- Refactor nested layouts and enhance visuals
- Refine setup UI, add translations (Back/Next/User), integrate logo & avatar, fix crash
- Refine widget density to 12px padding (retry)
- Responsive bookmarks with larger icons and better typography
- Restore action buttons functionality and upgrade confirmation modal UI
- Restore theme persistence and polish dashboard spacing
- Robust health monitoring, premium UI animations, and UX refinements
- Smooth resizing and refined bookmark hover animations
- Switch to tar.gz artifacts for better performance

### Fixed
- Add non-hidden file to dist for go:embed compatibility
- Fix drag marker overlap issue by increasing z-index
- Fix search results layout for nested items
- Fix section resize layout bug refactor logic to store and cleanup db migration logs
- Make embed pattern explicit (dist/*) for IDE support
- Modernize script and improve robustness
- Output raw binaries matching install.sh expectations
- Prevent dashboard overlaps and invalid nesting using global collision logic
- Stabilize drag ghost layout and enforce square rows
- Whitelist internal/web/dist for IDE compatibility

### Changed
- Add dynamic release badge
- Add missing icon to build section
- Add professional README
- Add release workflow with proper permissions
- Commit pending frontend files for grid persistence and cleanup
- Configure production install.sh with github releases URL and update binary
- Deep scrollbar suppression and persistent theme polish
- Event-driven architecture, telemetry fixes, and optimizations
- Final layout stability and scrollbar-free dashboard
- Ignore kashboard binary and remove it from tracking
- Improve installation instructions and credits
- Include install script and icon credits
- Increase edit button to 30px and icons to 16px
- Polish UI for better user experience
