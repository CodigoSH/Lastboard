#!/bin/bash

# Configuration
VERSION_FILE="package.json"
GO_VERSION_FILE="internal/version/version.go"
SETTINGS_FILE="web/src/components/ui/SettingsContent/SettingsContent.ts"

# 1. Get current version from package.json
CURRENT_FULL=$(grep -oP '"version": "\K[^"]+' $VERSION_FILE)

# 2. Determine NEW Stable Version
# If current is 1.1.8-Beta.07, new is 1.1.8
# If current is 1.1.8, we prompt user to confirm or enter manual version
PROPOSED_STABLE=$(echo $CURRENT_FULL | sed -E 's/-(Beta|RC)\.[0-9]+$//')

echo "Current Version: $CURRENT_FULL"
echo "Proposed Stable: $PROPOSED_STABLE"
echo ""
echo "Press ENTER to confirm release of $PROPOSED_STABLE or type a new version manually:"
read MANUAL_INPUT

if [ ! -z "$MANUAL_INPUT" ]; then
    PROPOSED_STABLE=$MANUAL_INPUT
fi

NEW_TAG="v$PROPOSED_STABLE"
NEW_VERSION="$PROPOSED_STABLE"

echo "🚀 Preparing Official Stable Release: $NEW_TAG"

# Safety Check
read -p "Are you sure? This will push to production. (y/N) " confirm
if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# 3. Update Files
# package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" $VERSION_FILE

# version.go
sed -i "s/Current = \".*\"/Current = \"$NEW_TAG\"/" $GO_VERSION_FILE

# SettingsContent.ts
sed -i "s/private version = '.*'/private version = '$NEW_TAG'/" $SETTINGS_FILE

# 4. Handle Pending Changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Committing pending changes before generating notes..."
    git add .
    git commit -m "chore: pre-release synchronization for $NEW_TAG"
fi

# 5. Generate Release Notes
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -z "$LAST_TAG" ]; then
    CHANGELOG="- Initial release"
else
    CHANGELOG=$(git log $LAST_TAG..HEAD --oneline --pretty=format:"- %s")
fi

NOTES_FILE="RELEASE_NOTES_$NEW_TAG.md"
cat <<EOF > $NOTES_FILE
# Official Release: $NEW_TAG

## 🚀 Changes since ${LAST_TAG:-initial}
$CHANGELOG

EOF

# 6. Git Operations (Official Release)
git add .
git commit -m "chore(release): official stable release $NEW_TAG"
git tag $NEW_TAG
git push origin main
git push origin $NEW_TAG
rm $NOTES_FILE

echo "✅ Deployed $NEW_TAG successfully!"
