# Updating

Lastboard makes updates as painless as possible. We offer multiple ways to keep your installation current.

## Web Updater

The easiest way to update is directly from the Lastboard web interface. Installing an update is restricted to the **administrator** — the single account created by the Setup Wizard. Members can use Lastboard normally but never see the update controls.

1. Open **Settings** and go to **About**.
2. Click **Check for Updates**. It asks the release server again, so the answer is always fresh (the dot in the top bar and the panel reuse one answer for ten minutes). If an update is available, **Update** opens the update window.
3. Confirm there, and the window follows the process step by step — download, signature,
   integrity, extract, install, restart — turning each step green as the server completes it.
   If a step fails, it turns red with the reason and the remaining ones are left untouched.

The window stays in charge until the end: it cannot be dismissed once the install starts, and
the page reloads by itself as soon as the new version answers. You can close the settings panel
behind it without interrupting anything.

> **💡 Tip:** Turn on the **Beta channel** under **Settings → About** to receive the latest pre-release versions. It is a setting of your account, so it has to be on for the account you check with. Only the newest beta is kept in the repository: when a newer one comes out, the previous one is removed, and you are offered the newest.

> **Just published, and nothing shows up?** A release's page appears about ten minutes after its tag is pushed, while its files are built. A check made before then — by the top bar or by anyone else on your server — finds the previous version and keeps that answer for ten minutes. Press **Check for Updates** again a little later. An installed app that was open before you updated keeps running the old interface until you close it fully and open it again.

> **No Update button?** An installation that cannot replace its own program — one made from a container image, or one running as a non-root user (`PUID`/`PGID`) — is updated from outside. Lastboard checks whether it may write where its binary is, so it does not need to know what runs it: **About** says when there is a newer version and that the image is what to update, without offering a button that would fail halfway. See **From a container image (OCI)** below.

## Manual Update

### From a container image (OCI)
Update the image and recreate the container from it. The data lives in `/var/lib/lastboard`, which the image declares as a volume, so it is kept.

With Docker Compose:
```bash
docker compose pull
docker compose up -d
```

With Podman, pull the image and recreate the container the same way you created it.

On Proxmox VE, an OCI image runs as an LXC container. Proxmox has no step that swaps the image of an existing container, so it is recreated from the new image; the database survives only if `/var/lib/lastboard` is on its own mount point. Tools that manage OCI applications on Proxmox, such as ProxMenux, do this for you: they rebuild the container from the new image and keep its data.

### Native Installation
Run the native installation script again. It detects your existing installation and updates the binary while preserving your configuration.
```bash
curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash
```

It tells you which version you have and which it is about to install. If you already have the latest one it says so and changes nothing. To install it again anyway — to repair a damaged binary, or to answer the proxy question differently — add `--reinstall`:
```bash
curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash -s -- --reinstall
```

## What Happens During an Update?

When updating from the web interface:
1. The new release binary is downloaded from Forgejo.
2. Its checksum is verified against the line of the release's `checksums.txt` that names that archive, and a download over the size limit is refused.
3. When release signing is enabled, `checksums.txt` must carry a valid
   signature (`checksums.txt.sig`) — a missing or invalid signature aborts the
   update, so a tampered mirror cannot serve a forged binary.
4. The new binary is run once on your server, to ask its version, before anything is touched.
   One that cannot run there — built for another processor, or damaged — stops the update.
5. The database is copied beside itself, as `lastboard.db.backup-<date>-<time>`, and the copy is
   opened and checked, and only the account the server runs as can read it. If it cannot be
   copied (most often, a full disk) the update stops. The three newest copies are kept, counting
   the ones the install script takes.
6. The current binary is kept beside the new one as `lastboard.old`, and the new one takes its
   place in a single step.
7. The server restarts into the new version **without closing its port**: a request that arrives
   meanwhile waits a moment and is answered by the new version, so a reverse proxy or tunnel in
   front never sees the server down. Open pages reconnect by themselves.

If any step before the last fails, the update window shows which one and why, and says that
nothing was changed: the version you had is still installed and still running. Only one update
runs at a time, and each one works in a directory of its own that is removed afterwards.

Updating with the install script also copies the database first (see
[Installation](installation.md#running-it-again)); with Docker, the new image replaces the
container.

See [Release Signing](../security/release-signing.md) for how the signature is produced and verified.
