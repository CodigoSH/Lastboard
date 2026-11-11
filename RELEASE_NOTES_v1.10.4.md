### Security
- Built with Go 1.27.4, which fixes a crash of the HTTP/1 server caused by a race in the request body size limit (GO-2026-6859). The release binaries and the container image are built with it.

### Fixed
- With Monitoring, Docker, Proxmox or Preferences open, choosing a board from the board selector changed the board behind the page and left the page open. It now closes the page and shows the board you chose.

### Changed
- The code behind the demo, the lists that reorder by touch, the board, a widget's settings and the bookmark form is tidier and shorter. Nothing about how they behave changes.
