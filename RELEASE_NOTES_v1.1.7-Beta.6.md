# Release Notes: v1.1.7-Beta.6

## 🩹 The True Root Cause Fix
- **Problem Identified:** While the CSS was correctly setting `display: flex` for mobile, the HTML template was still injecting **inline styles** for grid coordinates (`--x`, `--y`). Inline styles have higher specificity and were forcing the items into rigid desktop positions, often off-screen or overlapping.
- **The Fix:** Updated the template engine to **remove inline positioning styles** entirely when in Mobile Mode (`isTouchDevice`).
- **Result:** The browser's Flexbox layout now has full control, ensuring items flow naturally in a list as intended.

## 🧹 Maintenance
- Cleaned up template logic to decouple coordinate system from mobile view.
