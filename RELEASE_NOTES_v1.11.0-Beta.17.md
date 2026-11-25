**Settings keeps its section after an update, and the proxy and HTTPS notices say what to do**

### Fixed
- After an update Lastboard comes back on the section of Settings it was on, not on My Profile: the address now names it, as in `/?view=settings&tab=about`, so any reload lands in the same place
- **Reached without HTTPS** counts only somebody signed in using Lastboard over plain HTTP from another machine; a proxy's health probe or a status check of the server by its own address no longer raises it, and the log says where the first one came from

### Changed
- **A proxy is in front and was not declared** says where to change the setting and what to run, by how Lastboard is installed: the service file and `systemctl` on a native installation, the container's environment otherwise
