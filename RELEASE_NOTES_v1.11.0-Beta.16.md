**A passkey key beside Sign in, an i for every help, and updates from a container image**

### Added
- A passkey is a quiet key beside Sign in, and the username field suggests the account's passkeys
- Help sits behind an "i" beside each field, setting and permission: it opens on hover with a mouse, on a tap on a phone or tablet, and on focus from the keyboard
- About shows what needs the administrator in one card, with the server's details one button away, and a telemetry widget that says why it is empty
- A proxy or tunnel in front is asked about plainly when installing, and noticed when nobody said so
- A device is named Browser · System, and closing one asks a question

### Fixed
- An installation that cannot replace its own program, such as an OCI image running on Proxmox VE, says to update the image before anything is pressed, instead of failing halfway
- A form's button in Preferences ends on the right edge, where every other action already does
- Escape in a dialog of Preferences closes the dialog, not the whole drawer
- Preferences stay inside a phone's width: no card is widened by a line that will not wrap, and add buttons drop below their title
- The passkey's key is drawn on the grid: a round head with a ring, a 45-degree shaft and two even teeth
