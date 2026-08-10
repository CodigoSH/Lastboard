# Updating

Lastboard makes updates as painless as possible. We offer multiple ways to keep your installation current.

## Web Updater

The easiest way to update is directly from the Lastboard web interface. Installing an update is restricted to the **administrator** — the single account created by the Setup Wizard. Members can use Lastboard normally but never see the update controls.

1. Open **Settings** and go to **About**.
2. Click **Check for Updates**. If an update is available, **Update** opens the update window.
4. Confirm there, and the window follows the process step by step — download, signature,
   integrity, extract, install, restart — turning each step green as the server completes it.
   If a step fails, it turns red with the reason and the remaining ones are left untouched.

The window stays in charge until the end: it cannot be dismissed once the install starts, and
the page reloads by itself as soon as the new version answers. You can close the settings panel
behind it without interrupting anything.

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
4. The existing `lastboard` binary is replaced. If that fails, the previous binary is put back
   and the update window says so.
5. The systemd service (or container process) automatically restarts.

See [Release Signing](../security/release-signing.md) for how the signature is produced and verified.
