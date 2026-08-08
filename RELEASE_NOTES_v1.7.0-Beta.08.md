**Widgets stop rebuilding themselves on every change, and Docker asks for its numbers once**

### Fixed
- Fill the telemetry cell while its reading is on the way
- Restore the vertical spacing every settings screen had lost
- Stop cutting container addresses in the settings screen

### Changed
- Ask who you are without waiting for the locale file
- Read a host's container stats in one request
- Stop rebuilding every widget on each re-render
