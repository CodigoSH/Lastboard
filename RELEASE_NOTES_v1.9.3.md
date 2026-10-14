**Sessions, backups and connections hardened**

### Fixed
- A session is now tied to the account, not to its name: a cookie left from a deleted account can no longer sign in to a new one that reuses the name, and a stale session no longer sends the login page into a redirect loop. Cookies issued by earlier versions keep working until their owner signs out.
- Changing your password signs you out cleanly with a single cookie and takes you to the login page.
- Restoring a backup now signs everyone out, because the accounts are recreated; sign in again afterwards.
- A backup no longer carries on silently when a row cannot be read: it fails with an error instead of producing a file with a gap in it. Backups also keep the order a phone shows bookmarks in, and an account role written as "Admin" in a file is restored in lower case so the account can still administer the instance.
- Wrong password attempts no longer pile up memory: at most two passwords are hashed at the same time.
- Deleting a bookmark no longer deletes the icons chosen for Proxmox machines.
- Storing icons locally no longer undoes an edit made while they were downloading.
- Saving a clock keeps its time zone instead of resetting it to the browser's, and the city lookup asks a single service. The two outside time services were dropped from the allowed hosts.
- Docker and Proxmox connections are reused instead of piling up, one client per host.
- Credentials typed into a widget that a browser had not reloaded yet are moved into the secret store when the widget is saved.
- Board names are limited to 50 characters and project names to 64, counted as characters rather than bytes, so non-Latin names get the full length.
- The check for a newer release gives up after fifteen seconds instead of waiting indefinitely.
- The background status check reads only what it needs instead of every bookmark every fifteen seconds.

### Security
- Connections to the cloud metadata services are refused when they are made, so a redirect can no longer reach them.
- A container id is escaped in the Docker daemon path, and the Gotify token travels in a header instead of the URL.

### Changed
- Widgets and pages that poll the server stop while the browser tab is hidden and resume when it is shown.
- The interface holds a single HTML escaper and a single place that reads API answers and errors, and unused styles and code were removed.
