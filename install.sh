#!/bin/bash
set -e

# ==========================================
# 💎 Lastboard Installer
# Elegant. Fast. Private.
# ==========================================

# Colors
GREEN='\033[1;32m'
BLUE='\033[1;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

# Configuration
# Configuration
REPO="CodigoSH/Lastboard"
INSTALL_DIR="/opt/lastboard"
BIN_DIR="/usr/local/bin"
BINARY_NAME="lastboard"
DATA_DIR="/var/lib/lastboard"
SERVICE_FILE="/etc/systemd/system/lastboard.service"

# ... (Helper functions omitted for brevity in diff, keeping existing code if possible or rewriting the changed parts)

# Helper for friendly status
function status_msg() {
    echo -e "${BLUE}  • ${NC}$1"
}

function success_msg() {
    echo -e "${GREEN}  ✓ ${NC}$1"
}

# Fetch latest version for banner (Fail gracefully)
# Using Proxy to avoid GitHub Rate Limits
LATEST_VERSION=$(curl -s "https://api-updates.codigosh.com/api/v1/check-update?beta=true" | sed -n 's/.*"latest_version":"\([^"]*\)".*/\1/p')
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

# --- Existing Installation Checks ---

if [ -f "$SERVICE_FILE" ]; then
    # Start detection
    DETECTED_PORT=$(grep 'Environment="PORT=' "$SERVICE_FILE" | cut -d'=' -f3 | tr -d '"')
    
    if [ -n "$DETECTED_PORT" ]; then
        PORT="$DETECTED_PORT"
        IS_UPDATE=true
        status_msg "Existing installation found. Updating version on port ${BOLD}${PORT}${NC}..."
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

status_msg "Downloading latest version..."

# Determine release tag based on user preference
if [ "$RELEASE_CHANNEL" = "beta" ]; then
    # Fetch latest beta from Proxy
    status_msg "Checking for latest beta version via Proxy..."
    RELEASE_TAG=$(curl -s "https://api-updates.codigosh.com/api/v1/check-update?beta=true" | sed -n 's/.*"latest_version":"\([^"]*\)".*/\1/p')
    status_msg "Installing latest beta: $RELEASE_TAG"
else
    # Fetch latest stable from Proxy
    status_msg "Checking for latest stable version via Proxy..."
    RELEASE_TAG=$(curl -s "https://api-updates.codigosh.com/api/v1/check-update?beta=false" | sed -n 's/.*"latest_version":"\([^"]*\)".*/\1/p')
    status_msg "Installing latest stable: $RELEASE_TAG"
fi

if [ -z "$RELEASE_TAG" ]; then
    echo -e "${RED}  Failed to fetch release information from GitHub.${NC}"
    exit 1
fi

BASE_URL="https://github.com/CodigoSH/Lastboard/releases/download/$RELEASE_TAG"
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

# Security Hardening
ProtectSystem=full
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

# Ensure port is free
if lsof -i ":$PORT" -t >/dev/null 2>&1; then
    status_msg "Port $PORT is in use. Attempting to free it..."
    PID=$(lsof -i ":$PORT" -t)
    kill -9 "$PID" &>/dev/null || true
    sleep 1
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
