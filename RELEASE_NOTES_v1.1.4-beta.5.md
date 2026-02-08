# Lastboard v1.1.4-beta.5

## 🔧 Critical Fix: "Address already in use"

### Installer Enhancements
We identified that during upgrades or reinstallations, the previous service (or a zombie process) was holding onto the port (e.g., 3000), causing the new service to fail immediately with `bind: address already in use`.

**Fix applied:**
- ✅ **Port Liberation**: The installer now checks if the target port is in use.
- ✅ **Force Kill**: If the port is occupied, it attempts to kill the process holding it before starting the new service.

---

## 📦 Installation

### Quick Install (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/CodigoSH/Lastboard/main/install.sh | sudo bash
```

---

## 📝 Full Changelog

**v1.1.4-beta.5** (2026-02-08)
- fix(install): force kill process on target port before start
- chore: bump version to 1.1.4-beta.5

---

**GitHub**: https://github.com/CodigoSH/Lastboard
