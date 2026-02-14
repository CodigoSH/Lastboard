#!/bin/bash

# ==========================================
# 🚀 Unified Release Script
# Handles: Stable, Beta, and RC releases
# Usage: ./scripts/release.sh [stable|beta|rc]
# ==========================================

TYPE=$1

if [[ "$TYPE" != "stable" && "$TYPE" != "beta" && "$TYPE" != "rc" ]]; then
    echo "Usage: ./scripts/release.sh [stable|beta|rc]"
    echo "  stable : Promotes current version to stable (removes suffixes)"
    echo "  beta   : Bumps Beta version (creates new patch-Beta.01 if current is stable)"
    echo "  rc     : Bumps RC version"
    exit 1
fi

# Configuration
VERSION_FILE="package.json"
GO_VERSION_FILE="internal/version/version.go"
SETTINGS_FILE="web/src/components/ui/SettingsContent/SettingsContent.ts"

# 1. Get current version
if [ ! -f "$VERSION_FILE" ]; then
    echo "❌ package.json not found!"
    exit 1
fi
CURRENT_FULL=$(grep -oP '"version": "\K[^"]+' $VERSION_FILE)
echo "ℹ️  Current Version: $CURRENT_FULL"

# 2. Calculate New Version
BASE_VERSION=$(echo $CURRENT_FULL | sed -E 's/-(Beta|RC)\.[0-9]+$//')

