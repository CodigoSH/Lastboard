**Copy buttons on the commands of the proxy notice, and a command that copies cleanly**

### Added
- Each command or setting the **A proxy is in front and was not declared** notice asks you to type has a button that copies it, and the first one opens the service file with `sudo nano`

### Fixed
- A command copied from that notice no longer carries invisible text-direction marks that made `systemctl` reject the unit name
