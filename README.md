<div align="center">
  <img src="web/public/images/logo.png" alt="Lastboard Logo" width="120" style="margin-bottom: 20px;" />
  <h1>Lastboard</h1>
  
  <p>
    <strong>A sleek, high-performance personal dashboard focused on native speed and premium aesthetics.</strong>
  </p>

  <p>
    <img src="https://img.shields.io/github/v/release/CodigoSH/Lastboard?style=for-the-badge&label=Latest&color=blue" alt="Latest Release" />
    <img src="https://img.shields.io/badge/Docker-Available-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/Go-1.23+-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go Version" />
    <img src="https://img.shields.io/badge/Bun-%26_TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="Bun & TypeScript" />
    <img src="https://img.shields.io/badge/License-Apache_2.0-green?style=for-the-badge" alt="License" />
  </p>
</div>

<br />

**Lastboard** is a modern, self-hosted dashboard designed for enthusiasts who demand both beauty and raw performance. Built with a single-binary architecture, it replaces clunky, resource-heavy alternatives with a lightweight, lightning-fast experience.

---

## Key Features

### Single Binary Architecture
Forget about complex Docker chains or multi-service dependencies. **Lastboard** compiles the entire frontend (assets, fonts, styles) and backend into a **single, portable executable**. Deployment is as simple as copying one file.

### Native Grid Engine
We built our own high-performance drag-and-drop grid system using **100% native JavaScript**.
- **Zero dependencies**: No heavy layout libraries like React-Grid-Layout.
- **Butter-smooth interactions**: Optimized for 60fps animations even on low-power devices.
- **Adaptive Architecture**: Seamless logic for desktop, tablet, and mobile layouts.

### Professional Setup Wizard
A secure, guided initialization flow helps you configure your environment in seconds.
- **First-run configuration**: set your admin credentials, theme preferences, and system defaults.
- **Auto-discovery**: detects environment capabilities automatically.

### Premium UI & Theming
Designed with **Glassmorphism** principles for a depth-rich, modern aesthetic.
- **Real-time Dark/Light Mode**: toggles instantly with specialized color tokens for each mode.
- **Stealth Scroll System**: custom, non-intrusive scrollbars that vanish when not needed.
- **Responsive Animations**: subtle micro-interactions that make the interface feel alive.

---

## Technical Architecture

Lastboard is built on a "Performance First" philosophy, selecting the best tools for speed and developer experience.

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | **Go (Golang)** | Provides a robust, concurrent HTTP server, persistent storage management, and system-level operations. |
| **Frontend** | **TypeScript** | Strongly typed, modern client-side logic ensuring reliability and maintainability. |
| **Build Tool** | **Bun** | Ultra-fast bundler and runtime used to compile frontend assets lightning-fast. |
| **Styling** | **CSS Variables** | A centralized design token system allowing for instant theming and high-performance rendering without CSS-in-JS overhead. |
| **Updates** | **Smart Proxy** | Privacy-focused update system that acts as a shield between your instance and GitHub, enforcing Rate Limits and caching. |

---

## Installation & Build

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
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

**Using Docker CLI:**
```bash
docker run -d \
  --name lastboard \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ghcr.io/codigosh/lastboard:latest
```

### Manual Installation
If you prefer running the binary directly on your host machine.

#### Prerequisites
- **Go 1.23+**
- **Bun** (for building frontend assets)

#### Automated Script (Linux)
```bash
curl -fsSL https://raw.githubusercontent.com/CodigoSH/Lastboard/main/install.sh | sudo bash
```

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
   go build -o lastboard ./cmd/dashboard/main.go
   ```

4. **Run**
   ```bash
   ./lastboard
   ```
   Open `http://localhost:8080` in your browser to start the Setup Wizard.

---

## Credits

- **Icons**: 
  - Tabler Icons (MIT License - https://github.com/tabler/tabler-icons)
  - Homarr Labs Dashboard Icons (Apache 2.0 - https://github.com/homarr-labs/dashboard-icons)
- **Design Inspiration**: Homarr Dashboard (Apache 2.0 - https://github.com/homarr-labs/homarr)

<div align="center">
  <sub>Built with ❤️ by the CodigoSH Team</sub>
</div>

