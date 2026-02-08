# Release Notes: v1.1.7-Beta.3

## 🧹 Code Cleanup & QA
- **Fixed:** Cleaned up 18 locale files removing legacy `visibleMobile`/`visibleTablet` keys
- **Fixed:** Removed redundant template filtering in `BookmarkGrid`
- **Added:** Comprehensive debug logging for touch visibility diagnostics
- **i18n:** Enforced strict key cleanup in `i18n-sync.ts` workflow

## 🌍 Translations
- synchronized all 20 languages with latest master keys
- Removed deprecated keys to reduce bundle size

## 📱 Mobile/Touch
- Verified fix for legacy bookmark visibility on touch devices
- Added robust fallback logic for migrating old bookmark flags
