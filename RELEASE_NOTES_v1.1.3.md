# Release Notes - v1.1.3 (Stability Fix)

**Kashboard v1.1.3** is a stability update to ensure seamless upgrades in the future.

## 🐛 Bug Fixes

### Update System Stability
- **Force Restart**: Fixed an issue where the seamless restart process could fail silently, leaving the old version running despite a successful update. The system now enforces a hard process exit if the seamless restart fails, allowing your system supervisor (Systemd/Docker) to automatically restart the service with the new version.

---
⚠️ **Important Note for v1.1.1 / v1.1.2 Users:**
If you are stuck on an older version even after clicking "Update", please **restart your service manually** one last time:
`systemctl restart kashboard`

After this manual restart, future updates to v1.1.3+ will work correctly.
