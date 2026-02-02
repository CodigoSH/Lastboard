#!/bin/bash
set -e

# Kiwilab / Kashboard Installer
# Compatible with Systemd based distributions (Debian, Ubuntu, CentOS, etc.)

REPO="codigosh/Kashboard"
BINARY_NAME="kashboard"
INSTALL_DIR="/usr/local/bin"
DATA_DIR="/var/lib/kashboard"
SERVICE_FILE="/etc/systemd/system/kashboard.service"

# Detect Architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        ARCH_TAG="amd64"
        ;;
    aarch64|arm64)
        ARCH_TAG="arm64"
        ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

echo "🚀 Installing Kashboard ($ARCH_TAG)..."

# Download Binary
URL="https://github.com/codigosh/Kashboard/releases/latest/download/kashboard-linux-$ARCH_TAG"

if [ -t 0 ]; then
    read -p "Did you download the binary manually? If not, we will try to download from placeholder. (y/n) " MANUAL
else
    # If not running interactively (e.g. piped), assume automatic download (Not Manual)
    MANUAL="n"
    # Try to read from tty if available for critical prompts, otherwise rely on defaults or args if we were to expand this script
    if [ -c /dev/tty ]; then
        read -p "Did you download the binary manually? If not, we will default to 'n'. (y/n) " MANUAL < /dev/tty
    fi
fi

if [ "$MANUAL" != "y" ]; then
    echo "⬇️  Downloading Kashboard..."
    curl -L -o kashboard $URL
    chmod +x kashboard
    mv kashboard $INSTALL_DIR/$BINARY_NAME
else
    if [ ! -f "./kashboard" ]; then
        echo "Error: ./kashboard binary not found in current directory."
        exit 1
    fi
    chmod +x kashboard
    cp kashboard $INSTALL_DIR/$BINARY_NAME
fi

# Create User and Data Directory
if ! id "kashboard" &>/dev/null; then
    useradd -r -s /bin/false kashboard
fi

mkdir -p $DATA_DIR
chown kashboard:kashboard $DATA_DIR
chmod 750 $DATA_DIR

# Initial Configuration
# Try to obtain port from TTY if possible
if [ -c /dev/tty ]; then
    read -p "Enter port for Kashboard [8080]: " PORT < /dev/tty
else
    PORT="8080"
fi
PORT=${PORT:-8080}

echo "Configuring service on port $PORT..."

# Create Systemd Service
cat > $SERVICE_FILE <<EOF
[Unit]
Description=Kashboard Dashboard Service
After=network.target

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

[Install]
WantedBy=multi-user.target
EOF

# Reload and Start
systemctl daemon-reload
systemctl enable kashboard
systemctl start kashboard

echo "✅ Kashboard installed successfully!"
echo "   Access it at http://$(hostname -I | awk '{print $1}'):$PORT"
echo "   Service status: systemctl status kashboard"
