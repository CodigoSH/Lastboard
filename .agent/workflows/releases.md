---
description: How to release a new version of Lastboard
---
# Lastboard Release Protocol

This workflow ensures consistent releases using automated scripts that handle version bumping, file updates, and changelog generation.

## 1. Prerequisites
- Ensure all changes are committed on `main`.
- Decide on the type of release (Beta, RC, or Stable).

## 2. Execute Release Script
Run the appropriate script from the `scripts/` directory. These scripts automatically:
- Detect the current version from `package.json`.
- Increment the version (handling padded numbers like `09` -> `10`).
- Update `package.json`, `internal/version/version.go`, and `web/src/components/ui/SettingsContent/SettingsContent.ts`.
- Generate release notes from recent git commits.
- Commit, tag, and push to origin.

### Release Beta
Use this for ongoing development and testing.
```bash
./scripts/release_beta.sh
```

### Release RC (Release Candidate)
Use this when a version is potentially ready for stable.
```bash
./scripts/release_rc.sh
```

### Release Stable
Use this for final production releases.
```bash
./scripts/release_stable.sh
```

## 3. Verification
- Check GitHub Actions for the "Release" workflow triggered by the tag push.
- Verify the release is published with the correctly generated body on GitHub.
