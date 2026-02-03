# Kashboard v1.0.7 Release Notes

This release polishes the installation experience and solidifies the recent update system improvements.

## 🚀 Improvements

*   **Dynamic Installer Banner:**
    *   The `install.sh` script now dynamically fetches and displays the version number it is about to install (e.g., `v1.0.7`) in the welcome banner. No more guessing which version you are getting!

## 🐛 Bug Fixes & Stability

*   **Cumulative Fixes:** Includes all recent hardening for the auto-update mechanism (cross-device file moves, permission fixes, and checksum verification).

## 📦 Installation / Update

To install or update to the latest version:

```bash
curl -fsSL https://raw.githubusercontent.com/codigosh/Kashboard/main/install.sh | sudo bash
```
