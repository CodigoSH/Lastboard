#!/bin/bash

# ==========================================
# 🚀 Unified Release Script
# Handles: Stable, Beta, and RC releases
#
# Usage: ./scripts/release.sh [stable|beta|rc] ["release title"] [--dry-run]
#                                              [--skip-checks]
#
# The title is the one-line summary of the release. It ends up as the `feat:`
# commit the changelog is built from, so give it a real sentence; passing it as
# an argument is what keeps it from falling back to "minor updates".
#
# --dry-run prints the version it would produce, checks every file it would
# rewrite, renders the changelog and lists the git commands — without touching
# a single file. Use it to inspect a release before making it.
# ==========================================

# Fail loudly: an unchecked error here means a tag pushed against a broken tree.
set -euo pipefail

# --- Arguments ------------------------------------------------------------

TYPE=""
TITLE=""
FORCED_VERSION=""
DRY_RUN=0
SKIP_CHECKS=0
ASSUME_YES=0

for arg in "$@"; do
    case "$arg" in
        stable|beta|rc)  TYPE="$arg" ;;
        --dry-run)       DRY_RUN=1 ;;
        --skip-checks)   SKIP_CHECKS=1 ;;
        --yes|-y)        ASSUME_YES=1 ;;
        --*)             echo "❌ Unknown option: $arg"; exit 1 ;;
        # A bare X.Y.Z is the target version, not a title. This is the
        # stable-from-stable case, where the computed version is the one already
        # tagged and the real one has to be stated.
        [0-9]*.[0-9]*.[0-9]*) FORCED_VERSION="$arg" ;;
        *)               TITLE="$arg" ;;
    esac
done

if [[ "$TYPE" != "stable" && "$TYPE" != "beta" && "$TYPE" != "rc" ]]; then
    echo "Usage: ./scripts/release.sh [stable|beta|rc] [X.Y.Z] [\"release title\"] [options]"
    echo "  stable : Promotes current version to stable (removes suffixes)"
    echo "  beta   : Bumps Beta version (creates new patch-Beta.01 if current is stable)"
    echo "  rc     : Bumps RC version"
    echo
    echo "  X.Y.Z          Target version, for when the computed one is not the one you want"
    echo "                 (stable-from-stable: 1.6.2 is already tagged, so pass 1.6.3)"
    echo "  --dry-run      Show what would happen, change nothing"
    echo "  --yes, -y      Don't ask for confirmation (required to run stable without a terminal)"
    echo "  --skip-checks  Skip the test/build preflight (emergencies only)"
    exit 1
fi

# A stable moves the Docker `latest` tag and offers itself to everyone on the
# stable channel, so it asks before pushing. Without a terminal that question
# cannot be answered — fail here rather than after two minutes of preflight,
# which is what used to happen.
if [ "$TYPE" = "stable" ] && [ "$DRY_RUN" = "0" ] && [ "$ASSUME_YES" = "0" ] && [ ! -t 0 ]; then
    echo "❌ 'stable' asks for confirmation and there is no terminal to ask on."
    echo "   Re-run with --yes to confirm up front."
    exit 1
fi

# Configuration
VERSION_FILE="package.json"
GO_VERSION_FILE="internal/version/version.go"
SETTINGS_FILE="web/src/components/ui/SettingsContent/SettingsContent.ts"
UPDATE_SERVICE_FILE="web/src/services/UpdateService.ts"

RELEASE_BRANCH="main"

die() { echo "❌ $1" >&2; exit 1; }

# Runs a command, or prints it when doing a dry run.
run() {
    if [ "$DRY_RUN" = "1" ]; then
        echo "   [dry-run] $*"
    else
        "$@"
    fi
}

if [ "$DRY_RUN" = "1" ]; then
    echo "🧪 DRY RUN — nothing will be written, committed or pushed."
    echo
fi

# --- 0. Preconditions ------------------------------------------------------

# A release must be reproducible from what is published, so the tree has to be
# clean and level with the remote before anything is rewritten. The old script
# swept whatever was lying around into the release commit with `git add .`.
echo "🔍 Checking the repository..."

