# Kashboard v1.0.10 Release Notes

This release improves drag-and-drop mechanics and enhances server security.

## 🐛 Bug Fixes

*   **Section Dragging:** Fixed an issue where dragging a Section slightly would cause it to collide with its own previous position ("ghost collision"), making reorganization difficult. Sections now move smoothly even when packed with bookmarks.

## 🛡️ Security & Stability

*   **HTTP Headers:** Added `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` headers to improve security posture.
*   **Path Traversal Hardening:** Improved file path cleaning in the static file server to prevent potential traversal issues.
