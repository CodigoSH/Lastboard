#!/bin/bash
set -e

# ==========================================
# 💎 Lastboard Installer
# Elegant. Fast. Private.
# ==========================================

# Colors
GREEN='\033[1;32m'
RED='\033[1;31m'
BLUE='\033[1;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

# The public keys a release may be signed with.
#
# A list, mirroring releasePublicKeys in internal/web/util/signature.go, and for
# the same reason: a release signed with a rotated key has to stay verifiable by
# an installer somebody downloaded last month. Append, never replace.
RELEASE_KEYS=(
    "kip44L4a8PBJ7CVWJSOJx5AaBTcpgM1tu9x05r+1Rz0="
)

# Configuration
INSTALL_DIR="/opt/lastboard"
BIN_DIR="/usr/local/bin"
BINARY_NAME="lastboard"
DATA_DIR="/var/lib/lastboard"
SERVICE_FILE="/etc/systemd/system/lastboard.service"

# ============================================================ uninstall
#
# There was no way to remove Lastboard cleanly before this: the unit, the
# binary, the symlink and the service account had to be found and deleted by
# hand, which is how a half-removed install happens.
#
#   curl -fsSL <this script's address> | sudo bash -s -- --uninstall           removes it, keeps the data
#   curl -fsSL <this script's address> | sudo bash -s -- --uninstall --purge   removes the data too
#
# The installer leaves no copy of itself behind, so these are the forms to type;
# `sudo bash install.sh --uninstall` works only for somebody who saved the file.
UNINSTALL=no
PURGE=no
REINSTALL=no
for ARG in "$@"; do
    case "$ARG" in
        --uninstall) UNINSTALL=yes ;;
        --purge) PURGE=yes ;;
        --reinstall) REINSTALL=yes ;;
        --help|-h)
            echo "Usage: curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash -s -- [--uninstall [--purge]] [--reinstall]"
            echo "       (or, with the script saved:  sudo bash install.sh [--uninstall [--purge]] [--reinstall])"
            echo "  --reinstall   install again even when this version is already the latest, to repair it"
            echo "  --uninstall   stop and remove Lastboard, keeping $DATA_DIR"
            echo "  --purge       with --uninstall, delete the data and the service account too"
            exit 0 ;;
        *) echo -e "${RED}Unknown option: $ARG${NC}"; exit 1 ;;
    esac
done

# Nothing here runs rm -rf on a path it has not looked at first. Each of these
# is a variable at the top of the file, and an empty or relative one would turn
# a tidy-up into whatever happens to be in the working directory.
safe_to_remove() {
    case "$1" in
        /|/usr|/etc|/var|/opt|/home|/root|/boot) echo -e "${RED}Refusing to remove $1${NC}"; exit 1 ;;
        /*) [ ${#1} -gt 4 ] || { echo -e "${RED}Refusing to remove $1${NC}"; exit 1 ;} ;;
        *) echo -e "${RED}Refusing to remove a path that is not absolute: '$1'${NC}"; exit 1 ;;
    esac
}

if [ "$UNINSTALL" = "yes" ]; then
    [ "$(id -u)" -eq 0 ] || { echo -e "${RED}Run this as root: curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash -s -- --uninstall${NC}"; exit 1; }
    safe_to_remove "$INSTALL_DIR"

    # Confirmed before anything is touched, not after. Somebody who types the
    # wrong word — or runs this where there is no terminal to type on — ends up
    # with the installation they started with rather than half of one.
    if [ "$PURGE" = "yes" ]; then
        safe_to_remove "$DATA_DIR"
        if (exec 3< /dev/tty) 2>/dev/null; then
            printf "  ${BOLD}Type DELETE to erase %s and its database: ${NC}" "$DATA_DIR" > /dev/tty
            IFS= read -r CONFIRM < /dev/tty 2>/dev/null || CONFIRM=""
            [ "$CONFIRM" = "DELETE" ] || { echo -e "${RED}Not confirmed. Nothing has been removed.${NC}"; exit 1; }
        else
            echo -e "${RED}--purge needs a terminal to confirm on. Nothing has been removed.${NC}"
            exit 1
        fi
    fi

    echo -e "${BLUE}  • ${NC}Stopping the service..."
    systemctl disable --now lastboard >/dev/null 2>&1 || true
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload >/dev/null 2>&1 || true

    echo -e "${BLUE}  • ${NC}Removing the binary..."
    rm -f "$BIN_DIR/$BINARY_NAME"
    rm -rf "$INSTALL_DIR"

    if [ "$PURGE" = "yes" ]; then
        rm -rf "$DATA_DIR"
        userdel lastboard >/dev/null 2>&1 || true
        echo -e "${GREEN}  ✓ ${NC}Removed, data and all."
    else
        echo -e "${GREEN}  ✓ ${NC}Removed. Your data is still in $DATA_DIR."
    fi
    exit 0
fi

# Helper for friendly status
function status_msg() {
    echo -e "${BLUE}  • ${NC}$1"
}

function success_msg() {
    echo -e "${GREEN}  ✓ ${NC}$1"
}

# Fetch latest version for banner (Fail gracefully)
LATEST_VERSION=$(curl -s "https://git.codigosh.com/api/v1/repos/CodigoSH/Lastboard/releases?limit=1" | sed -n 's/.*"tag_name":"\([^"]*\)".*/\1/p')
if [ -z "$LATEST_VERSION" ]; then
    LATEST_VERSION="latest"
