# Kashboard v1.0.1 Released! 🚀

We are excited to announce version 1.0.1 of Kashboard, focusing on **License Compliance** and **UI Polish**.

## 📋 Major Changes

### License Migration ⚖️
- The project is now properly licensed under the **Apache License 2.0**.
- Added `LICENSE` and `NOTICE` files to ensure full compliance.
- Updated documentation and badges to reflect the new license.

### Enhanced Visualization 🎨
- **Favicon Support**: Kashboard now includes a custom favicon based on the project logo, visible on all pages.
- **Improved "Add Menu"**: The dropdown menu for adding items is now more opaque and readable, with better background blurring to stand out against dashboard content.

### Bug Fixes 🐛
- **Section Resizing**: Fixed a critical bug where Sections could not be resized if they contained widgets or bookmarks. The collision logic has been improved to allow resizing parents as long as they still fully contain their children.

### Installation
New users can install Kashboard using our streamlined installer:
```bash
bash <(curl -sL https://raw.githubusercontent.com/codigosh/Kashboard/main/install.sh)
```
