# Release Notes: v1.1.7-Beta.1

## 🐛 Critical Bug Fixes

### Legacy Bookmark Compatibility (CRITICAL FIX)
- **Fixed:** Bookmarks with legacy `visibleMobile`/`visibleTablet` flags now display correctly on touch devices
- **Problem:** v1.1.6 only checked the new `visibleTouch` flag, ignoring legacy data
- **Solution:** Added backward compatibility layer that falls back to legacy flags when `visibleTouch` is not present

**Technical Details:**
```typescript
// New logic with legacy fallback
if (isTouch) {
    if (content.hasOwnProperty('visibleTouch')) {
        // Use new unified flag
        if (content.visibleTouch === false) return false;
    } else {
        // FALLBACK: Check legacy mobile/tablet flags
        const width = window.innerWidth;
        const isMobile = width < 768;
        const isTablet = width >= 768;
        
        if (isMobile && content.visibleMobile === false) return false;
        if (isTablet && content.visibleTablet === false) return false;
    }
}
```

**Impact:**
- ✅ New bookmarks with `visibleTouch` work as expected
- ✅ Old bookmarks with `visibleMobile`/`visibleTablet` now respect those flags
- ✅ 100% backward compatibility with existing data

---

## 🧹 Code Cleanup

### Binary Naming Standardization
- **Removed:** Old `Lastboard` (capital L) binary
- **Standard:** All references now use `lastboard` (lowercase) consistently
- **Updated:** Build commands and documentation

**Correct Build Command:**
```bash
pkill -f lastboard; bun run web/build.ts && go build -o lastboard ./cmd/dashboard && ./lastboard
```

---

## 📝 Files Modified

- `web/src/components/dashboard/BookmarkGrid/BookmarkGrid.ts` - Added legacy compatibility
- `package.json` - Version bump
- `internal/version/version.go` - Version bump
- `web/src/components/ui/SettingsContent/SettingsContent.ts` - Version bump

---

## ⚠️ Known Issues

None reported.

---

## 🔄 Migration Notes

**No migration required.** This release is fully backward compatible with v1.1.6 and earlier versions.
