# Release Notes: v1.1.6

## 📱 Unified Touch Device Visibility

### Simplified UI
- **Consolidated Toggle**: Replaced separate "Visible on Mobile" and "Visible on Tablet" switches with a single "Visible on Touch Devices" toggle
- **Cleaner Modal Design**: The Add/Edit Bookmark modal now has one row with:
  - Monitor Status (Ping) toggle
  - Visible on Touch Devices toggle

### Improved Logic
- **Single Flag**: Simplified from `visibleMobile` + `visibleTablet` to one `visibleTouch` flag
- **Early Filter Application**: Fixed race condition by calling `applyFilters()` before the first render in `BookmarkGrid.ts`
- **Backward Compatibility**: Items without the `visibleTouch` flag default to visible (true)

### Code Cleanup
- Removed all legacy references to `visibleMobile` and `visibleTablet`
- Cleaned up redundant filtering logic

---

## 🌍 Translation System Improvements

### New Workflow
- Created standardized **Translation Workflow** (`/translations`) documented in `.agent/workflows/`
- Clear process for adding, modifying, and deleting translation strings

### Key Updates
- Added `bookmark.visible_touch` translation in all 20 supported languages
- Removed legacy `bookmark.visible_mobile` and `bookmark.visible_tablet` keys from all locales

### Supported Languages (20)
`en`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `zh`, `ja`, `ko`, `nl`, `pl`, `tr`, `id`, `ar`, `fa`, `el`, `hi`, `bn`, `ur`

---

## 🛠️ Technical Changes

### Modified Files
- `web/src/components/ui/AddBookmarkModal/AddBookmarkModal.template.ts` - Simplified UI
- `web/src/components/ui/AddBookmarkModal/AddBookmarkModal.ts` - Updated form handling
- `web/src/components/dashboard/BookmarkGrid/BookmarkGrid.ts` - Fixed filter logic and race condition
- `web/public/locales/*.json` - Updated all 20 locale files
- `scripts/i18n-sync.ts` - Updated translation dictionary

### Build & Deploy
- All changes are backward compatible
- No database migrations required
- Existing bookmarks without `visibleTouch` will default to visible