fi

# Banner
clear
echo -e "${BLUE}"
echo "  _               _   _                         _ "
echo " | |             | | | |                       | |"
echo " | |     __ _ ___| |_| |__   ___   __ _ _ __ __| |"
echo " | |    / _\` / __| __| '_ \ / _ \ / _\` | '__/ _\` |"
echo " | |___| (_| \__ \ |_| |_) | (_) | (_| | | | (_| |"
echo " |______\__,_|___/\__|_.__/ \___/ \__,_|_|  \__,_|"
echo -e "${NC}"
echo -e "  Welcome to Lastboard. Let's get you started.\n"

# 1. Check Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${GRAY}  [Info] This script needs admin privileges to set up the service.${NC}"
  echo -e "${RED}  Please run with sudo.${NC}"
  exit 1
fi

# 2. Configuration
PORT="8080"
IS_UPDATE=false
INSTALLED_VERSION=""
TRUST_PROXY=false

# --- Existing Installation Checks ---

if [ -f "$SERVICE_FILE" ]; then
    # Start detection
    DETECTED_PORT=$(grep 'Environment="PORT=' "$SERVICE_FILE" | cut -d'=' -f3 | tr -d '"')
    DETECTED_PROXY=$(grep 'Environment="TRUST_PROXY=' "$SERVICE_FILE" | cut -d'=' -f3 | tr -d '"')

    if [ -n "$DETECTED_PORT" ]; then
        PORT="$DETECTED_PORT"
        TRUST_PROXY="${DETECTED_PROXY:-false}"
        IS_UPDATE=true
        # "Lastboard v1.9.3" -> "v1.9.3". Empty when the binary is missing or will
        # not run, which is the very case --reinstall exists for.
        INSTALLED_VERSION=$("$INSTALL_DIR/$BINARY_NAME" --version 2>/dev/null | awk '{print $2}' | head -1 || true)
        if [ -n "$INSTALLED_VERSION" ]; then
            status_msg "Existing installation found (${BOLD}${INSTALLED_VERSION}${NC}) on port ${BOLD}${PORT}${NC}."
        else
            status_msg "Existing installation found on port ${BOLD}${PORT}${NC}."
        fi
    fi
fi

# Ask for release channel preference
RELEASE_CHANNEL="stable"
if [ -c /dev/tty ]; then
    if [ "$IS_UPDATE" = false ]; then
        echo -n "  Desired Port [8080]: "
        read -r INPUT_PORT < /dev/tty
        if [[ -n "$INPUT_PORT" ]]; then
            PORT="$INPUT_PORT"
        fi
    fi
    
    echo -n "  Release Channel (stable/beta) [stable]: "
    read -r INPUT_CHANNEL < /dev/tty
    if [[ "$INPUT_CHANNEL" == "beta" ]]; then
        RELEASE_CHANNEL="beta"
    fi

    echo -n "  Behind a reverse proxy? (nginx, Traefik, Caddy, Cloudflare...) (yes/no) [no]: "
    read -r INPUT_PROXY < /dev/tty
    if [[ "$INPUT_PROXY" == "yes" || "$INPUT_PROXY" == "y" ]]; then
        TRUST_PROXY=true
    else
        TRUST_PROXY=false
    fi
fi
echo "" # Spacer

# 3. Installation Process
status_msg "Checking system compatibility..."
ARCH=$(uname -m)
case $ARCH in
    x86_64) ARCH_TAG="amd64" ;;
    aarch64|arm64) ARCH_TAG="arm64" ;;
    *) echo -e "${RED}  Sorry, your architecture ($ARCH) is not supported yet.${NC}"; exit 1 ;;
