#!/bin/bash
set -e

# ==========================================
# 🎨 Kashboard Installer
# Professional Deployment Script
# ==========================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
REPO="codigosh/Kashboard"
BINARY_NAME="kashboard"
INSTALL_DIR="/usr/local/bin"
DATA_DIR="/var/lib/kashboard"
SERVICE_FILE="/etc/systemd/system/kashboard.service"

# Banner
clear
echo -e "${CYAN}"
echo "██╗  ██╗ █████╗ ███████╗██╗  ██╗██████╗  ██████╗  █████╗ ██████╗ ██████╗ "
echo "██║ ██╔╝██╔══██╗██╔════╝██║  ██║██╔══██╗██╔═══██╗██╔══██╗██╔══██╗██╔══██╗"
echo "█████╔╝ ███████║███████╗███████║██████╔╝██║   ██║███████║██████╔╝██║  ██║"
echo "██╔═██╗ ██╔══██║╚════██║██╔══██║██╔══██╗██║   ██║██╔══██║██╔══██╗██║  ██║"
echo "██║  ██╗██║  ██║███████║██║  ██║██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝"
echo "╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ "
echo -e "${NC}"
echo -e "${BLUE}${BOLD}>>> Kashboard Deployment Installer${NC}"
echo -e "${BLUE}>>> Systemd | Linux | Native Performance${NC}\n"

# 1. Check Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root (sudo).${NC}"
  exit 1
fi

# 2. Detect Architecture
echo -e "${CYAN}[1/6] Detecting System Architecture...${NC}"
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        ARCH_TAG="amd64"
        ;;
    aarch64|arm64)
        ARCH_TAG="arm64"
        ;;
    *)
        echo -e "${RED}[ERROR] Unsupported architecture: $ARCH${NC}"
        exit 1
        ;;
esac
echo -e "${GREEN}✓ Detected: $ARCH ($ARCH_TAG)${NC}"

# 3. Configure Port (Interactive or Default)
echo -e "${CYAN}[2/6] Configuration...${NC}"
PORT="8080"

# Check if running interactively or via pipe
if [ -c /dev/tty ]; then
    echo -n "Select Port for Kashboard [default: 8080]: "
    read -r INPUT_PORT < /dev/tty
    if [[ -n "$INPUT_PORT" ]]; then
        PORT="$INPUT_PORT"
    fi
else
    echo -e "${YELLOW}! Non-interactive mode detected. Using default port: $PORT${NC}"
fi
echo -e "${GREEN}✓ Port selected: $PORT${NC}"

# 4. Prepare Environment
echo -e "${CYAN}[3/6] Setting up Environment...${NC}"

# Create User
if ! id "kashboard" &>/dev/null; then
    useradd -r -s /bin/false kashboard
    echo -e "  > Created user 'kashboard'"
else
    echo -e "  > User 'kashboard' already exists"
fi

# Create Directories
mkdir -p "$DATA_DIR"
chown -R kashboard:kashboard "$DATA_DIR"
chmod 750 "$DATA_DIR"
echo -e "${GREEN}✓ Environment ready${NC}"

# 5. Download Binary
echo -e "${CYAN}[4/6] Downloading Kashboard Binary...${NC}"
URL="https://github.com/codigosh/Kashboard/releases/latest/download/kashboard-linux-$ARCH_TAG"

echo -e "  > Fetching: $URL"
# Use -f to fail on 404/server errors
if curl -fL -o kashboard "$URL"; then
    chmod +x kashboard
    mv kashboard "$INSTALL_DIR/$BINARY_NAME"
    echo -e "${GREEN}✓ Download successful${NC}"
else
    echo -e "${RED}[ERROR] Download failed!${NC}"
    echo -e "${YELLOW}Possible reasons:${NC}"
    echo -e "  1. The release for '$ARCH_TAG' does not exist yet on GitHub."
    echo -e "  2. Network connectivity issues."
    echo -e "  3. Invalid URL: $URL"
    rm -f kashboard
    exit 1
fi

# 6. Install Service
echo -e "${CYAN}[5/6] Creating Systemd Service...${NC}"

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

echo -e "${GREEN}✓ Service defined at $SERVICE_FILE${NC}"

# 7. Start Service
echo -e "${CYAN}[6/6] Starting Kashboard...${NC}"
systemctl daemon-reload
systemctl enable kashboard
systemctl restart kashboard

# Verification
sleep 2
if systemctl is-active --quiet kashboard; then
    IP=$(hostname -I | awk '{print $1}')
    echo -e "\n${GREEN}${BOLD}🎉 Installation Complete!${NC}"
    echo -e "-----------------------------------------------------"
    echo -e "🌍 Dashboard URL:   ${CYAN}http://$IP:$PORT${NC}"
    echo -e "📊 Service Status:  ${CYAN}systemctl status kashboard${NC}"
    echo -e "📝 Logs:            ${CYAN}journalctl -u kashboard -f${NC}"
    echo -e "-----------------------------------------------------"
else
    echo -e "\n${RED}[ERROR] Service failed to start.${NC}"
    echo -e "please check logs with: ${YELLOW}journalctl -u kashboard -n 50${NC}"
    exit 1
fi
