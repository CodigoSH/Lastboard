# Kashboard v1.0.6 Release Notes

This release hardens the update process to handle cross-partition file moves, ensuring updates proceed smoothly on all Linux configurations.

## 🐛 Bug Fixes

*   **Update Robustness:**
    *   Implemented a fail-safe file move strategy for the auto-updater.
    *   Previously, updates could fail with "Failed to install new binary" if the temporary directory (`/tmp`) and the installation directory (`/opt`) were on different filesystems (which is common).
    *   The new logic automatically handles this by falling back to a copy-and-delete operation if the atomic rename fails.

## 📦 Installation / Update

To install or update to this latest version (and fix the updater for the future), run:

```bash
curl -fsSL https://raw.githubusercontent.com/codigosh/Kashboard/main/install.sh | sudo bash
```
