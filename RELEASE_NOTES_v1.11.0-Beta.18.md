**A WebSocket through the proxy no longer counts as plain HTTP**

### Fixed
- **Reached without HTTPS** no longer appears for a server behind Pangolin, or any Traefik proxy, on HTTPS: the live connection of the telemetry widget arrives marked `wss`, which was read as plain HTTP, and a chain of proxies that writes `https, http` is now read by its first word
