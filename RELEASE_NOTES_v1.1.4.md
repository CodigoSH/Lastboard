# Lastboard v1.1.4

This release brings significant improvements to the dashboard layout, responsiveness, and internal management tools.

## Highlights

### 🎨 UI & Layout Refinements
- **Adaptive Grid**: Replaced fixed widget width with a customizable **"Grid Columns" slider** in the preferences. Choose between 3 and 16 columns for a perfectly tailored layout.
- **Improved Ping Indicators**: Bookmark status dots are now fully responsive using container-relative units (`cqi`). They maintain their position and size proportionally as you resize your browser.
- **Status Persistence**: Health check status (Up/Down) is now managed via the central state store, ensuring indicators retain their color even after global re-renders.

### 🌐 Translation & Localization
- **Language Coverage**: Standardized translations across all 20 supported languages.
- **Tooling Overhaul**: Consolidated internal translation scripts into a streamlined i18n toolkit for better maintainability and code quality.

### 🔧 Stability & Reliability
- **Beta Filter**: Enhanced update detection logic to strictly separate stable and beta channels.
- **Installer Upgrades**: A more professional installation experience with improved validation and a sleek new ASCII banner.
- **Bug Fixes**: Resolved various edge cases in responsive scaling and state management.

## Technical Changes
- Standardized binary naming to `lastboard` (lowercase) across all scripts and documentation.
- Refactored `StatusService` to decouple DOM manipulation from business logic.
- Optimized frontend build process and resolved stale TypeScript configuration issues.
