This beta reworks the **Preferences** panel end to end. Please try it and report anything that feels off.

### Changed
- The settings panel is reorganized so every card is named after what it holds: **My Profile**, **Look & Feel** (accent color, theme, and dashboard background together), and **Personalization** (logo & panel name, language & region, grid layout).
- Preferences now save the moment you change them. A short **"Saved"** confirmation appears for changes that have no obvious visual effect (units, background, logo, columns, beta channel); changes that the UI already reflects — accent, theme, language — stay quiet instead of nagging.
- Clearer buttons: the password action reads **"Change password"**, and renaming yourself reads **"Save name"** with a note that it signs you out.

### Fixed
- Removed a duplicate confirmation toast that could appear twice on a single save.
- The dashboard column slider no longer risks losing focus while you drag it or step it with the arrow keys.

### Other
- The last few interface strings that were still hardcoded (the show/hide-password control, the backup warning, and the icon picker) are now translated in all 20 languages.
- Third-party attribution (`NOTICE`) and the documentation were brought in line with what the project actually ships, including signature-verified updates.
