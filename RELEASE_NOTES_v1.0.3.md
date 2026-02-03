# Kashboard v1.0.3 Release Notes

Quick fix release to resolve an issue with the update verification process.

## 🐛 Bug Fixes

*   **Update System:** Fixed a checksum verification mismatch that prevented users from auto-updating to v1.0.2. The checksum generation process in the release pipeline has been made more robust.
*   **Release Assets:** Ensures `checksums.txt` is correctly generated for all architectures.

## 📦 Installation / Update

To install or update:

```bash
curl -fsSL https://raw.githubusercontent.com/codigosh/Kashboard/main/install.sh | sudo bash
```
