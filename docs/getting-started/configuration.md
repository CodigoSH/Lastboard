# Configuration

Lastboard is designed to work out-of-the-box, but you can customize its behavior using environment variables.

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | The port the HTTP server listens on. |
| `DB_FILE` | `./lastboard.db` | Path to the SQLite database. In Docker, this defaults to `/var/lib/lastboard/lastboard.db`. |
| `TZ` | `UTC` | Timezone for the application (e.g., `America/New_York`). |
| `LOG_FORMAT` | `text` | Log output format. Use `json` for structured logging. |
| `DEMO_ONLY` | `false` | Set to `true` to run purely in a frontend-only demo mode (no auth, no persistence). |
| `TRUST_PROXY` | `false` | Enable reading the real client IP from `X-Forwarded-For`. Set to `true` if behind a proxy. |
| `MAX_ITEMS_PER_USER` | `500` | Maximum number of dashboard items a single user can create. Enforced by the backend API. |
| `DATA_DIR` | `/var/lib/lastboard` | The directory where Lastboard installs persistent files in a native Linux setup. |

> **📝 Note:** `SESSION_SECRET` is automatically generated and securely stored in the database on first run.

## TRUST_PROXY

By default, Lastboard ignores the `X-Forwarded-For` header to prevent IP spoofing attacks. If you run Lastboard behind a reverse proxy (such as Nginx, Traefik, Caddy, Cloudflare, Coolify, or Pangolin), you **must** enable this flag.

```bash
TRUST_PROXY=true
```

> **⚠️ Warning:** Without this flag enabled behind a proxy, all users will share the same IP for rate limiting and login lockout purposes, which may cause false 429 errors. **Do not enable this flag** if Lastboard is exposed directly to the internet.

## Data Persistence

All state—including users, dashboard layouts, preferences, and system settings—is stored in a single SQLite database file for simplicity and portability.

For Docker users, this is stored at `/var/lib/lastboard/lastboard.db` and should be mapped via a volume. For native installs, it defaults to `/var/lib/lastboard/lastboard.db`.

### Backup Recommendations
To backup your entire dashboard, simply copy the `lastboard.db` file to a secure location. 

> **💡 Tip:** Ensure the application is stopped before replacing the database file during a restore to prevent file corruption.

---
[← Previous page](installation.md) | [Next page →](updating.md)
