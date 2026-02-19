<div align="center">
  <br />
  <img src="web/public/images/logo.png" alt="Lastboard" width="90" />
  <br /><br />

  <h1>Lastboard</h1>
  <p><strong>The personal dashboard you actually want to open every day.</strong></p>

  <p>
    <a href="https://lb-demo.codigosh.com">
      <img src="https://img.shields.io/badge/Live_Demo-FF4B4B?style=for-the-badge&logo=google-chrome&logoColor=white" />
    </a>
    &nbsp;
    <img src="https://img.shields.io/github/v/release/CodigoSH/Lastboard?style=for-the-badge&label=Latest&color=blue" />
    &nbsp;
    <img src="https://img.shields.io/github/downloads/codigosh/lastboard/total?style=for-the-badge&label=Installations&color=3178C6" />
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
- **Peace of mind** - Backup and restore directly from the website.
- **Single SQLite file** — your entire dashboard state in one portable file. Backup = `cp lastboard.db`.
- **Guided setup wizard** — first run walks you through everything. Zero config files to touch.

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

#### Data & Backups

All state is stored in a single SQLite database file for simplicity and portability.

*   **Internal Location (Docker):** `/var/lib/lastboard/lastboard.db`
*   **Backup:** Simply copy this file to a safe location.
*   **Restore:** Stop the instance, replace the file, and restart.

> [!IMPORTANT]
> Ensure the application is stopped before replacing the database file to prevent corruption.

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
   go build -o lastboard ./cmd/dashboard
   ```

4. **Run**
   ```bash
   ./lastboard
   ```
   Open `http://localhost:8080` in your browser to start the Setup Wizard.

---

## Updates & Security
Lastboard uses a dedicated proxy (`api-updates.codigosh.com`) to manage version checks. 
This ensures:
* **Reliability:** Bypassing GitHub's rate limits for a smoother experience.
* **Privacy:** No user data is tracked or stored during the update process.
* **Integrity:** Secure delivery of official releases.

For more technical details on our infrastructure transparency, see our [SECURITY.md](./SECURITY.md).

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
- **Design Inspiration**: Homarr Dashboard (Apache 2.0 - https://github.com/homarr-labs/homarr)

---

<div align="center">
  <sub>Built with ❤️ by the CodigoSH Team</sub>
</div>

