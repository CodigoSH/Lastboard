# v1.1.4-beta.8

## 📐 Geometric Alignment (Fluid Grid)
- **Pixel-Perfect Labels**: Re-engineered card layout using Flexbox to ensure all labels align perfectly to the bottom baseline, regardless of icon shape or size.
- **Dynamic Spacing**: Padding now scales proportionally (8% vertical, 4% horizontal) to maintain elegance across all device sizes.
- **Icon Sizing**: Standardized icon size to 45% of card width for a professional look.

## 💧 Fluid Widgets
- **Responsive Clock**: Time and date fonts now use `clamp()` and container query units (`cqi`) to scale smoothly from small tiles to full-screen displays.
- **Adaptive Telemetry**: CPU, RAM, and Temperature gauges now resize dynamically, using percentage-based padding and font sizes.
- **Visual Consistency**: Widgets now match the aesthetic behavior of standard bookmarks.

## 🐛 Bug Fixes
- Fixed "casa 55" alignment issue where short labels appeared lower than others.
- Resolved tiny text issues on large screens by implementing minimum clamp values.
