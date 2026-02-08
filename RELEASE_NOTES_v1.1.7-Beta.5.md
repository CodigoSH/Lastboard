# Release Notes: v1.1.7-Beta.5

## 🧹 Deep Code Cleanup
- **Simplified Mobile Detection:** Removed complex event listeners and verbose debug logging from `BookmarkGrid`.
- **Logic Refactor:** Implemented a clean, specific check for mobile devices (`width < 768px` OR `pointer: coarse`) without "garbage code" overhead.
- **Robustness:** Unified visibility logic to ensure items default to **visible** unless explicitly hidden, preventing "empty screen" issues on new deployments.

## 🚀 Performance
- Reduced bundle size by removing debug tracers.
- Optimized resize listeners for better battery life on mobile.
