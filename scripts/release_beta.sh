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

# 4. Generate Release Notes
NOTES_FILE="RELEASE_NOTES_$NEW_TAG.md"
cat <<EOF > $NOTES_FILE
# Release Notes: $NEW_TAG

## 📝 Widget Enhancements
- **Markdown Widget**: Fixed critical persistence bug (ID type mismatch) and refactored Preview/Lock UI for robust state toggling.
- **Notepad Widget**: Implemented full internationalization for insert modals and tooltips. Added auto-focus and caret styling refinements.
- **Manual Save**: Standardized manual saving behavior across both Widgets (save only on Lock).

## 🌐 Internationalization & Audit
- **Natural Language**: Refined translations across 20 languages to sound more human and realistic (e.g., "All set!", "Oops!").
- **Script Fix**: Fixed duplicate property errors in the `i18n-sync.ts` utility.
- **TSConfig Audit**: Verified and confirmed project configuration for modern Bun/Web environment.
EOF

# 5. Git Operations
git add .
git commit -m "chore(release): bump to $NEW_TAG (padded system)"
git tag $NEW_TAG
git push origin $NEW_TAG
rm $NOTES_FILE

echo "✅ Deployed $NEW_TAG successfully!"