[ -f "$VERSION_FILE" ] || die "package.json not found — run this from the project root."
git rev-parse --git-dir >/dev/null 2>&1 || die "Not a git repository."

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$CURRENT_BRANCH" = "$RELEASE_BRANCH" ] || \
    die "On branch '$CURRENT_BRANCH'. Releases are cut from '$RELEASE_BRANCH'."

if [ -n "$(git status --porcelain)" ]; then
    echo "   Uncommitted changes:"
    git status --short | sed 's/^/     /'
    # A dry run is for inspecting a release before making it, so it reports the
    # dirty tree and carries on; a real run stops.
    [ "$DRY_RUN" = "1" ] || \
        die "Commit or stash them first — a release commit should only carry the version bump."
    echo "   ⚠️  A real run would stop here."
    TREE_DIRTY=1
fi
TREE_DIRTY=${TREE_DIRTY:-0}

git fetch origin "$RELEASE_BRANCH" --quiet 2>/dev/null || \
    echo "   ⚠️  Could not reach origin; skipping the sync check."
if git rev-parse --verify --quiet "origin/$RELEASE_BRANCH" >/dev/null; then
    BEHIND=$(git rev-list --count "HEAD..origin/$RELEASE_BRANCH")
    [ "$BEHIND" = "0" ] || \
        die "Local $RELEASE_BRANCH is $BEHIND commit(s) behind origin. Pull first."
fi

if [ "$TREE_DIRTY" = "0" ]; then
    echo "   ✅ On $RELEASE_BRANCH, clean and up to date."
else
    echo "   ✅ On $RELEASE_BRANCH, up to date with origin."
fi

# --- 1. Preflight ----------------------------------------------------------

# Tag and push happen further down and cannot be taken back cheaply, so the
# suite runs *before* anything is written rather than by hand beforehand.
if [ "$SKIP_CHECKS" = "1" ]; then
    echo "⏭️  Preflight skipped (--skip-checks)."
else
    echo "🧪 Preflight..."

    UNFORMATTED=$(gofmt -l . 2>/dev/null | grep -v '^vendor/' || true)
    [ -z "$UNFORMATTED" ] || die "gofmt reports unformatted files:"$'\n'"$UNFORMATTED"
    echo "   ✅ gofmt"

    go vet ./... || die "go vet failed."
    echo "   ✅ go vet"

    go test ./... >/dev/null || die "Go tests failed. Run 'go test ./...' to see why."
    echo "   ✅ go test"

    bun test >/dev/null 2>&1 || die "Frontend tests failed. Run 'bun test' to see why."
    echo "   ✅ bun test"

    bun run build >/dev/null || die "Frontend build failed. Run 'bun run build' to see why."
    echo "   ✅ bun run build"

    # The build writes into web/dist and internal/web/dist; both are committed,
    # so a diff here means the tree was built from stale sources.
    if [ -n "$(git status --porcelain)" ]; then
        echo "   Build output differs from what is committed:"
        git status --short | sed 's/^/     /'
        [ "$DRY_RUN" = "1" ] || die "Commit the rebuilt assets first."
        echo "   ⚠️  A real run would stop here."
    fi
fi

# --- 2. Calculate the new version -----------------------------------------

CURRENT_FULL=$(grep -oP '"version": "\K[^"]+' "$VERSION_FILE") || \
    die "Could not read the version from $VERSION_FILE."
echo "ℹ️  Current Version: $CURRENT_FULL"

BASE_VERSION=$(echo "$CURRENT_FULL" | sed -E 's/-(Beta|RC)\.[0-9]+$//')