esac

status_msg "Preparing environment..."
# Create User
if ! id "lastboard" &>/dev/null; then
    useradd -r -s /bin/false lastboard
fi

# Create Directories
mkdir -p "$DATA_DIR"
mkdir -p "$INSTALL_DIR"

# Set Permissions (CRITICAL FOR SELF-UPDATE)
chown -R lastboard:lastboard "$DATA_DIR"
chown -R lastboard:lastboard "$INSTALL_DIR"
chmod 750 "$DATA_DIR"
chmod 755 "$INSTALL_DIR"

# Determine release tag based on user preference
if [ "$RELEASE_CHANNEL" = "beta" ]; then
    # Fetch latest beta from Proxy
    status_msg "Checking for latest beta version..."
    RELEASE_TAG=$(curl -s "https://git.codigosh.com/api/v1/repos/CodigoSH/Lastboard/releases?limit=1" | sed -n 's/.*"tag_name":"\([^"]*\)".*/\1/p')
else
    # Fetch latest stable from Proxy
    status_msg "Checking for latest stable version..."
    RELEASE_TAG=$(curl -s "https://git.codigosh.com/api/v1/repos/CodigoSH/Lastboard/releases/latest" | sed -n 's/.*"tag_name":"\([^"]*\)".*/\1/p')
fi

if [ -z "$RELEASE_TAG" ]; then
    echo -e "${RED}  Failed to fetch release information.${NC}"
    exit 1
fi

# Nothing to do is an answer, not an error. Compared as text on purpose: the
# only question is "is it the one I would install", and ordering a beta against
# a stable is how somebody ends up never offered an update.
if [ "$IS_UPDATE" = true ] && [ -n "$INSTALLED_VERSION" ] && [ "$INSTALLED_VERSION" = "$RELEASE_TAG" ] && [ "$REINSTALL" != yes ]; then
    echo ""
    success_msg "You already have the latest $RELEASE_CHANNEL version (${RELEASE_TAG}). Nothing to do."
    echo ""
    echo -e "  ${GRAY}To install it again, to repair it or to apply other answers, run:${NC}"
    echo -e "    ${CYAN}curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash -s -- --reinstall${NC}"
    echo ""
    exit 0
fi

if [ -n "$INSTALLED_VERSION" ] && [ "$INSTALLED_VERSION" = "$RELEASE_TAG" ]; then
    status_msg "Reinstalling $RELEASE_TAG..."
elif [ -n "$INSTALLED_VERSION" ]; then
    status_msg "Updating $INSTALLED_VERSION → $RELEASE_TAG..."
else
    status_msg "Installing $RELEASE_CHANNEL: $RELEASE_TAG"
fi

status_msg "Downloading..."
BASE_URL="https://git.codigosh.com/CodigoSH/Lastboard/releases/download/$RELEASE_TAG"
ARCHIVE_NAME="lastboard-linux-$ARCH_TAG.tar.gz"
URL="$BASE_URL/$ARCHIVE_NAME"
CHECKSUM_URL="$BASE_URL/checksums.txt"

# Download archive and checksums
if ! curl -fL -s -o lastboard.tar.gz "$URL"; then
    echo -e "${RED}  Download failed.${NC}"
    echo -e "${GRAY}  Please check your internet connection or if the release exists.${NC}"
    rm -f lastboard.tar.gz
    exit 1
fi

status_msg "Verifying checksum..."
if ! curl -fL -s -o checksums.txt "$CHECKSUM_URL"; then
    echo -e "${RED}  Failed to download checksums.txt. Aborting for security.${NC}"
    rm -f lastboard.tar.gz
    exit 1
fi

# The signature over checksums.txt, checked before the checksums are believed.
#
# Without this the only thing standing behind a fresh install is that
# checksums.txt arrived over HTTPS — and whoever can serve the binary can serve
# the checksum that matches it. Every release has been signed since v1.7.3;
# signature.go says these keys are for "auto-update and install", and until now
# only the first half was true.
status_msg "Verifying signature..."
if ! curl -fL -s -o checksums.txt.sig "$CHECKSUM_URL.sig"; then
    echo -e "${RED}  This release has no signature. Aborting.${NC}"
    echo -e "${GRAY}  Installing something nobody signed is not worth the convenience.${NC}"
    rm -f lastboard.tar.gz checksums.txt checksums.txt.sig
    exit 1
fi

