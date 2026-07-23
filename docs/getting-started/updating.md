# Updating

Lastboard makes updates as painless as possible. We offer multiple ways to keep your installation current.

## Web Updater

The easiest way to update is directly from the Lastboard web interface. This feature is restricted to admin users only.

1. Navigate to **System settings**.
2. Go to the **Updates** section.
3. Click **Check for updates**. If an update is available, you can apply it with a single click.

> **💡 Tip:** You can opt-in to Beta updates in your user preferences to receive the latest pre-release versions.

> **Running unprivileged?** If you run Lastboard as a non-root user (by setting `PUID`/`PGID`), the in-app web updater is unavailable — the process cannot replace its own binary. Use the **Manual Update** steps below instead (`docker compose pull` for Docker, or re-running the install script for native installs).

## Manual Update

### Docker Installation
If you installed Lastboard using Docker Compose, pull the latest image and recreate the container:
```bash
docker compose pull
docker compose up -d
```

### Native Installation
Run the native installation script again. It detects your existing installation and updates the binary while preserving your configuration.
```bash
curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash
```

## What Happens During an Update?

When updating natively or via the web interface:
1. The new release binary is downloaded from Forgejo.
2. Its checksum is verified against the release's `checksums.txt`.
3. When release signing is enabled, `checksums.txt` must carry a valid
   signature (`checksums.txt.sig`) — a missing or invalid signature aborts the
   update, so a tampered mirror cannot serve a forged binary.
4. The existing `lastboard` binary is replaced.
5. The systemd service (or container process) automatically restarts.

See [Release Signing](../security/release-signing.md) for how the signature is produced and verified.
