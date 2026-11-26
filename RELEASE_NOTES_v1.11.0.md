**Add your Docker and Proxmox services to the board in one window, alerts to any number of channels, and updates that keep the server answering**

### Added
- **Add a host's services to the board in one go.** A window proposes a bookmark for each container of a Docker or Podman host, with a name, an address and an icon you can change on its row. The address is the one the container names itself (`lastboard.url`, `homepage.href`, Traefik or Caddy labels) or its published ports. It opens by itself when you add a host, sorts what it finds into **To add**, **Already on your board** and **Ignored**, says which addresses answer, lets you name the section and see it before it exists, and asks before it makes anything.
- **Add a hypervisor's machines to the board the same way.** Each running machine is proposed at the first private address its network reports, a container's own or what a virtual machine's guest agent says; a `lastboard.url:` line in its notes comes first, and a machine with no address opens its console in Proxmox.
- **Tie the bookmarks you already have to what they serve.** A service whose bookmark is found by its name or its address offers **Link**, which adds the link and changes nothing else about the bookmark, and **Link all** does every one at once. **Ignore** and **Ignore all** take what a bookmark only seems to be off the count. A machine or container that serves no bookmark shows the bookmark button struck through.
- **Delete a section on its own.** The confirmation offers **Only the section**: turned on, what was inside stays on the board where it was drawn, with its own size. Without it, the confirmation says the section and everything in it go.
- **A Notifications section with a list of channels.** Where alerts go is a list, up to ten, even several of the same kind (ntfy, Gotify, a webhook, push). Each channel has its own switch, address, token and **Send test**, which works before you save and says what came of it. An alert goes to every channel that is on, each on its own, so one that is down does not stop the others.
- **Each channel says how its last alert went**: delivered, or failed with the reason in words. Nothing of the address or the message is kept, since either can hold a credential.
- **A check interval of 30 seconds**, so an outage is noticed at the next check. The default is still 5 minutes.
- **Be told when a new version of Lastboard is out.** Each channel carries two kinds of notice, outages and recoveries, and **New versions of Lastboard**, off until you switch it on. Only the administrator is offered it. A new version is told once, within the hour of its being published, with the lowest urgency each channel has.
- **Updates that keep the server answering.** The new version is tried on your server before it is installed, so one built for another processor or damaged stops the update with nothing changed. The database is copied first, beside it as `lastboard.db.backup-<date>-<time>`, opened and checked, and the three newest are kept. The version you update from stays beside the new one as `lastboard.old`. The server restarts into the new version without closing its port, so a reverse proxy or tunnel in front keeps answering.
- **Docker and Podman.** A host says whether it runs Docker or Podman, a local host takes the path of its socket, and a failed connection says why. The engine is chosen with two buttons, the page and the settings are called Docker / Podman, and the disk card, the health checks and a pod's infra container read what Podman reports.
- **Help behind an "i"** beside each field, setting and permission in Preferences.
- **Sign in with a passkey from a key beside Sign in**, and the username field suggests the account's passkeys.
- **What needs the administrator is in one card** in About, the server's details are one button away, and a telemetry widget that is empty says why. A proxy or tunnel in front is asked about at install and noticed when nobody said so, and its notice says where to change the setting and what to run, with a button that copies each command.
- **A way back from a forgotten password**, run on the server itself: `lastboard password reset <username>`.
- **The marks of Lastboard and CodigoSH are offered in the icon search**, even with no internet and to an account that may not look icons up.
- **Devices are named by browser and system**, and closing one asks first.
- **The window that adds a widget** uses compact rows and fits a phone.
- **Installations from a container image** are told to update the image, with no update button that could not work.

### Changed
- **Adding services asks first** and says how many bookmarks go in, into which section and on which board. A section made for them is as big as what goes in it.
- **Ignoring a service is your choice, made on its row.** Leaving a row unticked is not ignoring it.
- **Whoever had one alert method set up finds it as the first channel** when they update, on or off as its switch was. A backup from before channels is restored the same way. The warning on a backup without a password names the tokens of the notification channels.
- **The section of Preferences that is open is in the address**, so a reload lands in it. What is on screen in the other pages is in the address too, and Back and Forward read it from there.
- **Plain HTTP is noticed only when somebody signed in uses it**, not for a probe or a status check, and a WebSocket over TLS through a proxy no longer counts as plain HTTP.
- **The twenty languages were read again**, one by one: one register per language, leftovers of other scripts removed, and every language listed by its own name.
- **A board may not repeat a name** within an account, and a title that is only spaces or text that is not an address is refused.

### Fixed
- Closing Preferences could land you on the Proxmox page.
- Deleting a section left its bookmarks in the page's own list until the page was reloaded.
- Push notifications reached an Android phone late, and the last delivery of a device showed January 1970.
- "No available server" for up to half a minute after updating behind a reverse proxy or a tunnel, and a failed restart that could leave the server down.
- The Enter that confirms a word typed with an input method (Japanese, Chinese, Korean) submitted forms and moved fields.
- Machines of a Proxmox host found no icon when their name carried a number or a role, and icons chosen at the same time on Docker and Proxmox are all kept.
- A hypervisor that does not answer is no longer shown as "not configured", and an account without the local network no longer sees its home services as down.
- The server's temperature is a row of its details only where the machine has a sensor.
- Two accounts can no longer have names that differ only by case, a refused avatar is not kept for the next save, and a refused username change no longer says it was saved.
- The password of a new protected backup is at least 8 characters.
- Names cut with an ellipsis are cut at their end on a right-to-left page, board names are readable in the light theme, and toasts show above open dialogs.
- Small bookmarks keep their name readable in edit mode, the main button of the setup wizard keeps its words on one line, and the clock's AM and PM read "AM" in Spanish.
- An unknown address under `/api` answers 404, not the page of the board.

### Security
- Search engines are asked not to list any page of an instance.
- Links that open a new tab carry `rel="noopener noreferrer"`.
