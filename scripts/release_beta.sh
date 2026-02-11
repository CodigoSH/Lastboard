#!/bin/bash

# Configuration
VERSION_FILE="package.json"
GO_VERSION_FILE="internal/version/version.go"
SETTINGS_FILE="web/src/components/ui/SettingsContent/SettingsContent.ts"

# 1. Get current version from package.json
CURRENT_FULL=$(grep -oP '"version": "\K[^"]+' $VERSION_FILE)

# Logic to switch to 1.1.8 if we are still on 1.1.7 (to reset the count)
if [[ "$CURRENT_FULL" == *"1.1.7"* ]]; then
    NEW_BASE="1.1.8"
    NEXT_BETA=1
    echo "🔄 Upgrading from v1.1.7 to v1.1.8 to reset beta sorting."
else
    # Extract base version (e.g. 1.1.8)
    BASE_VERSION=$(echo $CURRENT_FULL | sed -E 's/-(Beta|RC)\.[0-9]+$//')
    NEW_BASE=$BASE_VERSION
    
    # Extract last beta number
    LAST_BETA=$(echo $CURRENT_FULL | grep -oP 'Beta\.\K[0-9]+')
    if [ -z "$LAST_BETA" ]; then
        NEXT_BETA=1
    else
        # Force base 10 arithmetic to handle "08", "09"
        NEXT_BETA=$((10#$LAST_BETA + 1))
    fi
fi

# 2. Format with zero padding (01, 02...)
PADDED_BETA=$(printf "%02d" $NEXT_BETA)
NEW_TAG="v$NEW_BASE-Beta.$PADDED_BETA"
NEW_VERSION="$NEW_BASE-Beta.$PADDED_BETA"

echo "🚀 Preparing Release: $NEW_TAG"

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
# Release Notes: $NEW_TAG

## 🚀 Changes since ${LAST_TAG:-initial}
$CHANGELOG

EOF

# 6. Git Operations (Release Bump)
# Since we update files, we have new changes to commit
git add .
git commit -m "chore(release): bump to $NEW_TAG (padded system)"
git tag $NEW_TAG
git push origin main
git push origin $NEW_TAG
rm $NOTES_FILE

echo "✅ Deployed $NEW_TAG successfully!"
