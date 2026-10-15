### Added
- Docker and Monitoring: the containers and services in a widget can be arranged by hand. Each one has a grip in the widget's settings, dragged with the mouse or a finger or moved with the arrow keys. Docker keeps the order of each host apart, and a Monitoring list left fully ticked still takes the services you add later, shown after the ones you arranged.
- Docker: a **Show new containers automatically** switch. Turned off, a container that appears later stays hidden until you tick it, so a widget that shows only a few no longer has to hide every new one.
- The installer says which version is installed and which it is about to install, stops with "nothing to do" when you already have the latest, and takes `--reinstall` to install it again to repair it.

### Changed
- Every widget now shows its name as a pill on the tile's border, the way a section does, and a widget with no name shows no pill. The name is the first field of each widget's settings. Docker, Monitoring, Proxmox and the API widget no longer spend a row of the tile on a heading; Proxmox keeps a slim strip with the node and its meters.
- A Docker, Monitoring or Proxmox widget that had no title of its own keeps the name it showed, written once into its title in the language of the account that owns it. After that it is an ordinary title: change it or clear it. Restoring a backup taken by an earlier version does the same for the widgets it brings back.
- The name on a widget, and on a bookmark that shows its name as a pill, now answers the pointer the way a section's does: the border takes the accent softly when the tile is hovered, and only hovering the name itself lifts it further. It used to light up fully in the accent colour.

### Fixed
- Docker: a container you had hidden came back, and lost its name and address, every time it was updated. What is set on a container is now kept under its host and name instead of its ID, which changes whenever the container is recreated. Settings saved before this are read as they were until the widget's settings are saved again; a container updated before that has to be hidden once more.
- Proxmox: only starting a machine and shutting it down gracefully are relayed, as the interface and the documentation say.
- The uninstall command in the documentation did not work when the installer had been piped from `curl`; it now shows the form that does, and the signing guide says the installer verifies the release signature.
