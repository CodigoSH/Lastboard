**A backup only you can open**

### Added
- Protect a backup with a password: set it when you download, and it is asked for when you restore
- The backup now carries the Proxmox hosts with their tokens, and the monitoring settings with the notification token, so a restore no longer leaves them to be typed again
- Passwords are hashed with Argon2id; an account from an earlier version moves over the next time it signs in, with nothing to reset

### Fixed
- A click in the empty space inside a dialog no longer closes it and throws away what was typed
- Shrinking a section moves out the items that no longer fit, instead of squeezing them below its edge
- Under Podman, the in-place update is no longer offered inside the container
