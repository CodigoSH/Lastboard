### Added
- An explicit view selector for the API widget
- Let the API widget's view be chosen explicitly
- Minor updates
- Put the whole update behind one modal with a timeline
- Reliability fixes across the widgets, a lighter binary and faster repeat visits
- Report the update progress step by step
- Update window, mobile scrolling and UI polish
- Update window with a step-by-step timeline

### Fixed
- Degrade gracefully on an unexpected weather payload
- Drop the ignored User-Agent on the geocoding request
- Fail the build when asset sync fails
- Flip the forecast tooltip when the top bar would cut it off
- Keep the clock working on an unusable time zone
- Let config modals scroll without clipping select dropdowns
- Let the dashboard scroll down to the last item on mobile
- Make the colour picker usable with touch and screen readers
- Name an expired session instead of blaming the update
- Prune history on startup and forget deleted monitors
- Refresh the starter dashboard for new installs
- Reject setup early and cap request bodies
- Restore the dark autofill colours in every text field
- Stop the scrollbar flashing when a dialog opens, and cover the rest
- Stop the scrollbar flashing when a widget dialog opens
- Tolerate a missing build stamp outside the bundler

### Changed
- Define the shared style primitives in one place
- Drop the shared input rule that overrode the components
- Make locale files cacheable
- Stop embedding duplicate and unused assets
- Unify motion curves, dialogs and inputs
- Build(release): make the release script fail safely and preview itself
- Chore(web): drop an unused component and its dead translations
- Ci(release): rebuild the website once the release is published
- Docs(release): notes for v1.6.2-Beta.03
- Docs(update): describe the update window
- I18n: translate the update window into every locale
- Style(ui): stop truncating long select labels and drop the native resizer
- Style(widgets): lay the API widget's advanced form out in two columns
- Test(api): cover outbound alerts and the import parser
