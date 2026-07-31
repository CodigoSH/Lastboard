### Added
- **Six more service presets for the API widget** — Proxmox VE, Home Assistant, Uptime Kuma, Overseerr/Jellyseerr, Bazarr and Prowlarr. A preset can now ask for one extra detail on top of the base URL and credential — the node, entity or status page it should read — which is what these services need to point at something specific.
- **A search box in the service picker** — the list holds seventeen services now, so you can type the name instead of scrolling for it.
- **Uptime monitoring in the live demo** — the demo dashboard shows the status page, per-service latency history and the hover tooltip, with one service in an outage so the feature reads at a glance.

### Changed
- The API widget documentation covers the extra preset field, and explains why an endpoint that answers with a top-level JSON array cannot be rendered as a list.
- The Go module path now points at this repository instead of the project's former home.
- The updater's download, checksum and archive-extraction steps are covered by tests, as are the colour picker's conversions.
