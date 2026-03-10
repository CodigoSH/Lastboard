# Release: v1.4.0

### ✨ Features
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
### 🐛 Bug Fixes
- Add default value for download count in update-stats workflow
- Add write permissions to cleanup workflow
- Correct delete_prerelease_only parameter name
- Remove hardcoded v1.41 API version to support Docker v29+
- Resolve double tooltips and transparent hovers on disabled docker action buttons
- Resolve state flip-flop causing infinite flickering loops
- Serialize unit_system to backend api correctly in user store and wind mph formatting
### 🛠️ Refactors & Performance
- Optimize stats polling, enable concurrent chunking, and remove scrollbar
- Rewrite API polling to sequential queue to fix 429 rate limit and UI flickering
### 📝 Other Changes
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
- Style(ui): improve city name scaling and overflow handling in clock widget
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

---
**Full Changelog**: [v1.3.3...v1.4.0](https://github.com/CodigoSH/Lastboard/compare/v1.3.3...v1.4.0)
