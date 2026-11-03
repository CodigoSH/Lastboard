**The settings of the three tiles agree**

### Added
- The Monitoring tile can hide the line of totals under its name, like the Docker and Proxmox ones: "Show node health"

### Changed
- In the Docker and Proxmox settings the readings (CPU, RAM, disk) are offered only while "Show node health" is on
- The foot of the three tiles goes with the link to the page: without the link there is no bar
- A service's name in the Monitoring tile is its bookmark's and is no longer set there; its icon still can be

### Fixed
- The Docker tile kept an option switched off after it was switched back on in its settings, until the page was reloaded
