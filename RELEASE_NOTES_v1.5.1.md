# Release: v1.5.1

### ✨ Features
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

### 🛠️ Refactors & Performance
- Batch health checks, modal blur, faster boot sequence
### 📝 Other Changes
- Rename FORGEJO_TOKEN secret to CI_TOKEN

---
**Full Changelog**: [v1.5.0...v1.5.1](https://git.codigosh.com/CodigoSH/Lastboard/compare/v1.5.0...v1.5.1)
