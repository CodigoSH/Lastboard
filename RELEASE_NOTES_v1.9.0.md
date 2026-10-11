**Servers beyond this one, secrets kept apart, and accounts of their own**

### Added
- A host's agent token is kept in the widget's secret store
- A widget can wear a title on its border, the way a section does
- Monitoring and Proxmox belong to each account, not to the server
- Read another server's health from Glances, Netdata or a JSON endpoint
- Rename and delete live in the manager, beside the drag handle
- The API widget keeps its credentials in the secret store
- The Server Health widget can show another server through Glances, Netdata or JSON
- The Server Health widget refreshes every 5, 10, 30 or 60 seconds
- What a widget keeps secret is stored apart from its content

### Fixed
- Editing an imported bookmark keeps its icon

### Changed
- Go 1.27.2 and x/net 0.60.0, and the vulnerability scan stops a release before it is tagged
- Update the toolchain and dependencies
