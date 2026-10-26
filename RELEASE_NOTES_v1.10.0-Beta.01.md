### Added
- **Permissions per account.** The administrator picks a profile when creating an account — *View only*, *Standard* or *Homelab* — or sets each permission by hand: editing the board, several boards, import and export, fetching icons, API widgets, other machines' health, reaching the local network, status dots, monitoring and alerts, the server's own load, and Docker and Proxmox at none, view or control. Screens leave out what an account may not use, and the server checks every request. A label of your choosing can replace the role under the name.
- **Two-step sign-in** with an authenticator app, and one-time recovery codes. An administrator can remove it from an account, and `lastboard 2fa reset <user>` does it from the command line.
- **Passkeys**: sign in with a passkey instead of a password, added from My Profile. They need Lastboard opened over https by its name, not an IP address.
- **Active sessions** in My Profile: see where you are signed in, close one, or close all the others. Sessions now live on the server, so signing out ends them everywhere.
- **Sign in through an auth proxy** (Authelia, Authentik, oauth2-proxy…) with `AUTH_PROXY_HEADER` and `AUTH_PROXY_TRUSTED`, for accounts that already exist. `AUTH_PROXY_LOGOUT_URL` signs you out of the proxy too.
- **A Docker page**, opened from the top bar: every container of your hosts, each one's ports, mounts, networks, health and restart policy, the *names* of its environment variables (never their values), and its log, which can follow live. On an agent host it needs Lastboard Agent v1.3.0 or later.
- **Proxmox tasks**: each node and machine shows its recent tasks — backups, starts, migrations, snapshots — with their state and log, followed while a task runs. A node can also show its system log, which is optional and needs `Sys.Syslog` on the token.
- **The Proxmox tile** lets you choose, rename and arrange the machines it shows, as the Docker tile does.
- **Podman**: the Docker guide explains how to point Lastboard and the agent at rootless Podman's socket, with Quadlet files to run both as services.

### Changed
- **Docker hosts belong to the account**, set up in Preferences → Docker, as Proxmox hypervisors are; widgets choose among them. Hosts configured inside widgets move there on the first start, tokens and per-container settings included.
- A member reaches Docker only through its own Lastboard Agents; the server's socket and TCP or TLS daemons are the administrator's. Existing members become *Homelab*.
- Proxmox's "See all" opens its page without leaving the board, and the page has an address of its own.
- Built with Go 1.27.3, which closes the standard library's published vulnerabilities.

### Fixed
- The API widget's key, a Server Health source's header, a Gotify key and the Docker agent's token no longer follow a redirect to another server.
- A write whose `Origin` names another site is refused even when the browser does not send `Sec-Fetch-Site`.
- Restoring a backup from a newer version, or one without an administrator, is refused before anything changes.
- A Proxmox machine's chosen icon shows at once and can be removed.

Signed in before updating? You stay signed in: the old session becomes one of the new kind the first time it is used.
