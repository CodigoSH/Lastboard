# Release Notes - v1.1.2 (Hotfix)

**Kashboard v1.1.2** is a critical hotfix release that addresses a logic error in the update detection system.

## 🐛 Bug Fixes

### Update System Logic
- **Fixed Beta Detection**: The update checker previously only looked at the *very last* release from GitHub. Because release dates can fluctuate with hotfixes, a stable release could be "hidden" behind a newer beta release in the list, preventing users from seeing stable updates.
- **Improved**: The system now fetches the last 5 releases and intelligently selects the newest version that is an upgrade over your current installation, prioritizing stable releases correctly.

---
*Recommended for all users experiencing issues with "Update Available" notifications.*
