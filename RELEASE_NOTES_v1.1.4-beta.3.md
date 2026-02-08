# Lastboard v1.1.4-beta.3

## 🐛 Critical Fixes

### Installation & Migration Fix
Fixed an issue where the installer treated a "Lashboard" (legacy) installation as a fresh install, causing service start failures due to port conflicts and potential data loss (by looking in the wrong directory).

**Improvements**:
- ✅ **Auto-Migration**: Detects legacy `lashboard` service.
- ✅ **Port Preservation**: Automatically reuses the port from the previous installation.
- ✅ **Data Migration**: Automatically copies data from `/var/lib/lashboard` to `/var/lib/lastboard`.
- ✅ **Service Cleanup**: Stops and disables the old `lashboard` service to prevent conflicts.

---

## 📦 Installation

### Quick Install (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/CodigoSH/Lastboard/main/install.sh | sudo bash
```

---

## 📝 Full Changelog

**v1.1.4-beta.3** (2026-02-08)
- fix(install): add auto-migration from Lashboard to Lastboard
- chore: bump version to 1.1.4-beta.3

---

**GitHub**: https://github.com/CodigoSH/Lastboard
