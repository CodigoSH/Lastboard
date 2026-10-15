# Configuration

Lastboard is designed to work out-of-the-box, but you can customize its behavior using environment variables.

> Looking for the in-app settings (theme, language, monitoring, backups)? Those are covered in **[Preferences](../using/preferences.md)**. This page is about deployment and environment configuration.

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | The port the HTTP server listens on. |
| `DB_FILE` | `./lastboard.db` | Path to the SQLite database. In Docker, this defaults to `/var/lib/lastboard/lastboard.db`. |
| `TZ` | `UTC` | Timezone for the application (e.g., `America/New_York`). |
| `LOG_FORMAT` | `text` | Log output format. Use `json` for structured logging. |
| `DEMO_ONLY` | `false` | Set to `true` to run purely in a frontend-only demo mode (no auth, no persistence). Responses also carry `X-Robots-Tag: noindex, nofollow`, so a public demo stays out of search results. |
| `TRUST_PROXY` | `false` | Enable reading the real client IP from `X-Forwarded-For`. Set to `true` if behind a proxy. |
| `TRUST_PROXY_HOPS` | `1` | How many proxies sit in front of Lastboard. Only change it if a request passes through more than one before reaching the app. |
| `MAX_ITEMS_PER_USER` | `500` | Maximum number of dashboard items a single user can create. Enforced by the backend API. |
| `PUID` | `0` | User id to run as. When non-zero (and started as root) the app chowns the data dir and drops privileges to it. |
| `PGID` | `0` | Group id to run as. Used together with `PUID`. |

> **Note:** `SESSION_SECRET` is automatically generated and securely stored in the database on first run.

> **Native installs:** the install script keeps everything under `/var/lib/lastboard` and points `DB_FILE` at `/var/lib/lastboard/lastboard.db`. This is a convention of `install.sh`, not an environment variable the binary reads — to move the data, set `DB_FILE`.

> **Upgrades copy the database first.** Before it swaps the binary, `install.sh` stops the service and leaves a copy beside it as `lastboard.db.backup-YYYYMMDD-HHMMSS`, so a migration that goes wrong is recoverable. The three most recent copies are kept and older ones removed. Running the installer when you already have the latest version changes nothing and takes no copy; `--reinstall` forces it. To restore one, stop the service, move the copy over `lastboard.db`, and start it again.

## PUID / PGID (running unprivileged)

By default Lastboard runs as `root` (`PUID=0`). This is the safest default for **Proxmox/LXC** setups, where bind-mount ownership often makes a non-root container unable to write its database.

To run the container as a non-root user, set `PUID`/`PGID` to your host user's id and group (find them with `id`):

```yaml
environment:
  - PUID=1000
  - PGID=1000
```

On startup the binary will `chown` the data directory to that user and then permanently drop to it — so you get an unprivileged process **and** correct file permissions, without manual `chown` on the host. If you ever hit "database directory is not writable", revert to the default (remove `PUID`/`PGID`).

## TRUST_PROXY

By default, Lastboard ignores the `X-Forwarded-For` header to prevent IP spoofing attacks. If you run Lastboard behind a reverse proxy (such as Nginx, Traefik, Caddy, Cloudflare, or Pangolin), you **must** enable this flag.

```bash
TRUST_PROXY=true
```

> **Warning:** Without this flag enabled behind a proxy, all users will share the same IP for rate limiting and login lockout purposes, which may cause false 429 errors. **Do not enable this flag** if Lastboard is exposed directly to the internet.

### More than one proxy

A proxy does not replace `X-Forwarded-For`, it appends to it. With one proxy in
front the last entry is the one it added, and that is the address Lastboard
uses; anything before it was sent by the caller and cannot be trusted.

If requests reach Lastboard through **two or more** proxies (for example
Cloudflare in front of your own reverse proxy), say so, or the address counted
will be your own proxy's rather than the visitor's:

```bash
TRUST_PROXY=true
TRUST_PROXY_HOPS=2
```

Count only the proxies that add to the header. If the number is higher than the
chain really is, Lastboard falls back to the address of whatever connected to
it, which is the safe choice, but every visitor shares one rate-limit bucket
again.

## Data Persistence

All state — including users, dashboard layouts, preferences, and system settings — is stored in a single SQLite database file (`lastboard.db`) located in your defined data directory. Back it up (or the whole instance) from **Settings → Data**; see **[Import, Export & Backup](../using/import-export.md)**.
