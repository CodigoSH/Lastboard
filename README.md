<div align="center">
  <br />
  <img src="web/public/images/logo.png" alt="Lastboard" width="150" />
  <br /><br />

  <h1>Lastboard</h1>
  <p><strong>The personal dashboard you actually want to open every day.</strong></p>

  <p>
    <a href="https://lb-demo.codigosh.com">
      <img src="https://img.shields.io/badge/Live_Demo-FF4B4B?style=for-the-badge&logo=google-chrome&logoColor=white" />
    </a>
    &nbsp;
    <img src="https://img.shields.io/badge/dynamic/json?url=https://api-updates.codigosh.com/api/v1/stats&query=%24.version&label=Latest&style=for-the-badge&color=blue" />
    &nbsp;
    <img src="https://img.shields.io/badge/dynamic/json?url=https://api-updates.codigosh.com/api/v1/stats&query=%24.downloads&label=Installations&style=for-the-badge&color=3178C6" />
    &nbsp;
    <img src="https://img.shields.io/badge/License-Apache_2.0-green?style=for-the-badge" />
  </p>

  <br />

  <img src="web/public/images/screenshot.png" alt="Lastboard Dashboard" width="92%" style="border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);" />

  <br /><br />

</div>

---

<div align="center">

![](https://img.shields.io/badge/🚀_One--line_deploy-1a1a2e?style=for-the-badge)
![](https://img.shields.io/badge/⚡_60fps_native_grid-1a1a2e?style=for-the-badge)
![](https://img.shields.io/badge/🎨_Glassmorphism_UI-1a1a2e?style=for-the-badge)
![](https://img.shields.io/badge/🔒_100%25_self--hosted-1a1a2e?style=for-the-badge)
![](https://img.shields.io/badge/💾_SQLite,_no_DB_setup-1a1a2e?style=for-the-badge)

</div>

---

## Why Lastboard

Most self-hosted dashboards are either too heavy, too ugly, or too complex to maintain. Lastboard was built with a simple rule: **nothing ships unless it's fast and looks good doing it.**

- **Built-in drag & drop grid** — written from scratch in native JS. No framework overhead, silky smooth on any device.
- **Real dark/light mode** — dedicated color token sets per theme, not just a CSS filter.
- **Go backend** — small memory footprint, concurrent by default. Runs fine on a Raspberry Pi.
- **Peace of mind** — Backup and restore directly from the website.
- **Single SQLite file** — your entire dashboard state in one portable file. Backup = `cp lastboard.db`.
- **Guided setup wizard** — first run walks you through everything. Zero config files to touch.
- **Multi-user support** — per-user dashboards, preferences, and password management.
- **Real-time telemetry** — server stats (CPU, RAM, disk) streamed over WebSocket.

---

## Security & Widgets

### Security

Lastboard is built with defense-in-depth throughout the stack.

- **HTTP Security Headers** — CSP (enforced), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` on every response.
- **HSTS** — `Strict-Transport-Security` (1 year + preload) applied automatically on HTTPS connections.
- **CSRF Protection** — all state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a matching `csrf_token` cookie and `X-CSRF-Token` header (`403` on mismatch).
- **Session Tokens** — HMAC-SHA256 signed with expiry, generated from a 32-byte cryptographic secret; constant-time verification prevents timing attacks.
- **Rate Limiting** — token-bucket limiter (20 req/s, burst 50) on all protected routes, with automatic cleanup of stale IP entries.
- **Setup Lock** — `/setup` is hard-blocked once any user exists, preventing re-initialization.

> **Reverse proxy users — `TRUST_PROXY` flag:** By default, Lastboard ignores the `X-Forwarded-For` header to prevent IP spoofing. If you run Lastboard behind a reverse proxy (nginx, Traefik, Caddy, Cloudflare, Coolify, Pangolin...), you **must** enable proxy trust so that rate limiting and login lockout work against the real client IP instead of the proxy IP.
>
> Set the environment variable:
> ```
> TRUST_PROXY=true
> ```
> **Without this flag**, all users behind the proxy will share the same IP for rate limiting purposes, which may cause false 429 errors under load.
>
> **Do not enable this flag** if Lastboard is exposed directly to the internet without a reverse proxy, as it would allow clients to spoof their IP.

### Widgets (5)

| Widget | Description |
| :--- | :--- |
| **Clock** | Analog/digital clock with configurable timezone and seconds display |
| **Notepad** | Persistent per-user text notepad |
| **Telemetry** | Real-time server metrics (CPU, RAM, disk) via WebSocket |
| **Weather** | Current conditions and forecast via Open-Meteo |
| **Markdown** | Freeform Markdown renderer for notes and links |

---

## Installation Methods

### Quick Start with Docker (Recommended)
The easiest way to get started is using Docker. Images are automatically built and published to GHCR.

**Using Docker Compose:**
```yaml
services:
  lastboard:
    image: ghcr.io/codigosh/lastboard:latest
    container_name: lastboard
    ports:
      - "8080:8080"
    environment:
      - TZ=America/New_York
      # - TRUST_PROXY=true   # Uncomment if running behind a reverse proxy
    volumes:
      - ./data:/var/lib/lastboard
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Using Docker CLI:**
```bash
docker run -d \
  --name lastboard \
  -p 8080:8080 \
  -e TZ=America/New_York \
  # -e TRUST_PROXY=true \   # Uncomment if running behind a reverse proxy
  -v $(pwd)/data:/var/lib/lastboard \
  --restart unless-stopped \
  ghcr.io/codigosh/lastboard:latest
```

#### Advanced Configuration

Lastboard is designed to work out-of-the-box, but you can customize it via environment variables.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | The port the HTTP server listens on. |
| `DB_FILE` | `./lastboard.db` | Path to the SQLite database file. In Docker, it defaults to `/var/lib/lastboard/lastboard.db`. |
| `TZ` | `UTC` | Timezone for the application (e.g., `America/New_York`). |
| `TRUST_PROXY` | `false` | Set to `true` if Lastboard runs behind a reverse proxy (nginx, Traefik, Caddy, Cloudflare). Enables reading the real client IP from `X-Forwarded-For`. **Do not enable if exposed directly.** |
| `MAX_ITEMS_PER_USER` | `500` | Maximum number of dashboard items a single user can create. Increase only if needed. |

#### Data & Backups

All state is stored in a single SQLite database file for simplicity and portability.

*   **Internal Location (Docker):** `/var/lib/lastboard/lastboard.db`
*   **Backup:** Simply copy this file to a safe location.
*   **Restore:** Stop the instance, replace the file, and restart.

> [!IMPORTANT]
> Ensure the application is stopped before replacing the database file to prevent corruption.

> [!WARNING]
> The backup file downloaded from the web interface contains **sensitive data including bcrypt password hashes** for all users. Store it in a secure location and never share it publicly.

> [!NOTE]
> Restoring a backup via the web interface will **log out all active sessions** immediately. All users will need to log in again after a restore. This is intentional behavior to ensure session consistency with the restored data.

---

### Quick Install (Linux)
Run this command to install or update Lastboard automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/CodigoSH/Lastboard/main/install.sh | sudo bash
```

### Manual Installation
If you prefer running the binary directly on your host machine.

#### Build from Source
1. **Clone the repository**
   ```bash
   git clone https://github.com/CodigoSH/Lastboard.git
   cd Lastboard
   ```
   
2. **Build the Frontend**
   ```bash
   bun install
   bun run build
   ```

3. **Build the Binary**
   ```bash
   go build -o lastboard ./cmd/lastboard
   ```

4. **Run**
   ```bash
   ./lastboard
   ```
   Open `http://localhost:8080` in your browser to start the Setup Wizard.

---

## Updates
> [!IMPORTANT]
> Lastboard features a dedicated update system via a secure proxy to **optimize performance** and ensure 24/7 availability, providing a smoother experience than standard API limits allow. 

For more information on our infrastructure and how we protect your privacy, please read our [Security Policy](./SECURITY.md).

---

## Support & Recognition

We are an open-source initiative managed through [Open Collective Europe](https://opencollective.com/codigosh).

### Financial Support
If you find our tools useful, consider supporting our infrastructure through an unconditional donation.

[<img src="https://opencollective.com/codigosh/donate/button@2x.png?color=blue" width="250" />](https://opencollective.com/codigosh)

### Acknowledgments
Special thanks to everyone supporting our mission. 
<a href="https://opencollective.com/codigosh">
  <img src="https://opencollective.com/codigosh/tiers/backer.svg?width=890&button=false" />
</a>

### Organizations
We appreciate the organizations that support us as a gesture of goodwill to help maintain our infrastructure.
<a href="https://opencollective.com/codigosh">
  <img src="https://opencollective.com/codigosh/tiers/sponsor.svg?width=890&button=false" />
</a>

---

## Credits

- **Icons**: 
  - Tabler Icons (MIT License - https://github.com/tabler/tabler-icons)
  - Homarr Labs Dashboard Icons (Apache 2.0 - https://github.com/homarr-labs/dashboard-icons)
  - Selfhst Icons (MIT License - https://github.com/selfhst/icons)
  - Homelab SVG Assets (MIT License - https://github.com/loganmarchione/homelab-svg-assets)
  - Simple Icons (CC0 - https://github.com/simple-icons/simple-icons)
  - Papirus Icon Theme (GPL-3.0 - https://github.com/PapirusDevelopmentTeam/papirus-icon-theme)
- **Design Inspiration**: Homarr Dashboard (Apache 2.0 - https://github.com/homarr-labs/homarr)

---

<div align="center">
  <sub>Built with ❤️ by the CodigoSH Team</sub>
</div>