case $TYPE in
    beta)
        if [[ "$CURRENT_FULL" == *"-Beta."* ]]; then
            # Increment existing Beta
            LAST_NUM=$(echo $CURRENT_FULL | grep -oP 'Beta\.\K[0-9]+')
            NEXT_NUM=$((10#$LAST_NUM + 1))
        elif [[ "$CURRENT_FULL" == *"-RC."* ]]; then
             # Switching from RC back to Beta (Unusual but possible)
             NEXT_NUM=1
        else
            # From Stable to Beta -> Increment Patch version first? 
            # Usually: 1.2.0 -> 1.2.1-Beta.01
            # But simplistic logic might just append. 
            # Let's check semantic versioning. 
            # If I am on 1.2.0, next beta is 1.2.1-Beta.01 usually. 
            # However, the previous script simplistic logic for Beta was:
            # NEW_BASE=$BASE_VERSION (which extracts 1.2.0 from 1.2.0)
            # So 1.2.0 -> 1.2.0-Beta.01? That's technically a "lower" version.
            # Let's perform a PATCH bump if starting from stable.
            
            IFS='.' read -r -a PARTS <<< "$BASE_VERSION"
            MAJOR="${PARTS[0]}"
            MINOR="${PARTS[1]}"
            PATCH="${PARTS[2]}"
            NEW_PATCH=$((PATCH + 1))
            BASE_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
            NEXT_NUM=1
            echo "ℹ️  Bumping patch for new Beta cycle: $BASE_VERSION"
        fi
        
        PADDED=$(printf "%02d" $NEXT_NUM)
        NEW_VERSION="$BASE_VERSION-Beta.$PADDED"
        NEW_TAG="v$NEW_VERSION"
        ;;

    rc)
        if [[ "$CURRENT_FULL" == *"-RC."* ]]; then
            LAST_NUM=$(echo $CURRENT_FULL | grep -oP 'RC\.\K[0-9]+')
            NEXT_NUM=$((10#$LAST_NUM + 1))
        else
            # From Beta or Stable to RC
            # Keep the same Base Version
            NEXT_NUM=1
        fi
        
        PADDED=$(printf "%02d" $NEXT_NUM)
        NEW_VERSION="$BASE_VERSION-RC.$PADDED"
        NEW_TAG="v$NEW_VERSION"
        ;;

    stable)
        # 1.1.8-Beta.07 -> 1.1.8
        NEW_VERSION="$BASE_VERSION"
        NEW_TAG="v$NEW_VERSION"
        
        echo "Current Version: $CURRENT_FULL"
        echo "Proposed Stable: $NEW_VERSION"
        echo "Press ENTER to confirm or type a manual version:"
        read MANUAL_INPUT
        if [ ! -z "$MANUAL_INPUT" ]; then
            NEW_VERSION=$MANUAL_INPUT
            NEW_TAG="v$NEW_VERSION"
        fi
        ;;
esac

echo "🚀 Preparing Release: $NEW_TAG ($TYPE)"
if [ "$TYPE" == "stable" ]; then
    read -p "Are you sure? This will push to production. (y/N) " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        echo "❌ Cancelled"
        exit 1
    fi
fi

# 3. Update Files
echo "📝 Updating version files..."
sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" $VERSION_FILE
sed -i "s/Current = \".*\"/Current = \"$NEW_TAG\"/" $GO_VERSION_FILE
sed -i "s/private version = '.*'/private version = '$NEW_TAG'/" $SETTINGS_FILE

# 4. Handle Pending Changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes."
    echo "Enter brief description for release notes (default: 'minor updates'):"
    read USER_DESC
    if [ -z "$USER_DESC" ]; then
        USER_DESC="minor updates"
    fi
    git add .
    git commit -m "feat: $USER_DESC"
fi

# 5. Generate Changelog
# 5. Generate Changelog
if [ "$TYPE" == "stable" ]; then
    # Find the last stable tag (exclude Beta/RC)
    # Sort by version desc, filter out pre-releases, take the first one
    LAST_TAG=$(git tag -l "v*" --sort=-v:refname | grep -v -E 'Beta|RC' | head -n 1)
    if [ -z "$LAST_TAG" ]; then
        LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
    fi
    echo "📝 Generating stable changelog (aggregating since $LAST_TAG)..."
else
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
    echo "📝 Generating changelog from $LAST_TAG..."
fi

REPO_URL=$(git config --get remote.origin.url | sed 's/\.git$//')

echo "📝 Generating changelog from $LAST_TAG..."

get_log() {
    local pattern=$1
    git log $LAST_TAG..HEAD --oneline --pretty=format:"- %s" | grep -iE "$pattern" | grep -vE "chore\(release\)|chore: cleanup|pre-release" || echo ""
}

FEATS=$(get_log "^feat")
FIXES=$(get_log "^fix")
REFACTORS=$(get_log "^refactor|^perf")
OTHER=$(git log $LAST_TAG..HEAD --oneline --pretty=format:"- %s" | grep -vE "^feat|^fix|^refactor|^perf|^chore\(release\)|^chore: cleanup|pre-release" || echo "")

NOTES_FILE="RELEASE_NOTES_$NEW_TAG.md"
cat <<EOF > $NOTES_FILE
# Release: $NEW_TAG

$( [ -n "$FEATS" ] && echo "### ✨ Features" && echo "$FEATS" && echo "" )
$( [ -n "$FIXES" ] && echo "### 🐛 Bug Fixes" && echo "$FIXES" && echo "" )
$( [ -n "$REFACTORS" ] && echo "### 🛠️ Refactors & Performance" && echo "$REFACTORS" && echo "" )
$( [ -n "$OTHER" ] && echo "### 📝 Other Changes" && echo "$OTHER" && echo "" )

---
**Full Changelog**: [${LAST_TAG:-initial}...$NEW_TAG]($REPO_URL/compare/${LAST_TAG:-main}...$NEW_TAG)
EOF

# 6. Git Operations
echo "📦 Committing Release..."
git add .
git commit -m "chore(release): bump to $NEW_TAG"
git tag $NEW_TAG

echo "📤 Pushing to Remote..."
git push origin main
git push origin $NEW_TAG

# Cleanup
rm $NOTES_FILE
git add .
git commit -m "chore(release): cleanup notes for $NEW_TAG"
git push origin main

echo "✅ Successfully deployed $NEW_TAG!"
