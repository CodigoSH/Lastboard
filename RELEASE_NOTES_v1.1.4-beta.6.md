# Lastboard v1.1.4-beta.6

## 🔧 Widget Density Personalization Fix

### Problem Solved
User preferences for widget density (Settings > Personalization > Widget Min Size) were not being applied correctly. The grid would always use 140px widgets regardless of user settings.

**Impact**: On smaller screens like MacBook Pro 14" (~1250px available width), users couldn't adjust widget density to fit their layouts properly.

### Fix Applied
- **Removed hardcoded CSS value** in Shadow DOM that blocked user preference inheritance
- **Enabled CSS cascade** from `:root` (user preference) to grid component
- **Maintained robustness** with JavaScript fallback (140px default)

### How to Use
1. Open **Settings > Personalization**
2. Adjust "Widget Min Size" slider (recommended: 90px for 14" screens, 120px for larger)
3. Grid instantly adapts to fit more/fewer columns

---

## 📦 Installation

### Quick Install (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/CodigoSH/Lastboard/main/install.sh | sudo bash
```

### Upgrade from Previous Version
```bash
curl -fsSL https://raw.githubusercontent.com/CodigoSH/Lastboard/main/install.sh | sudo bash
```
The installer automatically detects and upgrades existing installations.

---

## 📝 Full Changelog

**v1.1.4-beta.6** (2026-02-08)
- fix(grid): enable user preference inheritance in Shadow DOM
- Allows widget density customization to work correctly across all screen sizes

---

**Previous beta.5** (2026-02-08)
- fix(install): force kill process on target port before start

**GitHub**: https://github.com/CodigoSH/Lastboard
