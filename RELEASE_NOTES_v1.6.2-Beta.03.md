Follow-up to Beta.02, focused on the configuration dialogs and on making the interface consistent with itself.

### Fixed
- **Configuration dialogs no longer grow past the screen.** A tall form — the API widget in advanced mode above all — used to run off the bottom with the *Save* button out of reach. Dialogs are now capped at the height of the window and scroll their body instead, so the header and the buttons always stay in view.
- **Dropdowns inside a dialog are no longer clipped.** A select near the bottom of a form opens upwards when there is no room below, instead of being cut off by the edge of the dialog.
- **No more scrollbar flashing when a dialog opens.** The panel content animated in from slightly below its resting position, which pushed it past the bottom edge and made a scrollbar appear for the length of the animation and then vanish. It now enters from above, where no bar is ever drawn.
- **Long names in a select are readable again.** They are shortened with an ellipsis rather than overflowing their box.
- **Fields with an inline button keep their room.** The search boxes and the password fields with a reveal button had lost the extra padding that keeps the text clear of the icon, so the two overlapped.

### Changed
- **The API widget's advanced form is laid out in two columns.** Headers, fields and options sit side by side on a desktop-width dialog instead of stacking into a single long list. This form is only reachable while editing, which is desktop-only, so nothing changes on a phone.
- **One look for scrollbars and dialogs.** Both were described separately in several component stylesheets and had drifted apart — thin in one panel, thicker in the next. They are now defined once, along with the animation curves, so the same control looks the same wherever it is drawn.
- **Text fields keep the styling their own screen gives them.** A shared rule added during that cleanup was overriding fields that differ deliberately; it has been removed, and every field is back to what its own screen asks for.

### Notes
This beta carries everything from Beta.01 and Beta.02: the API widget's explicit *View* selector, the clock fix for unusable time zones, touch support in the colour picker, the weather widget's error state, monitoring retention applied on startup, a lighter binary and cached translation files.
