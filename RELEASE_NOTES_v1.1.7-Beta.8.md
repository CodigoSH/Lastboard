# Release Notes: v1.1.7-Beta.8

## 🛡️ Stability & Safety Check
- **Storage Sanitizer Verified:** Confirmed that the new storage sanitizer correctly cleans up legacy data without affecting current user preferences.
- **Linting & Build Fixes:** Resolved internal naming consistency issues in the data store that could have caused runtime errors in specific edge cases.
- **Performance:** Verified that the removal of legacy keys (`kashboard_`) significantly improves load times on devices with limited storage quota.

## 📱 Mobile Readiness
- This release solidifies the mobile fixes from Beta 6 & 7, ensuring a smooth experience on Pixel 9a and similar devices.
