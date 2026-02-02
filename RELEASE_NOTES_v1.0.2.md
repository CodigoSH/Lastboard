# Kashboard v1.0.2 Release Notes

Kashboard v1.0.2 brings significant improvements to the mobile experience, installation process, and UI polish.

## 🚀 Features & Improvements

*   **Mobile Experience Overhaul:**
    *   **Flattened View:** On mobile devices, sections are now visually removed ("flattened"), allowing nested bookmarks to flow seamlessly in the main grid for better use of limited screen space.
    *   **Smart Widget Sizing:** Widgets now automatically span full width (2 columns) on mobile to ensure readability and usability, preventing them from looking "squashed".
*   **Smart Installation & Updates:**
    *   The `install.sh` script now intelligently detects existing installations. If updating, it **automatically reuses your configured port** without prompting, making updates smoother and safer.
*   **UI Polish:**
    *   Restored the vibrant **Green** color for the "You are up to date" status indicator in Settings.

## 🐛 Bug Fixes

*   Fixed an issue where the update modal would display a dimmed/grey icon instead of green when the system was up to date.
*   Fixed layout issues on mobile devices where widgets appeared too small.
*   Improved CI/CD stability by removing unnecessary dependencies, ensuring faster and more reliable release builds.

## 📦 Installation / Update

To install or update to the latest version, simply run:

```bash
curl -fsSL https://raw.githubusercontent.com/codigosh/Kashboard/main/install.sh | sudo bash
```
