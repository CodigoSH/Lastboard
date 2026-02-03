# Kashboard v1.0.5 Release Notes

This release includes critical fixes to the installation and update mechanism to ensure future updates work seamlessly.

## 🐛 Bug Fixes & Improvements

*   **Self-Update Permissions Fix:**
    *   The installation directory has been moved from `/usr/local/bin` to `/opt/kashboard`.
    *   This ensures the `kashboard` user has the correct permissions to update the binary without requiring root access during the auto-update process.
*   **Systemd Configuration:**
    *   Updated `kashboard.service` to disable `PrivateTmp`, facilitating smoother file operations during updates.

## 📦 Update Instructions

**Critical:** Due to the permission changes, you **must** update manually one last time to apply the new file structure:

```bash
curl -fsSL https://raw.githubusercontent.com/codigosh/Kashboard/main/install.sh | sudo bash
```
