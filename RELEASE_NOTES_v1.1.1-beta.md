# Kashboard v1.1.1-beta Release Notes

## 📱 Responsive & UI Fixes
- **Dynamic Grid Resizing:** Fixed an issue where sections and bookmarks would become distorted ("squashed") when changing the column count (e.g., from 12 to 10) without a page reload. The grid now recalculates metrics instantly.
- **Smart Scaling for Compact Screens:** Optimized CSS to use `clamp()` values for icons, text, and gaps. This ensures a clean layout on 12"-14" laptops and high-DPI screens where icons were previously too large.
- **Ghost/Collision Indicators:** Restored visibility of the green/red drop indicators during drag-and-drop operations, which were temporarily broken by the CSS updates.

## 🛠 Bug Fixes & Improvements
- **New Item Placement:** Fixed logic that placed new widgets outside the visible grid boundaries. The system now respects your active column configuration (PC/Tablet/Mobile) when finding the first available slot.
- **User Management:** Reduced latency in user deletion and updates with optimistic UI changes.

## ⚠️ Notes
- This is a **BETA** release. Please report any layout regressions on extreme screen sizes.
