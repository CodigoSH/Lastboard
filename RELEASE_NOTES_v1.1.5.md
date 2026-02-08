# Lastboard v1.1.5

This release addresses critical visibility issues on mobile and tablet devices, ensuring that bookmarks are correctly filtered based on user preferences.

## Highlights

### 📱 Enhanced Mobile & Tablet Experience
- **Touch-First Detection**: The dashboard now intelligently detects mobile and tablet modes by prioritizing **touch capability** (`pointer: coarse`).
  - **Mobile Mode**: Active on touch devices with a screen width less than `768px`.
  - **Tablet Mode**: Active on touch devices with a screen width of `768px` or greater.
- **Smart Filtering**: Bookmarks configured as "Hidden on Mobile" or "Hidden on Tablet" are now correctly filtered out on corresponding devices.
- **Dynamic Orientation Support**: The visibility logic automatically re-evaluates when rotating a device (e.g., from portrait to landscape), ensuring the correct filters are always applied.

### 🐛 Bug Fixes
- Fixed an issue where bookmarks were always visible on touch devices, ignoring user configuration.

## Technical Changes
- Updated `BookmarkGrid` component to implement device-specific filtering logic.
- Version synchronized across all system components.