if [ ${#RELEASE_KEYS[@]} -eq 0 ]; then
    echo -e "${RED}  This installer has no release keys, so it cannot verify anything.${NC}"
    rm -f lastboard.tar.gz checksums.txt checksums.txt.sig
    exit 1
fi

if ! command -v openssl >/dev/null; then
    echo -e "${RED}  openssl is required to check the release signature.${NC}"
    rm -f lastboard.tar.gz checksums.txt checksums.txt.sig
    exit 1
fi

# `pkeyutl -rawin` arrived in OpenSSL 3.0. On 1.1.1 there is no command-line way
# to verify ed25519 at all, and the errors it gives read as though the signature
# were bad rather than the tool too old.
OPENSSL_MAJOR=$(openssl version 2>/dev/null | sed -nE 's/^OpenSSL ([0-9]+).*/\1/p')
if [ -z "$OPENSSL_MAJOR" ] || [ "$OPENSSL_MAJOR" -lt 3 ]; then
    echo -e "${RED}  openssl 3.0 or newer is required to verify an ed25519 signature.${NC}"
    echo -e "${GRAY}  This machine has: $(openssl version 2>&1 | head -1)${NC}"
    rm -f lastboard.tar.gz checksums.txt checksums.txt.sig
    exit 1
fi

base64 -d < checksums.txt.sig > signature.bin 2>/dev/null || {
    echo -e "${RED}  The signature is not valid base64. Aborting.${NC}"
    rm -f lastboard.tar.gz checksums.txt checksums.txt.sig signature.bin
    exit 1
}

VERIFIED=false
for key in "${RELEASE_KEYS[@]}"; do
    # An ed25519 public key as a DER SubjectPublicKeyInfo is a fixed 12-byte
    # prefix followed by the 32 raw bytes, which is what lets openssl read a key
    # we ship as plain base64.
    printf '%s' "MCowBQYDK2VwAyEA$key" | base64 -d > key.der 2>/dev/null || continue
    openssl pkey -pubin -inform DER -in key.der -out key.pem 2>/dev/null || continue
    if openssl pkeyutl -verify -pubin -inkey key.pem -rawin \
        -in checksums.txt -sigfile signature.bin >/dev/null 2>&1; then
        VERIFIED=true
        break
    fi
done
rm -f checksums.txt.sig signature.bin key.der key.pem

if [ "$VERIFIED" != true ]; then
    echo -e "${RED}  The signature does not match any key this installer knows.${NC}"
    echo -e "${GRAY}  Do not run what you just downloaded.${NC}"
    rm -f lastboard.tar.gz checksums.txt
    exit 1
fi
success_msg "Signature verified."

EXPECTED_HASH=$(grep "$ARCHIVE_NAME" checksums.txt | awk '{print $1}')
if [ -z "$EXPECTED_HASH" ]; then
    echo -e "${RED}  Archive not found in checksums.txt. Aborting.${NC}"
    rm -f lastboard.tar.gz checksums.txt
    exit 1
fi

ACTUAL_HASH=$(sha256sum lastboard.tar.gz | awk '{print $1}')
if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
    echo -e "${RED}  Checksum mismatch! Download may be tampered. Aborting.${NC}"
    rm -f lastboard.tar.gz checksums.txt
    exit 1
fi
rm -f checksums.txt
success_msg "Checksum verified."

tar -xzf lastboard.tar.gz
rm lastboard.tar.gz

if [ -f "lastboard" ]; then
    chmod +x lastboard

    # An intact download can still be unusable here — the wrong architecture, a
    # truncated file, a library that is not on this machine — and the checksum
    # says nothing about any of that. Running it once costs nothing; finding out
    # after the swap means finding out while the service is down.
    if ! ./lastboard --version >/dev/null 2>&1; then
        echo -e "${RED}  The downloaded binary does not run on this machine. Aborting.${NC}"
        echo    "  Whatever was installed before has not been touched."
        rm -f lastboard
        exit 1
    fi

    # Copy the database before swapping the binary. The moment somebody wants a
    # copy is after it is too late to take one, and a new version may migrate
    # the schema on its first start.
    #
    # The service is stopped first on purpose: copying a live SQLite file can
    # catch it mid-write, and a backup nobody can open is worse than an honest
    # absence. It is about to be restarted anyway.
    STOPPED_FOR_BACKUP=0
    if [ -f "$DATA_DIR/$BINARY_NAME.db" ]; then
        if systemctl is-active --quiet lastboard; then
            systemctl stop lastboard &>/dev/null && STOPPED_FOR_BACKUP=1
        fi
        BACKUP="$DATA_DIR/$BINARY_NAME.db.backup-$(date +%Y%m%d-%H%M%S)"
        if cp "$DATA_DIR/$BINARY_NAME.db" "$BACKUP"; then
            chown lastboard:lastboard "$BACKUP" 2>/dev/null || true
            success_msg "Database copied to $(basename "$BACKUP")"
            # Keep the three most recent and drop the rest. An upgrade every few
            # weeks would otherwise leave a copy of the database in the data
            # directory for ever, and the old ones are the least useful.
            ls -1t "$DATA_DIR/$BINARY_NAME.db.backup-"* 2>/dev/null \
                | tail -n +4 | while read -r OLD; do rm -f "$OLD"; done
        else
            echo -e "${RED}  Could not copy the database. Aborting.${NC}"
            [ "$STOPPED_FOR_BACKUP" = "1" ] && systemctl start lastboard &>/dev/null
            rm -f lastboard
            exit 1
        fi
    fi

    mv lastboard "$INSTALL_DIR/$BINARY_NAME"
    chown lastboard:lastboard "$INSTALL_DIR/$BINARY_NAME"
    ln -sf "$INSTALL_DIR/$BINARY_NAME" "$BIN_DIR/$BINARY_NAME"
else
    echo -e "${RED}  Installation failed (binary missing). Check logs.${NC}"
    exit 1
fi

status_msg "Configuring system service..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Lastboard Dashboard Service
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=lastboard
Group=lastboard
WorkingDirectory=$DATA_DIR
ExecStartPre=/usr/bin/chmod +x $INSTALL_DIR/$BINARY_NAME
ExecStart=$INSTALL_DIR/$BINARY_NAME
Restart=always
RestartSec=5
Environment="PORT=$PORT"
Environment="DB_FILE=$DATA_DIR/lastboard.db"
Environment="TRUST_PROXY=$TRUST_PROXY"

# Security Hardening
ProtectSystem=full
PrivateTmp=true
NoNewPrivileges=true
MemoryMax=512M
CPUQuota=200%

[Install]
WantedBy=multi-user.target
EOF

# The port has to be free for the service to start, and this used to kill -9
# whatever held it. On a machine where 8080 is somebody else's service, that is
# an outage caused by an installer. Lastboard's own process is fine — the
# restart below replaces it — but anything else is reported, not killed: whoever
# runs this script knows what runs on their machine and the script does not.
if command -v lsof >/dev/null 2>&1 && lsof -i ":$PORT" -t >/dev/null 2>&1; then
    FOREIGN=""
    for PID in $(lsof -i ":$PORT" -t); do
        HOLDER=$(readlink -f "/proc/$PID/exe" 2>/dev/null || true)
        case "$HOLDER" in
            "$INSTALL_DIR/$BINARY_NAME"|"$BIN_DIR/$BINARY_NAME") ;;
            *) FOREIGN="$FOREIGN\n    PID $PID  ${HOLDER:-unknown}" ;;
        esac
    done
    if [ -n "$FOREIGN" ]; then
        echo -e "${RED}  Port $PORT is held by something that is not Lastboard:${NC}"
        echo -e "${RED}$FOREIGN${NC}"
        echo    "  Free that port, or set PORT to another one, and run this again."
        echo    "  The files are installed; the service has not been started."
        exit 1
    fi
