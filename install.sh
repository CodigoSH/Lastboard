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

# Download Binary (Placeholder URL as requested, usually from GitHub Releases)
# In a real scenario: URL="https://github.com/$REPO/releases/latest/download/kashboard-linux-$ARCH_TAG"
URL="https://example.com/placeholder-url/kashboard-linux-$ARCH_TAG"

echo "Please verify this is a fresh install. This script assumes no existing data."
read -p "Did you download the binary manually? If not, we will try to download from placeholder. (y/n) " MANUAL

if [ "$MANUAL" != "y" ]; then
    echo "This is a placeholder installer. In production, uncomment the download line."
    # curl -L -o kashboard $URL
    # For now, we assume the binary is present or this is a template script.
    echo "⚠️  Download skipped (Placeholder Mode). Please place 'kashboard' binary in current folder."
    if [ ! -f "./kashboard" ]; then
        echo "Error: ./kashboard binary not found."
        exit 1
    fi
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
read -p "Enter port for Kashboard [8080]: " PORT
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
