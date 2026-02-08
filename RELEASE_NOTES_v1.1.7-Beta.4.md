# Release Notes: v1.1.7-Beta.4

## 🩹 Critical Mobile Fixes
- **Fixed:** Bookmarks are now forcefully rendered in **Mobile Mode** on all screens smaller than 768px, regardless of touch capability detection.
- **Problem Solved:** Addressed issue where some devices (like Pixel 9a) were being treated as desktop, resulting in a broken, invisible grid layout.
- **Mechanism:** Implemented hybrid detection (`pointer: coarse` OR `width < 768px`) to robustly trigger the simplified list view.

## 🧹 Cleanup
- Consistent i18n synchronization.
- Removed legacy layout artifacts.
