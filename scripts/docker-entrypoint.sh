#!/bin/sh
set -e

# Data directory
DATA_DIR="/var/lib/lastboard"

# Detect if we need to adjust UID/GID (supports PUID/PGID like linuxserver.io)
USER_ID=${PUID:-1001}
GROUP_ID=${PGID:-1001}

# Modify codigosh user/group to match host mapping if different
if [ "$(id -u codigosh)" -ne "$USER_ID" ] || [ "$(id -g codigosh)" -ne "$GROUP_ID" ]; then
    echo "Adjusting codigosh UID/GID to $USER_ID:$GROUP_ID..."
    # Alpine-specific user mod commands
    sed -i "s/^codigosh:x:[0-9]*:[0-9]*:/codigosh:x:$USER_ID:$GROUP_ID:/" /etc/passwd
    sed -i "s/^codigosh:x:[0-9]*:/codigosh:x:$GROUP_ID:/" /etc/group
fi

# Ensure data directory exists and is owned by the app user
mkdir -p "$DATA_DIR"
chown -R codigosh:codigosh "$DATA_DIR"

echo "Permissions initialized. Starting Lastboard as codigosh..."

# Run the app as codigosh using su-exec (better signal handling than sudo)
exec su-exec codigosh /app/lastboard "$@"
