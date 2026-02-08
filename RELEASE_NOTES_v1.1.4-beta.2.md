# Lastboard v1.1.4-beta.2

## 🚨 Critical Fixes

### Repository Name Correction (CRITICAL)
Fixed critical typo where the project name "Lastboard" was incorrectly referenced as "Lashboard" throughout the codebase.

**Impact**: 40+ files affected
- ✅ Fixed `go.mod` module path: `github.com/CodigoSH/Lashboard` → `github.com/CodigoSH/Lastboard`
- ✅ Updated all Go package imports (9 files)
- ✅ Fixed GitHub API URLs for release checks
- ✅ Fixed `README.md` installation instructions and URLs
- ✅ Fixed `install.sh` repository references
- ✅ Fixed CI/CD workflow build flags
- ✅ Fixed default bookmarks in setup/user handlers
- ✅ Updated git remote URL

**Why this matters**: This ensures all links, downloads, and documentation point to the correct repository.

---

## 🌍 Translation Improvements (from v1.1.4-beta.1)

### Fluid Grid Architecture Translation
- Added `settings.fluid_grid_architecture` translation key
- Fixed hardcoded Spanish text "Arquitectura de Rejilla Fluida" in Personalization settings
- Synced translations across all 20 supported languages

**Supported Languages**:
English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Chinese, Japanese, Korean, Turkish, Polish, Indonesian, Arabic, Persian, Greek, Hindi, Bengali, Urdu

---

## 📦 Installation

### Quick Install (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/CodigoSH/Lastboard/main/install.sh | sudo bash
```

### Build from Source
```bash
git clone https://github.com/CodigoSH/Lastboard.git
cd Lastboard
bun run build
go build -o lastboard ./cmd/dashboard/main.go
./lastboard
```

---

## ⚠️ Breaking Changes

**Module Path Changed**: If you were building from source with v1.1.4-beta.1 or earlier, you need to:
1. Update your `go.mod` if you imported Lastboard as a module
2. Pull the latest changes: `git pull origin main`
3. Clean Go cache: `go clean -modcache && go mod tidy`
4. Rebuild: `go build -o lastboard ./cmd/dashboard/main.go`

---

## 🔄 Upgrade from v1.1.3 or v1.1.4-beta.1

For users running from binary:
1. Download the new binary for your platform
2. Stop the current Lastboard service
3. Replace the old binary with the new one
4. Restart the service

Your database and configuration will be preserved.

---

## 🐛 Known Issues

None reported for this release.

---

## 📝 Full Changelog

**v1.1.4-beta.2** (2026-02-08)
- fix(critical): Correct repository name from Lashboard to Lastboard across 40+ files
- fix(i18n): Add fluid grid architecture translation to all 20 languages

**Assets**:
- `lastboard-linux-amd64` - Linux x86_64 binary
- `lastboard-linux-arm64` - Linux ARM64 binary

---

**GitHub**: https://github.com/CodigoSH/Lastboard