case $TYPE in
    beta)
        if [[ "$CURRENT_FULL" == *"-Beta."* ]]; then
            # Increment existing Beta
            LAST_NUM=$(echo "$CURRENT_FULL" | grep -oP 'Beta\.\K[0-9]+')
            NEXT_NUM=$((10#$LAST_NUM + 1))
        elif [[ "$CURRENT_FULL" == *"-RC."* ]]; then
            # Switching from RC back to Beta (unusual but possible)
            NEXT_NUM=1
        else
            # From stable, bump the patch first: 1.2.0 -> 1.2.1-Beta.01.
            # Reusing the same base would produce a version that sorts *below*
            # the stable it came from.
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
            LAST_NUM=$(echo "$CURRENT_FULL" | grep -oP 'RC\.\K[0-9]+')
            NEXT_NUM=$((10#$LAST_NUM + 1))
        else
            # From Beta or Stable to RC: keep the same base version
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
        ;;
esac

# An explicit X.Y.Z wins over the computed one. Stable-from-stable needs it: the
# computed version is the one already tagged.
if [ -n "$FORCED_VERSION" ]; then
    NEW_VERSION="$FORCED_VERSION"
    NEW_TAG="v$NEW_VERSION"
    echo "ℹ️  Version given on the command line: $NEW_VERSION"
fi

git rev-parse --verify --quiet "refs/tags/$NEW_TAG" >/dev/null && \
    die "Tag $NEW_TAG already exists. Pass the target version, e.g. '$0 $TYPE 1.2.3'."

echo "🚀 Preparing Release: $NEW_TAG ($TYPE)"

if [ "$TYPE" == "stable" ]; then
    # Spelled out rather than "this will push to production": a beta pushes too.
    # What only a stable does is move Docker's `latest` and offer itself to every
    # installation on the stable channel.
    echo "   This tags $NEW_TAG, moves the Docker 'latest' tag and offers the"
    echo "   update to every installation on the stable channel."
    if [ "$DRY_RUN" = "1" ]; then
        echo "   [dry-run] would ask for confirmation here (skip it with --yes)"
    elif [ "$ASSUME_YES" = "1" ]; then
        echo "   Confirmed with --yes."
    else
        read -r -p "   Continue? (y/N) " confirm || confirm=""
        if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
            echo "❌ Cancelled"
            exit 1
        fi
    fi
fi

# --- 3. Release title ------------------------------------------------------

# The one-line summary of the release. It heads the notes; it is NOT a changelog
# entry. It used to be committed as `feat: <title>`, which meant every beta title
# came back as a feature of the next stable — v1.6.2 shipped with four of them in
# its Added section, two of which duplicated the commit they were summarising.
if [ -z "$TITLE" ] && [ "$DRY_RUN" = "0" ]; then
    echo "Title for this release (one line, shown at the top of the notes):"
    read -r TITLE || TITLE=""
fi
[ -n "$TITLE" ] || TITLE="minor updates"
echo "🏷️  Title: $TITLE"

# --- 4. Update the version files -------------------------------------------

# Every rewrite is checked: a silent no-op here leaves the version disagreeing
# between package.json, the Go binary and the UI, which only shows up once
# someone reports that the app reports a version they never installed.
apply_version() {
    local file=$1 pattern=$2 replacement=$3 label=$4

    [ -f "$file" ] || die "$label: $file not found."
    grep -qE "$pattern" "$file" || \
        die "$label: no line matching /$pattern/ in $file — the file changed shape, update this script."

    if [ "$DRY_RUN" = "1" ]; then
        echo "   [dry-run] would rewrite $label in $file"
        echo "             $(grep -m1 -E "$pattern" "$file" | sed 's/^[[:space:]]*//')"
        return
    fi

    sed -i "$replacement" "$file"
    grep -qF "$NEW_TAG" "$file" || grep -qF "$NEW_VERSION" "$file" || \
        die "$label: the rewrite of $file did not take effect."
    echo "   ✅ $label"
}

echo "📝 Updating version files..."
apply_version "$VERSION_FILE" '"version": ".*"' \
    "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "package.json"
apply_version "$GO_VERSION_FILE" 'Current = ".*"' \
    "s/Current = \".*\"/Current = \"$NEW_TAG\"/" "version.go"
apply_version "$SETTINGS_FILE" "private version = '.*'" \
    "s/private version = '.*'/private version = '$NEW_TAG'/" "SettingsContent.ts"
apply_version "$UPDATE_SERVICE_FILE" "current_version: 'v[^']*', // Mock version for demo" \
    "s/current_version: 'v[^']*', \/\/ Mock version for demo/current_version: '$NEW_TAG', \/\/ Mock version for demo/" \
    "UpdateService.ts (current)"
apply_version "$UPDATE_SERVICE_FILE" "latest_version: 'v[^']*'," \
    "s/latest_version: 'v[^']*',/latest_version: '$NEW_TAG',/" "UpdateService.ts (latest)"

# Named explicitly: `git add .` would sweep in anything else in the tree.
echo "📦 Committing the version bump..."
run git add "$VERSION_FILE" "$GO_VERSION_FILE" "$SETTINGS_FILE" "$UPDATE_SERVICE_FILE"
run git commit -m "feat: $TITLE"

# --- 5. Generate the changelog ---------------------------------------------

if [ "$TYPE" == "stable" ]; then
    LAST_TAG=$(git tag -l "v*" --sort=-v:refname | grep -v -E 'Beta|RC' | head -n 1 || true)
    if [ -z "$LAST_TAG" ]; then
        LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
    fi
    echo "📝 Generating stable changelog (aggregating since $LAST_TAG)..."
else
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
    echo "📝 Generating changelog from $LAST_TAG..."
fi
[ -n "$LAST_TAG" ] || die "No previous tag found to build a changelog from."

get_log() {
    local pattern=$1
    git log "$LAST_TAG..HEAD" --oneline --pretty=format:"%s" | \
    grep -iE "$pattern" | \
    grep -vE "chore\(release\)|chore: cleanup|pre-release|chore: bump|Merge branch|Merge remote-tracking" | \
    sed -E 's/^(feat|fix|refactor|perf|chore|docs|style)(\([a-z0-9_-]+\))?: //i' | \
    sed 's/^[a-z]*: //' | \
    awk '{$1=toupper(substr($1,1,1))substr($1,2)}1' | \
    sed 's/^/- /' | \
    sort -u || echo ""
}

FEATS=$(get_log "^feat")
FIXES=$(get_log "^fix")
REFACTORS=$(get_log "^refactor|^perf")
OTHER=$(git log "$LAST_TAG..HEAD" --oneline --pretty=format:"%s" | grep -vE "^feat|^fix|^refactor|^perf|^chore\(release\)|^chore: cleanup|pre-release|chore: bump|Merge branch|Merge remote-tracking" | sed 's/^[a-z]*: //' | awk '{$1=toupper(substr($1,1,1))substr($1,2)}1' | sed 's/^/- /' | sort -u || echo "")

# Update CHANGELOG.md
if [ "$TYPE" == "stable" ] && [ -f "CHANGELOG.md" ]; then
    echo "📝 Updating CHANGELOG.md..."
    DATE=$(date +%Y-%m-%d)
    VERSION_DISPLAY=$(echo "$NEW_TAG" | sed 's/^v//')

    CL_CHANGED=""
    [ -n "$REFACTORS" ] && CL_CHANGED="$REFACTORS"
    [ -n "$OTHER" ] && CL_CHANGED="${CL_CHANGED:+$CL_CHANGED$'\n'}$OTHER"

    # Build the entry in a temp file with REAL newlines. (Composing it in a
    # shell var via $(echo -e '…\n') strips trailing newlines and runs the
    # section headers together, e.g. "…home### Fixed".)
    ENTRY_FILE=$(mktemp)
    {
        printf '## [%s] - %s\n\n' "$VERSION_DISPLAY" "$DATE"
        [ -n "$FEATS" ]      && printf '### Added\n%s\n\n' "$FEATS"
        [ -n "$FIXES" ]      && printf '### Fixed\n%s\n\n' "$FIXES"
        [ -n "$CL_CHANGED" ] && printf '### Changed\n%s\n\n' "$CL_CHANGED"
        true
    } > "$ENTRY_FILE"

    if [ "$DRY_RUN" = "1" ]; then
        echo "   [dry-run] CHANGELOG.md entry that would be inserted:"
        sed 's/^/     /' "$ENTRY_FILE"
    else
        # Insert before the first version header
        awk 'NR==FNR { entry = entry $0 "\n"; next }
             /^## \[/ && !done { printf "%s", entry; done=1 }
             { print }' "$ENTRY_FILE" CHANGELOG.md > CHANGELOG.md.tmp \
            && mv CHANGELOG.md.tmp CHANGELOG.md
    fi
    rm -f "$ENTRY_FILE"
fi

# Release body for Forgejo. A hand-written file always wins: the generated one
# is a list of commit subjects, which is not what a reader wants.
NOTES_FILE="RELEASE_NOTES_$NEW_TAG.md"
if [ -f "$NOTES_FILE" ]; then
    echo "📄 Using existing release notes: $NOTES_FILE"
else
    NOTES_CHANGED=""
    if [ -n "$REFACTORS" ] && [ -n "$OTHER" ]; then
        NOTES_CHANGED=$(printf '%s\n%s' "$REFACTORS" "$OTHER")
    elif [ -n "$REFACTORS" ]; then
        NOTES_CHANGED="$REFACTORS"
    else
        NOTES_CHANGED="$OTHER"
    fi

    if [ "$DRY_RUN" = "1" ]; then
        echo "   [dry-run] $NOTES_FILE would be generated as:"
        {
            [ -n "$FEATS" ]         && printf '### Added\n%s\n\n' "$FEATS"
            [ -n "$FIXES" ]         && printf '### Fixed\n%s\n\n' "$FIXES"
            [ -n "$NOTES_CHANGED" ] && printf '### Changed\n%s\n' "$NOTES_CHANGED"
            true
        } | sed 's/^/     /'
    else
        {
            [ -n "$FEATS" ]         && printf '### Added\n%s\n\n' "$FEATS"
            [ -n "$FIXES" ]         && printf '### Fixed\n%s\n\n' "$FIXES"
            [ -n "$NOTES_CHANGED" ] && printf '### Changed\n%s\n' "$NOTES_CHANGED"
            true
        } > "$NOTES_FILE"
    fi
fi

# --- 6. Commit, tag, push --------------------------------------------------

if [ "$DRY_RUN" = "1" ]; then
    echo "📦 Would commit the notes, tag $NEW_TAG and push:"
    echo "   [dry-run] git add CHANGELOG.md $NOTES_FILE"
    echo "   [dry-run] git commit -m 'chore(release): bump to $NEW_TAG'"
    echo "   [dry-run] git tag $NEW_TAG"
    echo "   [dry-run] git push origin $RELEASE_BRANCH && git push origin $NEW_TAG"
    echo "   [dry-run] rm $NOTES_FILE, commit cleanup, push"
    echo
    echo "🧪 Dry run complete — the working tree is untouched."
    exit 0
fi

echo "📦 Committing release notes..."
[ -f "CHANGELOG.md" ] && git add CHANGELOG.md
[ -f "$NOTES_FILE" ] && git add "$NOTES_FILE"
# The notes may already be committed, in which case there is nothing staged.
if ! git diff --cached --quiet; then
    git commit -m "chore(release): bump to $NEW_TAG"
fi

git tag "$NEW_TAG"

echo "📤 Pushing to Remote..."
# The tag goes last on purpose: it is what the CI builds from, so it must never
# point at commits the branch has not accepted.
git push origin "$RELEASE_BRANCH" || die "Push to $RELEASE_BRANCH failed. The tag $NEW_TAG stays local; delete it with 'git tag -d $NEW_TAG' once resolved."
git push origin "$NEW_TAG" || die "Tag push failed. $RELEASE_BRANCH is already pushed; retry with 'git push origin $NEW_TAG'."

# Cleanup: the notes live on in the tag, but are removed from the branch so the
# root does not collect one file per release. Only this release's file.
if [ -f "$NOTES_FILE" ]; then
    rm -f "$NOTES_FILE"
    git add "$NOTES_FILE"
    git commit -m "chore(release): cleanup release notes [skip ci]"
    git push origin "$RELEASE_BRANCH"
fi

echo "✅ Successfully deployed $NEW_TAG!"
