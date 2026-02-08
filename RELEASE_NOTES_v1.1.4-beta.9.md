# v1.1.4-beta.9

## 🐛 Critical Fixes
- **Beta Detection Logic**: Fixed a logic error where version comparisons were lexicographical (e.g., `beta.10` < `beta.9`). The system now correctly parses and compares numeric pre-release suffixes.
- **Preference Persistence**: Fixed the "Beta Tester" toggle resetting on page reload. The UI now correctly subscribes to the user store to reflect the saved state from the database.
- **Frontend Type Definitions**: Updated `UserPreferences` interface to include `widget_min_width` and `beta_updates`, resolving type errors.

## 🔧 Improvements
- **Debug Logging**: Added detailed server-side logging for the update check process to help diagnose future issues with GitHub API responses or version comparisons.
