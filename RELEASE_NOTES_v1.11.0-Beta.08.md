**The update window shows it is working while a large database is copied**

This is a beta of 1.11.0, offered only to installations on the beta channel. It carries everything the earlier betas of the series brought, listed below with what is new: they are removed when a newer one comes out.

### Added
- **The update window shows the step in progress is working.** The step that is running has an arc turning on its ring instead of only a soft pulse, and the install step says "Copying the database…" if it lasts more than two seconds. On a large database that copy takes many seconds, and the window used to look frozen. A quick install never shows the note.
- **An update tries the new version on your server before installing it.** One that cannot run there, built for another processor or damaged, stops the update, and the window says that nothing was changed.
- **A copy of the database before every update,** beside it as `lastboard.db.backup-<date>-<time>`, opened and checked once taken and readable only by the account the server runs as. The three newest are kept, counting the ones the install script takes. If the copy cannot be made, most often because the disk is full, the update stops with nothing changed.
- **A Notifications section, with a list of channels.** Where alerts go is no longer one method and one address: it is a list, as Docker and Proxmox have lists of hosts. Add as many channels as you like (ntfy, Gotify, a webhook, push notifications) up to ten, even several of the same kind: two ntfy topics, one for you and one for someone else. Each channel has its own switch, its own address and token, and its own **Send test**, which works before you save it and says in the window what came of it. An alert goes to every channel that is on, each on its own, so one that is down does not stop the others. There is no switch for alerts as a whole: they are on when any channel is.
- **Each channel says how its last alert went.** Delivered, or failed with the reason in words: the server answered HTTP 401, no answer in time, it could not be reached. Nothing of the address or the message is kept, since either can hold a credential.
- **Push is a channel like the others,** with the browsers it reaches listed under it. Monitoring keeps what it records: the 24/7 toggle, the check interval and clearing data. The failures before an alert and the wording of the alerts moved to Notifications; the wording is folded away under **Advanced** until you open it.
- **A check interval of 30 seconds.** An outage is noticed at the next check, so a shorter wait is the only way to hear of it sooner. The default is still 5 minutes.
- **Tie the bookmarks you already have to what they serve.** In the window that adds services, a service whose bookmark is found only by its name, or now also by its address, offers **Link**: it adds the link to that bookmark and changes nothing else about it, and **Link** at the top of the group does all of them at once. It asks first, and a bookmark you edited elsewhere in the meantime is left untouched. The row shows that bookmark's icon.

### Changed
- **The version you update from stays beside the new one** as `lastboard.old`, and the new one takes its place in a single step, with no moment without one.
- **Whoever had one alert method set up finds it as the first channel** when they update, on or off as its switch was, with its address and token. A backup from before channels is restored the same way.
- **The warning on a backup without a password** now names the tokens of the notification channels, which a backup carries like the rest of the credentials.

### Fixed
- **"No available server" for up to half a minute after updating behind a reverse proxy or a tunnel.** The server closed its port for a moment while it restarted into the new version, and cut the connections that were open; some proxies took that for a server that had failed and stopped sending to it for a while. The port now stays open through the restart: a request that arrives meanwhile waits a moment and is answered by the new version.
- **A restart into the new version that failed could leave the server down** under a service set to restart only on failure, because it ended as if stopped on purpose. It now ends with an error, so the service manager starts it again.
- **Push notifications reached an Android phone late, or only when the app was opened.** A recovery and the test button were sent with normal urgency, which a phone that is idle holds back for minutes. Every alert goes out with the highest urgency now.
- **The last delivery of a push device showed January 1970.** The date was read as milliseconds when the server gives seconds.
- **The Enter that confirms a word typed with an input method** (Japanese, Chinese, Korean) no longer submits a form, moves to the next field or runs the list's own action.
- **The window that adds services could offer as new a service that already had a bookmark** when it was opened straight after the page loaded. It reads what is on the board each time it opens.
