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
| `PUID` | `0` | User id to run as. When non-zero (and started as root) the app chowns the data dir and drops privileges to it. |
| `PGID` | `0` | Group id to run as. Used together with `PUID`. |

> **Note:** `SESSION_SECRET` is automatically generated and securely stored in the database on first run.

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

## Dashboard Settings & Customization

Lastboard offers a wide range of settings to personalize your experience and manage the system. These are accessible via the **Settings** icon in the top navigation bar.

### Account
Manage your personal profile and security.
- **Avatar**: Upload a custom profile picture. Supported formats: PNG, JPG, WebP.
- **Change Password**: Update your login credentials. We recommend using a strong, unique password.

### Dashboard & Appearance
Tailor the look and feel of your personal dashboard.
- **Dashboard Background**: 
  - **Custom Image**: Upload any image to use as your dashboard background.
  - **Auto-Optimization**: Images are automatically resized to 1080p for faster load times.
  - **Cover Logic**: The background uses "Cover" logic, ensuring it fills the screen without stretching or distortion.
- **Interface Language**: Choose from **20 supported languages**, including English, Spanish, German, French, Chinese, and more.
- **Theme Mode**: Toggle between **Light** and **Dark** modes to suit your preference.
- **Project Name & Logo**: Customize the title and logo displayed in the browser tab and top bar. Both are configured from a single settings row.
- **Global Unit System**: Select between **Metric** (°C, km/h) and **Imperial** (°F, mph). This setting automatically updates all compatible widgets (Weather, Telemetry, etc.).
- **Grid Density**: Use the slider to adjust the number of columns in your dashboard grid (from 3 to 16), allowing for tighter or more spacious layouts.

### Multi-Dashboard
Lastboard supports multiple independent dashboards per user. Each dashboard has its own layout, widgets, and background.
- **Create**: Use the dashboard switcher in the top bar to add a new dashboard.
- **Switch**: Click any dashboard in the switcher to navigate to it instantly.
- **Rename**: Rename dashboards at any time from the switcher menu.
- **Delete**: Remove a dashboard and all its contents from the switcher menu.

### User Management (Admin Only)
Administrators can manage access to the Lastboard instance.
- **Add/Edit Users**: Create new accounts or modify existing ones.
- **Roles**: Two roles exist — **Admin** (the instance owner, full control) and **User** (standard access).
- **Delete Users**: Remove access for specific accounts.

### System & Maintenance
Tools for keeping your Lastboard instance healthy and up to date.
- **Data Backup & Restore**:
  - **Export**: Download your entire dashboard configuration as a portable `.json` file.
  - **Import**: Restore a previous setup from a backup file. *Warning: This overwrites current data.*
- **System Updates**:
  - **Check for Updates**: Manually trigger a version check against the official [Forgejo repository](https://git.codigosh.com/CodigoSH/Lastboard).
  - **Docker Mode**: If running via Docker, instructions are provided to pull the latest image from `git.codigosh.com`.
  - **Native Update**: For Linux installs, updates can be applied directly from the UI — the binary is downloaded from Forgejo and verified by checksum before replacing the current installation.
- **Beta Updates**: Toggle this setting to participate in the beta testing program and receive early access to new features.
- **Factory Reset**: A safe-guarded option to wipe all data and return the instance to its original state (Setup Wizard).

## Data Persistence
All state—including users, dashboard layouts, preferences, and system settings—is stored in a single SQLite database file (`lastboard.db`) located in your defined data directory.

---
[← Previous page](installation.md) | [Next page →](updating.md)
