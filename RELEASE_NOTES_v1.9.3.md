**A security and stability release**

1.9.3 is about making what is already there harder to abuse and harder to break. It adds no features. It closes weak points in sign-in, sessions, updates, backups and the connections Lastboard makes, and fixes the ways data or settings could end up half-saved. Nothing needs doing on upgrade: your sessions, boards and settings carry over.

### Security
- Sign-in attempts are counted reliably: a burst of wrong passwords that arrive at the same moment used to count as one, so the lockout never came. Changing your password, deleting an account and resetting the instance now stop after too many wrong passwords too, per account, so a stolen session cookie cannot be used to guess the password.
- A session belongs to the account, not to its name. A cookie left over from a deleted account can no longer sign in to a new account that reuses the name, and a stale session no longer sends the login page into a redirect loop. Cookies issued by earlier versions keep working until their owner signs out.
- Passwords are hashed at most two at a time, so a flood of sign-in attempts can no longer exhaust the memory of a small server. Passwords can now be up to 256 characters instead of 72 bytes.
- Connections to cloud metadata services are refused when they are made, so a redirect or a hostname that resolves there cannot reach them. A container id is escaped in the Docker path, and the Gotify token travels in a header instead of the address.
- Updates are verified more strictly: each download is checked against the line of the signed `checksums.txt` that names it, so one platform's archive cannot stand in for another's, a download over the size limit is refused instead of cut short, and each update works in a directory of its own with only one allowed to run at a time.
- Restoring a backup ends every session without touching the signing secret, so a session opened afterwards survives a restart. After a restore, sign in again.
- Answers from a Docker host and from the release server are read up to a size limit. The dashboard background must be an image address, and an avatar or accent chosen at setup follows the same rules as one chosen later.
- The administration panel never changes the administrator's own password (that goes through the profile, which asks for the current one), and an unknown account or a taken name gets a clear answer. The browser no longer allows connections to a time-zone service it does not use.

### Fixed
- A backup fails with an error instead of silently leaving out a row it cannot read. It keeps the order a phone shows bookmarks in, and restore errors are translated.
- Deleting a board is a single change that also sweeps its unused icons. A new board always goes after the last one, reordering with a partial list keeps every position distinct, and the first board of an account is created once even when several requests arrive together.
- Saving the monitoring settings is all or nothing, and a failure is reported instead of answering "saved". A preference that fails to save is rolled back everywhere, so the next save does not carry it. The dashboard background is kept when a request does not mention it.
- Deleting a bookmark no longer deletes the icons chosen for Proxmox machines, and storing icons locally no longer undoes an edit made while they were downloading. Credentials typed into a widget before a page reload are moved to the secret store when it is saved.
- Renaming yourself works with the default avatar. Saving a clock keeps its time zone. Board names (50) and project names (64) are counted in characters, so non-Latin names get the full length.
- With the server unreachable and nothing cached, the board is empty instead of showing a tile that is not yours.
- The "Check for updates" button asks the release server again instead of repeating the last answer, the release lookup gives up after fifteen seconds, and only the administrator asks for updates, once per page load.
- The background status check no longer reads every bookmark every fifteen seconds.

### Changed
- Several Proxmox hosts are read at the same time instead of one after another, and Docker and Proxmox connections are reused instead of piling up.
- Widgets and pages that poll the server stop while the browser tab is hidden and resume when it is shown.
- The interface holds one HTML escaper and one place that reads API answers and errors, and styles and code nothing used were removed.
