#!/bin/bash
set -e

# ==========================================
# 💎 Kashboard Installer
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
REPO="codigosh/Kashboard"
INSTALL_DIR="/opt/kashboard"
BIN_DIR="/usr/local/bin"
BINARY_NAME="kashboard"
DATA_DIR="/var/lib/kashboard"
SERVICE_FILE="/etc/systemd/system/kashboard.service"

# ... (Helper functions omitted for brevity in diff, keeping existing code if possible or rewriting the changed parts)

# Helper for friendly status
function status_msg() {
    echo -e "${BLUE}  • ${NC}$1"
}

function success_msg() {
    echo -e "${GREEN}  ✓ ${NC}$1"
}

# Fetch latest version for banner (Fail gracefully)
LATEST_VERSION=$(curl -s https://api.github.com/repos/codigosh/Kashboard/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$LATEST_VERSION" ]; then
    LATEST_VERSION="latest"
fi

# Banner
clear
echo -e "${BLUE}"
echo "  _  __          _     _                         _ "
echo " | |/ /__ _ ___ | |__ | |__   ___   __ _ _ __ __| |"
echo " | ' // _\` / __|| '_ \| '_ \ / _ \ / _\` | '__/ _\` |"
echo " | . \ (_| \__ \| | | | |_) | (_) | (_| | | | (_| |"
echo " |_|\_\__,_|___/|_| |_|_.__/ \___/ \__,_|_|  \__,_|"
echo "                                              $LATEST_VERSION"
echo -e "${NC}"
echo -e "  Welcome to Kashboard. Let's get you started.\n"

# 1. Check Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${GRAY}  [Info] This script needs admin privileges to set up the service.${NC}"
  echo -e "${RED}  Please run with sudo.${NC}"
  exit 1
fi

# 2. Configuration
PORT="8080"
IS_UPDATE=false

if [ -f "$SERVICE_FILE" ]; then
    # Start detection
    DETECTED_PORT=$(grep 'Environment="PORT=' "$SERVICE_FILE" | cut -d'=' -f3 | tr -d '"')
    
    if [ -n "$DETECTED_PORT" ]; then
        PORT="$DETECTED_PORT"
        IS_UPDATE=true
        status_msg "Existing installation found. Updating version on port ${BOLD}${PORT}${NC}..."
    fi
fi

if [ "$IS_UPDATE" = false ]; then
    if [ -c /dev/tty ]; then
        echo -n "  Desired Port [8080]: "
        read -r INPUT_PORT < /dev/tty
        if [[ -n "$INPUT_PORT" ]]; then
            PORT="$INPUT_PORT"
        fi
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
if ! id "kashboard" &>/dev/null; then
    useradd -r -s /bin/false kashboard
fi

# Create Directories
mkdir -p "$DATA_DIR"
mkdir -p "$INSTALL_DIR"

# Set Permissions (CRITICAL FOR SELF-UPDATE)
chown -R kashboard:kashboard "$DATA_DIR"
chown -R kashboard:kashboard "$INSTALL_DIR"
chmod 750 "$DATA_DIR"
chmod 755 "$INSTALL_DIR"

status_msg "Downloading latest version..."
URL="https://github.com/codigosh/Kashboard/releases/latest/download/kashboard-linux-$ARCH_TAG.tar.gz"

# Silent curl, fail fast
if curl -fL -s -o kashboard.tar.gz "$URL"; then
    tar -xzf kashboard.tar.gz
    rm kashboard.tar.gz
    
    if [ -f "kashboard" ]; then
        chmod +x kashboard
        # Move to /opt (Owned by kashboard)
        mv kashboard "$INSTALL_DIR/$BINARY_NAME"
        chown kashboard:kashboard "$INSTALL_DIR/$BINARY_NAME"
        
        # Symlink for convenience (CLI)
        ln -sf "$INSTALL_DIR/$BINARY_NAME" "$BIN_DIR/$BINARY_NAME"
    else
        echo -e "${RED}  Installation failed (binary missing). check logs.${NC}"
        rm -f kashboard
        exit 1
    fi
else
    echo -e "${RED}  Download failed.${NC}"
    echo -e "${GRAY}  Please check your internet connection or if the release exists.${NC}"
    rm -f kashboard.tar.gz
    exit 1
fi

status_msg "Configuring system service..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Kashboard Dashboard Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=kashboard
Group=kashboard
WorkingDirectory=$DATA_DIR
ExecStart=$INSTALL_DIR/$BINARY_NAME
Restart=always
RestartSec=5
Environment="PORT=$PORT"
Environment="GIN_MODE=release"
Environment="DB_FILE=$DATA_DIR/dashboard.db"

# Security Hardening
ProtectSystem=full
# PrivateTmp=true (Disabled to allow updates in /tmp)
PrivateTmp=false
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload &>/dev/null
systemctl enable kashboard &>/dev/null
systemctl restart kashboard &>/dev/null

# Verification
sleep 2
if systemctl is-active --quiet kashboard; then
    IP=$(hostname -I | awk '{print $1}')
    echo ""
    success_msg "Installation complete!"
    echo -e ""
    echo -e "  🚀 Open your dashboard at: ${BLUE}${BOLD}http://$IP:$PORT${NC}"
    echo -e ""
else
    echo -e "${RED}  Service failed to start.${NC}"
    exit 1
fi
