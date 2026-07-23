### Fixed
- Profile changes (username and avatar) failed silently on instances upgraded from older versions. The database is now repaired automatically on startup, so existing installations keep working after an update — no manual steps needed
- Database errors are no longer hidden behind a misleading "user not found"; the real cause is logged

### Security
- Software updates now require a valid release signature: the updater refuses to install a release whose signature is missing or invalid
