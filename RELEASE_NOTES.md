# Release v1.1.0

## New Features
*   **Dynamic Login Page:** The login screen now respects and remembers the user's accent color preference, persisting across sessions for a personalized experience.
*   **Smart Setup Redirection:** Identifying a fresh installation is now smarter; navigating to `/login` when no admin user exists will automatically redirect to `/setup`.
*   **Enhanced First-Run Experience:** The default accent color for new installations has been unified to match the login theme (Blue), providing a seamless initial impression.

## Bug Fixes
*   **Fixed Initial Seeding:** Resolved a critical issue where the default "CodigoSH" bookmark was failing to create due to a database constraint error. It is now correctly seeded during the admin setup process.
*   **Fixed Light Mode Visibilty:** The sidebar toggle icon now correctly inverts to black when using Light Mode, fixing an issue where it would disappear against the white background.
*   **Fixed Button Gradients:** Resolved a visual clash where custom accent colors (e.g., Red) were being merged with a fixed purple gradient. Buttons now correctly use the pure accent color selected by the user.
*   **Database Reliability:** Removed legacy/broken seeding logic from the startup sequence that was causing silent errors.
