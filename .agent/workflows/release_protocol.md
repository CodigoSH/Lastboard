---
description: How to release a new version of Lastboard
---
# Lastboard Release Protocol

This workflow ensures consistent releases, including version bumping, changelog generation via tag message, and cleanup.

## 1. Prerequisites
- Ensure all changes are committed on `main`.
- Decide on the new version (e.g., `v1.2.3` or `v1.2.3-beta.1`).

## 2. Update Version Numbers
Update the version string in the following files:
- `package.json` ("version": "1.2.3")
- `internal/version/version.go` (Current = "v1.2.3")
- `web/src/components/ui/SettingsContent/SettingsContent.ts` (private version = 'v1.2.3')

## 3. Create Release Notes
Create a file named `RELEASE_NOTES_<TAG>.md` in the root directory. This file is required by the GitHub Action to populate the release body.

```bash
# Example
echo "# Release v1.2.3
## Features
- ...
## Fixes
- ..." > RELEASE_NOTES_v1.2.3.md
```

## 4. Execute Release Command Chain (One-Liner)
Run the following command chain to commit, tag, push, and cleanup the release notes file in one go.

> **Replace `<TAG>` with your version (e.g., `v1.1.4-beta.8`)**

```bash
# Verify variables first
export TAG="v1.1.4-beta.8"

# EXECUTE
git add . && \
git commit -m "chore(release): $TAG" && \
git tag $TAG && \
git push origin $TAG && \
rm RELEASE_NOTES_$TAG.md && \
git add . && \
git commit -m "chore: cleanup release notes" && \
git push origin main
```

## 5. Verification
- Check GitHub Actions for the "Release" workflow.
- Verify the release is published with the correct body.
