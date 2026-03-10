# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/spec/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-03-10

### 🚀 Major Highlights
- **Docker Widget**: Native, high-performance widget for monitoring and managing containers with sequential API polling to prevent rate limits and flickering.
- **Personalization**: Individual dashboard backgrounds with per-user persistence, live previews, and automatic resizing.
- **Global Unit System**: Centrally manage Metric vs. Imperial preferences across all compatible widgets (Weather, Telemetry, etc.).
- **Enhanced Clock**: New blank state, city name display options, and improved scaling for high-density layouts.

### ✨ Added
- **Native Docker support** with transparent routing for all API versions.
- **Dashboard backgrounds** with individual preference storage.
- **Metric/Imperial toggle** in global settings for unified widget data.
- **Automated release workflow** with tiered retention logic and changelog synchronization.
- **I18n Excellence**: Extensive translation updates for all 20 languages including native UI prompts.

### 🐛 Fixed
- **Docker Stability**: Resolved infinite flickering loops and 429 rate limit errors in container lists.
- **UI Polish**: Fixed double tooltips, transparent hovers on disabled buttons, and city name scaling.
- **CI/CD**: Corrected go version to 1.26.0 and fixed release cleanup permissions.

### 🛠️ Changed
- **Architecture**: Renamed main binaries to `lastboard` and `lastboard-verify` for consistent branding.
- **Performance**: Optimized stats polling with concurrent chunking and sequential queues.
- **Documentation**: Comprehensive overhaul of README and new dedicated `docs/` folder.

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
- Implemented public health check endpoint for coolify/docker
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
- Implement public health check endpoint for docker/coolify
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

