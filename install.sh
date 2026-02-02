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
REPO="codigosh/Kashboard"
BINARY_NAME="kashboard"
INSTALL_DIR="/usr/local/bin"
DATA_DIR="/var/lib/kashboard"
SERVICE_FILE="/etc/systemd/system/kashboard.service"

# Helper for friendly status
function status_msg() {
    echo -e "${BLUE}  • ${NC}$1"
}

function success_msg() {
    echo -e "${GREEN}  ✓ ${NC}$1"
}

# Banner
clear
echo -e "${BLUE}"
echo "   __ __           _   _                    _ "
echo "  / //_/ __ _  ___| |_| |__   ___  __ _ _ _(_)"
echo " / ,<   / _\` |/ __| '_| '_ \ / _ \/ _\` | '_| |"
echo " \_\_\ \__,_|\__ \_|_| |_.__|\___/\__,_|_| |_|"
echo "                                              "
echo -e "${NC}"
echo -e "  Welcome to Kashboard. Let's get you started.\n"

# 1. Check Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${GRAY}  [Info] This script needs admin privileges to set up the service.${NC}"
  echo -e "${RED}  Please run with sudo.${NC}"
  exit 1
fi

# 2. Configuration (The only question)
PORT="8080"
if [ -c /dev/tty ]; then
    echo -n "  Desired Port [8080]: "
    read -r INPUT_PORT < /dev/tty
    if [[ -n "$INPUT_PORT" ]]; then
        PORT="$INPUT_PORT"
    fi
fi
echo "" # Spacer

# 3. Installation Process (Simplified UI)
status_msg "Checking system compatibility..."
ARCH=$(uname -m)
case $ARCH in
    x86_64) ARCH_TAG="amd64" ;;
    aarch64|arm64) ARCH_TAG="arm64" ;;
    *) echo -e "${RED}  Sorry, your architecture ($ARCH) is not supported yet.${NC}"; exit 1 ;;
esac

status_msg "Preparing environment..."
if ! id "kashboard" &>/dev/null; then
    useradd -r -s /bin/false kashboard
fi
mkdir -p "$DATA_DIR"
chown -R kashboard:kashboard "$DATA_DIR"
chmod 750 "$DATA_DIR"

status_msg "Downloading latest version..."
URL="https://github.com/codigosh/Kashboard/releases/latest/download/kashboard-linux-$ARCH_TAG.tar.gz"

# Silent curl, fail fast
if curl -fL -s -o kashboard.tar.gz "$URL"; then
    tar -xzf kashboard.tar.gz
    rm kashboard.tar.gz
    
    if [ -f "kashboard" ]; then
        chmod +x kashboard
        mv kashboard "$INSTALL_DIR/$BINARY_NAME"
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
PrivateTmp=true
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
