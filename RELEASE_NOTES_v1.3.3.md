# Release: v1.3.3




### 📝 Other Changes
- feat: Stable release 1.3.3
- chore(release): cleanup release notes
- chore(release): bump to v1.3.3-Beta.04
- feat: fix manifest.json build error and mobile view bookmark aspect ration
- fix: include manifest.json in build output
- style: fix mobile view bookmark aspect ratio override
- chore(release): cleanup release notes
- chore(release): bump to v1.3.3-Beta.03
- feat: Critical fix for redirect loops (DB Version 4) and UI layout improvements in update modal.n
- fix: resolve redirect loop after update and UI clipping in update modal
- chore(release): cleanup release notes
- chore(release): bump to v1.3.3-Beta.02
- feat: Core fixes: transparent hover, native backup modal, TRUST_PROXY support, SQL locks resolved.n
- docs: add TRUST_PROXY support and update security notes
- fix(core): resolve SQL locks, improve backup modal, adjust UI hovers and fix accent DB population
- chore(release): cleanup release notes
- chore(release): bump to v1.3.3-Beta.01
- feat: release 1.3.3-Beta.01
- Security fixes: MarkdownWidget XSS, auth.go bcrypt hash timing mitigation, and reverse proxy documentation
- Refactor Light Theme: Eliminate hardcoded legacy colors and shift to variable-based border/shadow system
- style: replace visible card borders with subtle shadows in light theme for a cleaner UI
- fix: address multiple backend issues: IPv6 parsing, dead comments, and unused fields
- ci: fix go:embed failure by building frontend before go steps
- ci: fix tests.yml formatting and build frontend before go tests
- ci: Build frontend before running Go tests to fix go:embed error
- chore: add .gitkeep to dist so go embed does not fail during tests before a build
- chore: Clean up narrative comments and dead code references in dashboardStore.ts
- chore: Translate Spanish comments to English in collisionService and WidgetConfigModal
- refactor: Remove findFirstAvailableSlot and replace with findCompactPosition
- chore: Remove redundant @ts-ignore for window.notifier in userStore
- Fix Notepad modal UI leak and rewrite Telemetry widget with SVG gauge layout for consistent scaling
- chore: untrack internal/web/dist/ build artifacts, update .gitignore
- docs: add Security & Widgets section, remove duplicate Key Features
- Change cron schedule to run every hour
- Change cron schedule to run every 6 hours
- Add release trigger to update-stats workflow
- Fix formatting and update API call in update-stats.yml
- Update version badge in README.md
- Enhance update-stats workflow with latest version
- Update installation badge in README.md
- Fix syntax in update-stats.yml script
- Fix payload construction for stats update
- Refactor payload creation for stats update
- Add GitHub Actions workflow to update install count
- docs: update credits in README and adjust air config
- Update logo image width in README
- Update logo
- Delete logo
- Update Logo
- Delete logo
- Update README.md
- Update README.md
- Add Logo
- Delete web/public/images/logo.png
- chore(release): cleanup release notes

---
**Full Changelog**: [v1.3.2...v1.3.3](https://github.com/CodigoSH/Lastboard/compare/v1.3.2...v1.3.3)
