# Release: v1.5.0-Beta.09

### ✨ Features
- Minor updates
### 🐛 Bug Fixes
- Correct wrong-language strings in zh, fr and ru locales
- Handle LastInsertId errors, log rate-limit failures, cleanup stale refs
- Remove dead 'administrator' role checks and update stale references
- Remove unused i18n keys, fix locale errors, and dead role check
### 🛠️ Refactors & Performance
- Rename isSuperAdmin to isFirstAdmin and update docs
### 📝 Other Changes
- Add integration tests for dashboard, user, system, and helpers handlers
- Fix go vet warnings - check http errors before using response
- Ignore .claude directory
- Remove deprecated downlevelIteration from tsconfig
- Retain last 10 stable releases in cleanup workflow

---
**Full Changelog**: [v1.5.0-Beta.08...v1.5.0-Beta.09](git@github.com:CodigoSH/Lastboard/compare/v1.5.0-Beta.08...v1.5.0-Beta.09)