fi

systemctl daemon-reload &>/dev/null
systemctl enable lastboard &>/dev/null
systemctl restart lastboard &>/dev/null

# Internal Migration: Rename dashboard.db to lastboard.db if exists
if [ -f "$DATA_DIR/dashboard.db" ] && [ ! -f "$DATA_DIR/lastboard.db" ]; then
    status_msg "Renaming legacy database file..."
    mv "$DATA_DIR/dashboard.db" "$DATA_DIR/lastboard.db"
    chown lastboard:lastboard "$DATA_DIR/lastboard.db"
fi

# Verification
sleep 5 # Increased sleep for exec type to settle
if systemctl is-active --quiet lastboard; then
    IP=$(hostname -I | awk '{print $1}')
    echo ""
    success_msg "Installation complete!"
    echo -e ""
    echo -e "  🚀 Open your dashboard at: ${BLUE}${BOLD}http://$IP:$PORT${NC}"
    echo -e ""
else
    echo -e "${RED}  Service failed to start.${NC}"
    echo -e "${GRAY}  Last 50 log lines:${NC}"
    echo -e "${GRAY}  ---------------------------------------------------${NC}"
    journalctl -u lastboard -n 50 --no-pager
    echo -e "${GRAY}  ---------------------------------------------------${NC}"
    exit 1
fi
