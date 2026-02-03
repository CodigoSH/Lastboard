# Kashboard v1.0.11 Release Notes

This release restores functionality for local network monitoring.

## 🐛 Bug Fixes

*   **Local Ping Status:** Resolved an issue where the status indicator (green/red dot) would fail for local IP addresses (e.g., `192.168.x.x`) due to strict SSRF protection. Local network monitoring is now fully supported again.
