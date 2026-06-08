# Release: v1.5.2

### ✨ Features
- Block the in-app updater when the binary isn't writable
- Minor updates
- Optional unprivileged execution via PUID/PGID
### 🐛 Bug Fixes
- Preselect profile, stop toggle-close, remove section-switch zoom
### 🛠️ Refactors & Performance
- Extract templates and stylesheets from components
- Remove dead types and tighten any usage
- Split long handlers into cohesive helpers
### 📝 Other Changes
- Add native characterization tests for core logic
- Apply gofmt (struct tag alignment, Go 1.26)
- Compile the cmd/lastboard package instead of main.go only
- Docs(security): replace DOMPurify reference with actual htmlSanitizer
- Document PUID/PGID and unprivileged-mode updates
- Gofmt api/user.go (struct tag alignment, Go 1.26)

---
**Full Changelog**: [v1.5.1...v1.5.2](https://git.codigosh.com/CodigoSH/Lastboard/compare/v1.5.1...v1.5.2)
