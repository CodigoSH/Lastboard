# Release Notes - v1.1.1 (Stable)

We are proud to announce **Kashboard v1.1.1**, a major stability and feature update that introduces our new fluid grid engine and massive localization improvements.

## 🚀 Major Features

### Fixed Coordinate Fluid Grid
A completely rewritten layout engine that respects strict (x, y) coordinates.
- **Predictable Positioning**: Items stay exactly where you place them. No more unexpected shifts or "snowballing" cascades.
- **Strict Drag-and-Drop**: Snaps items strictly to the grid cell under the cursor.
- **Collision Safety**: Moving an item over an occupied space shows an invalid state instead of pushing other items away.

### Global Localization (20+ Languages)
We have achieved 100% translation coverage for all widget configurations.
- **New Languages**: Full support added/verified for Spanish, French, German, Japanese, Chinese, Russian, Arabic, and more.
- **Clock Widget**: Now fully localized in all supported languages.

## 🛠 Improvements & Polishes
- **UI Polish**: Section titles are now perfectly centered on their border lines (moved 1px up).
- **Settings UI**: Fixed HTML rendering issues in the settings panel where tags were visible.
- **Performance**: Optimized grid rendering and reduced layout thrashing.
- **Database**: Enhanced data integrity for coordinate storage.

## 🐛 Bug Fixes
- Fixed a crash in drag-and-drop caused by variable scope issues.
- Fixed malformed HTML template strings.
- Fixed an issue where the Clock Widget configuration text remained in English for some locales.

---
*Thank you for using Kashboard!*
