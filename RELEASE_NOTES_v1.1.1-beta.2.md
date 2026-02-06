# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1-beta.2] - 2026-02-06

### Added
- **Fixed Coordinate Fluid Grid**: A completely rewritten layout engine that respects strict (x, y) coordinates. Items no longer shift or "snowball" (Deep Cascade removed).
- **Strict Drag-and-Drop**: 
    - Drops are now strictly snapped to the cell under the item's center.
    - Invalid drops (collisions) are blocked and shown with a red indicator.
    - Removed auto-displacement behaviors.
- **Massive Localization Update**:
    - Added full translations for the Clock Widget configuration in all 20 supported languages.
    - Fixed missing Spanish translations for widget configuration.

### Changed
- Refactored `BookmarkGrid` template to remove legacy layout algorithms ("Skyline", "Bin Packing").
- Updated database hardening consistency.
- Improved input validation for user settings.

### Fixed
- **Settings UI**: Fixed malformed HTML tags that caused rendering issues in the Settings panel.
- **Drag-and-Drop**: Fixed a variable scope error (`ReferenceError`) in `handleDrop` that could cause crashes during specific drag operations.
- **HTML Validity**: Cleaned up template string interpolation to prevent loose spaces in tags.
