**Docker, Proxmox and the status page, rebuilt; sign-in brought up to date**

1.10 gives Docker, Proxmox and Monitoring a page each, built on one shell and read the same way; makes sign-in stronger and lets the administrator decide what each account may use. Nothing needs doing on upgrade: your sessions, boards, widgets and hosts carry over, and what an account could reach before it still can.

### Added
- **A Docker page**, with an overview of every host (what is running, what needs attention, CPU and memory against the real size of the host, what Docker holds on disk), an inventory of all the containers, and a side panel for each one: how it is set up, its health, its log, which can follow live. A container can have an icon and a bookmark of its own. Details and logs on an agent host need Lastboard Agent v1.3.0 or later.
- **Proxmox tasks and system log**: a node's and a machine's recent tasks with each task's log, and the node's system log, in the rebuilt Proxmox page (overview, machines, storage, tasks, system log, side panel).
- **A status page rebuilt on the same shell**: an overview with four indicators, a chart and an attention list, services as cards or a list, and an outages tab by service, each opening a side panel with its outages, checks and latency chart. Outages read in words and minutes.
- **The three tiles share one look**: a line of totals under the name, a row per item with its icon, name and readings, and a foot with the count and a link to the page. CPU, memory and disk (CPU and memory for Docker) can be turned on and off one by one, and the link can be hidden. A click on a row opens that item's side panel over the board; **See all** opens the page.
- **Sign-in with an authenticator app** (two steps, with recovery codes), **with a passkey**, and **through an auth proxy** in front of Lastboard for accounts that already exist.
- **Active sessions**: each account sees where it is signed in, closes one or all the others, and signing out ends the session everywhere.
- **Permissions per account**: when creating or editing an account the administrator chooses a profile (View only, Standard, Homelab) or each permission, and a label that replaces the role. The interface leaves out what an account may not use, and the server checks every request.
- **Docker hosts belong to the account**, set up once in Preferences, as Proxmox hypervisors do; each widget chooses among them. The first start moves the hosts that widgets had set up, tokens included.
- **A Podman guide**: Lastboard and the agent run on Podman, rootless, with Quadlet files.
- Proxmox: choose, rename and arrange the machines on the tile; each machine says what its own disk holds, where Proxmox says so; an uptime reads in days, months, then years.
- Back walks through a page's tabs and side panel before it leaves it. The three pages say how old their data is under the header.

### Changed
- The Docker, Proxmox and Monitoring pages answer fast, however much there is: a host that does not answer is given six seconds and no more and the others draw as they answer; a service's history is read folded, so opening one costs a few kilobytes; the status page answers in tens of milliseconds, not seconds; Docker's CPU and memory are read at once, not at the daemon's pace. The pages pause their own refresh while the browser asks to save data and never start a round on top of one in progress.
- The tiles only read: starting, stopping and restarting is done in the item's panel, and the Docker tile no longer links a container's name to its service; the panel's **Open service** does, from the bookmark, or from a `lastboard.url` or `homepage.href` label, or the first published port.
- A bookmark has one "runs on" field with a None / Proxmox / Docker switch and the list for the chosen one.
- Updated Go to 1.27.3, Bun to 1.4.4 and SQLite to 1.61.0, with the tooling of the build.

### Security
- A credential no longer follows a redirect to another server. A write without `Sec-Fetch-Site` is refused when its `Origin` names another host.
- A backup from a newer version, or without an administrator, is refused before anything changes.
- A read-only mount of the Docker socket does not limit what Docker can be told: the guides now say so, and recommend the agent for a Docker on another machine.

### Fixed
- Proxmox: "See all" opens the page without leaving the board, and a chosen machine icon shows at once and can be removed.
- Nothing is asked about permissions before the account is known.
