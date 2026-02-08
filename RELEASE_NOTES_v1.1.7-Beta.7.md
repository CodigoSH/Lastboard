# Release Notes: v1.1.7-Beta.7

## 🛡️ Critical Storage & Filter Fixes
- **Storage Sanitizer:** Added emergency cleanup on startup to remove legacy `kashboard_` data and free up `localStorage` space. This resolves `QuotaExceededError` crashes that were causing the app to load with 0 items.
- **Filter Logic Relaxed:** Removed aggressive filtering that hid Sections and Widgets on touch devices. Now all content is passed to the renderer, allowing CSS to handle visibility naturally.
- **Robust Loading:** Wrapped storage operations in safety blocks to prevent the entire dashboard from crashing if one item is corrupted.

## 📱 Mobile Experience
- Ensured bookmarks nested in sections are not silently dropped from the render tree.
- Verified hybrid detection logic works in tandem with new data loading safety.
