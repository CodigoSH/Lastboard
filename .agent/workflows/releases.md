---
description: How to release a new version of Lastboard
---
# Lastboard Release Protocol

This workflow ensures consistent releases using automated scripts that handle version bumping, file updates, and changelog generation.

## 1. Prerequisites
- Ensure all changes are committed on `main`.
- Decide on the type of release (Beta, RC, or Stable).

## 2. Execute Release Script
Run the unified release script from the `scripts/` directory. This script automatically handles version bumps, file updates, and changelog generation based on the release type.

### Usage
```bash
./scripts/release.sh [stable|beta|rc]
```

### Release Beta
Use this for ongoing development and testing.
```bash
./scripts/release.sh beta
```

### Release RC (Release Candidate)
Use this when a version is potentially ready for stable.
```bash
./scripts/release.sh rc
```

### Release Stable
Use this for final production releases.
```bash
./scripts/release.sh stable
```

## 3. Verification
- Check GitHub Actions for the "Release" workflow triggered by the tag push.
- Verify the release is published with the correctly generated body on GitHub.
