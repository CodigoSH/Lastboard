# Lastboard v1.1.4-beta.4

## 🔧 Installation Diagnostic Improvements

### Installer Enhancements
To assist in debugging installation issues where the service fails to start, we have improved the installer:

- **Type=exec**: The systemd service now uses `Type=exec` to ensure the service manager waits for the binary to execute before considering it started. This helps catch immediate startup failures.
- **Auto-Logs**: If the installation fails, the installer will now automatically print the last 50 lines of the service log (`journalctl`) to the console, helping you (and us) identify the root cause immediately.

---

## 📦 Installation

### Quick Install (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/CodigoSH/Lastboard/main/install.sh | sudo bash
```

---

## 📝 Full Changelog

**v1.1.4-beta.4** (2026-02-08)
- fix(install): use Type=exec and show logs on failure
- chore: bump version to 1.1.4-beta.4

---

**GitHub**: https://github.com/CodigoSH/Lastboard
