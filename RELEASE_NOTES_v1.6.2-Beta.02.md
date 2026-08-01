Follow-up to Beta.01, adding one configuration improvement to the API widget.

### Added
- **API widget — pick the view explicitly.** A new *View* selector lets you choose between **Metrics** and **List** instead of having the layout inferred from whether the list array path was filled in. The array field now only appears when the list view is selected, and choosing the list view without an array path says what is missing rather than rendering an empty box.

Existing API widgets are unaffected: those saved without a stored view keep the previous behaviour, and the configuration screen shows them the mode they actually render.

### Notes
This beta also carries everything from Beta.01: the clock fix for unusable time zones, touch support in the colour picker, the weather widget's error state, monitoring retention applied on startup, a lighter binary and cached translation files.
