**Add a host's services to the board**

This is a beta of 1.11.0. The stable channel is not offered it.

### Added
- **Add a host's services to the board.** The **bookmark** button in the header of the Docker and Proxmox pages opens a window that lists what the host's containers or machines could become, one row each, with a name, an address, an icon and a section you can change. Tick what you want and add it; **Undo** removes exactly what that run created. The same window opens by itself when you add a Docker host or a hypervisor that answers and has something to offer. It needs permission to edit the board.
  - **Docker:** the address is the one a container advertises (`lastboard.url` or `homepage.href`), then a reverse proxy's host from Traefik or Caddy labels, then its published ports (HTTPS for 443, 8443, 9443, 8006 and 10443; loopback and UDP ports are left out). A container can also say its own name, icon and section with `lastboard.name`, `lastboard.icon` and `lastboard.group` (or `homepage.name`, `homepage.icon`, `homepage.group`). Compose projects can be a section each.
  - **Proxmox:** a running machine is proposed at the first private IPv4 address of its interfaces (a container's own, or what a virtual machine's QEMU guest agent reports); one without an address opens its console in Proxmox's own interface. A line `lastboard.url: https://…` in a machine's notes is proposed first. Reading a virtual machine's guest agent takes an optional privilege (`VM.GuestAgent.Audit` on Proxmox 9, `VM.Monitor` on 8); without it the machine is proposed at its console.
  - **Before you add:** each row says whether its address answers (for accounts that may check status), those a bookmark already serves, or is called after, are shown dimmed and unticked, and what you left unticked last time comes back unticked, marked as such. The bookmark button shows how many services are still left to add.
- **Machines and containers that serve no bookmark** show a struck-through bookmark icon in the Docker and Proxmox pages.
- **`lastboard password reset <username>`** sets a new password for an account from the server's terminal, the way back when the only administrator has forgotten theirs. The password is typed without echo.
- **The icon search has a first group, CodigoSH,** with the marks of the CodigoSH products. They come with Lastboard, so they are offered with no internet connection and to accounts that may not look icons up.

### Fixed
- The icons you choose for Docker containers were missing from backups, so a restore sent them back to the default; they are included now.

### Changed
- Built with `golang.org/x/crypto` 0.59.0.
