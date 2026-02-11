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

# 4. Handle Pending Changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes."
    echo "Please enter a brief description of these changes for the release notes:"
    read USER_DESC
    if [ -z "$USER_DESC" ]; then
        USER_DESC="minor updates and synchronization"
    fi
    echo "📦 Committing changes with message: feat: $USER_DESC"
    git add .
    git commit -m "feat: $USER_DESC"
fi

# 5. Generate Professional Release Notes
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
REPO_URL=$(git config --get remote.origin.url | sed 's/\.git$//')

echo "📝 Generating professional changelog..."

# Helper to filter and format log
get_log() {
    local pattern=$1
    git log $LAST_TAG..HEAD --oneline --pretty=format:"- %s" | grep -iE "$pattern" | grep -vE "chore\(release\)|chore: cleanup|pre-release" || echo ""
}

# Categorization Logic
FEATS=$(get_log "^feat")
FIXES=$(get_log "^fix")
REFACTORS=$(get_log "^refactor|^perf")
OTHER=$(git log $LAST_TAG..HEAD --oneline --pretty=format:"- %s" | grep -vE "^feat|^fix|^refactor|^perf|^chore\(release\)|^chore: cleanup|pre-release" || echo "")

NOTES_FILE="RELEASE_NOTES_$NEW_TAG.md"
cat <<EOF > $NOTES_FILE
# Release Notes Candidate: $NEW_TAG

$( [ -n "$FEATS" ] && echo "### ✨ Features" && echo "$FEATS" && echo "" )
$( [ -n "$FIXES" ] && echo "### 🐛 Bug Fixes" && echo "$FIXES" && echo "" )
$( [ -n "$REFACTORS" ] && echo "### 🛠️ Refactors & Performance" && echo "$REFACTORS" && echo "" )
$( [ -n "$OTHER" ] && echo "### 📝 Other Changes" && echo "$OTHER" && echo "" )

---
**Full Changelog**: [${LAST_TAG:-initial}...$NEW_TAG]($REPO_URL/compare/${LAST_TAG:-main}...$NEW_TAG)
EOF

# 6. Git Operations (Release Bump)
git add .
git commit -m "chore(release): bump to $NEW_TAG"
git tag $NEW_TAG
git push origin main
git push origin $NEW_TAG
rm $NOTES_FILE
git add .
git commit -m "chore(release): cleanup release notes for $NEW_TAG"
git push origin main

echo "✅ Deployed $NEW_TAG successfully!"
