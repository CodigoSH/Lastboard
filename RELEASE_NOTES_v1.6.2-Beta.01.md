A maintenance beta: reliability fixes across the widgets, a lighter binary and a faster first paint.

### Fixed
- **Clock widget**: an unusable time zone no longer half-breaks the widget. It used to fall back to local time with seconds, blank the date and drop the city; now it degrades cleanly to local time with everything else intact.
- **Colour picker**: dragging now works on phones and tablets. The saturation area and the hue slider only listened for mouse events, so a finger drag did nothing at all. They also stopped the page from scrolling mid-gesture, and the trigger got an accessible name for screen readers.
- **Weather widget**: an unexpected response from the weather service now shows the error state instead of leaving the widget stuck on its spinner.
- **Uptime monitoring**: the 30-day retention window is applied on startup. An instance restarted more often than once a day never got round to pruning, so history grew without bound.
- Alert state is no longer kept for bookmarks that are no longer monitored.

### Changed
- **Smaller binary**: images, locales and the favicon were being embedded twice, and the README artwork shipped inside the binary too. Roughly 2.4 MB lighter.
- **Faster repeat visits**: translation files were re-downloaded on every page load because their URL changed each time. They are now cached properly between builds.
- Setup rejects requests on an already-configured instance before doing any work, and every API endpoint now caps the size of the request body it will read.
- Removed an unused component and 18 translation keys with no callers, across all 20 languages.

### Internal
- The frontend build now fails loudly if it cannot sync assets, instead of exiting successfully with stale files.
- New tests cover outbound monitoring alerts, the import parser and the setup endpoint.
