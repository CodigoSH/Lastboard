#!/bin/bash

# Configuration
VERSION_FILE="package.json"
GO_VERSION_FILE="internal/version/version.go"
SETTINGS_FILE="web/src/components/ui/SettingsContent/SettingsContent.ts"

# 1. Get current version from package.json
CURRENT_FULL=$(grep -oP '"version": "\K[^"]+' $VERSION_FILE)

# Logic for RC
# Extract base version (e.g. 1.1.8)
BASE_VERSION=$(echo $CURRENT_FULL | sed -E 's/-(Beta|RC)\.[0-9]+$//')
NEW_BASE=$BASE_VERSION

# Extract last RC number
LAST_RC=$(echo $CURRENT_FULL | grep -oP 'RC\.\K[0-9]+')

if [ -z "$LAST_RC" ]; then
    # First RC for this base version
    NEXT_RC=1
else
    # Force base 10 arithmetic
    NEXT_RC=$((10#$LAST_RC + 1))
fi

# 2. Format with zero padding (01, 02...)
PADDED_RC=$(printf "%02d" $NEXT_RC)
NEW_TAG="v$NEW_BASE-RC.$PADDED_RC"
NEW_VERSION="$NEW_BASE-RC.$PADDED_RC"

echo "🚀 Preparing Release Candidate: $NEW_TAG"

# 3. Update Files
# package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" $VERSION_FILE

# version.go
sed -i "s/Current = \".*\"/Current = \"$NEW_TAG\"/" $GO_VERSION_FILE

# SettingsContent.ts
sed -i "s/private version = '.*'/private version = '$NEW_TAG'/" $SETTINGS_FILE

# 4. Generate Release Notes
NOTES_FILE="RELEASE_NOTES_$NEW_TAG.md"
cat <<EOF > $NOTES_FILE
# Release Notes: $NEW_TAG

## 🏁 Release Candidate $PADDED_RC
- **Versioning**: Implemented zero-padded RC numbering (.$PADDED_RC) for consistent GitHub sorting.
- **Stability**: Candidate for final production release.
- **Updates**: Includes all latest beta channel fixes and core updater patches.

## 🛠 Automated
- Generated via \`scripts/release_rc.sh\`
EOF

# 5. Git Operations
git add .
git commit -m "chore(release): bump to $NEW_TAG (padded RC system)"
git tag $NEW_TAG
git push origin $NEW_TAG
rm $NOTES_FILE

echo "✅ Deployed $NEW_TAG successfully!"
