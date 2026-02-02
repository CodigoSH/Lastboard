<div align="center">
  <img src="web/public/images/logo.png" alt="Kashboard Logo" width="120" style="margin-bottom: 20px;" />
  <h1>Kashboard</h1>
  
  <p>
    <strong>A sleek, high-performance personal dashboard focused on native speed and premium aesthetics.</strong>
  </p>

  <p>
    <img src="https://img.shields.io/github/v/release/codigosh/Kashboard?style=for-the-badge&label=Latest&color=blue" alt="Latest Release" />
    <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go Version" />
    <img src="https://img.shields.io/badge/Bun-%26_TypeScript-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun & TypeScript" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
    <img src="https://img.shields.io/badge/Platform-Linux%20-lightgrey?style=for-the-badge" alt="Platform" />
  </p>
</div>

<br />

**Kashboard** is a modern, self-hosted dashboard designed for enthusiasts who demand both beauty and raw performance. Built with a single-binary architecture, it replaces clunky, resource-heavy alternatives with a lightweight, lightning-fast experience.

---

## ✨ Key Features

### 🚀 Single Binary Architecture
Forget about complex Docker chains or multi-service dependencies. **Kashboard** compiles the entire frontend (assets, fonts, styles) and backend into a **single, portable executable**. Deployment is as simple as copying one file.

### ⚡ Native Grid Engine
We built our own high-performance drag-and-drop grid system using **100% native JavaScript**.
- **Zero dependencies**: No heavy layout libraries like React-Grid-Layout.
- **Butter-smooth interactions**: Optimized for 60fps animations even on low-power devices.
- **Adaptive Architecture**: Seamless logic for desktop, tablet, and mobile layouts.

### 🛠️ Professional Setup Wizard
A secure, guided initialization flow helps you configure your environment in seconds.
- **First-run configuration**: set your admin credentials, theme preferences, and system defaults.
- **Auto-discovery**: detects environment capabilities automatically.

### 🎨 Premium UI & Theming
Designed with **Glassmorphism** principles for a depth-rich, modern aesthetic.
- **Real-time Dark/Light Mode**: toggles instantly with specialized color tokens for each mode.
- **Stealth Scroll System**: custom, non-intrusive scrollbars that vanish when not needed.
- **Responsive Animations**: subtle micro-interactions that make the interface feel alive.

---

## 🏗️ Technical Architecture

Kashboard is built on a "Performance First" philosophy, selecting the best tools for speed and developer experience.

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | **Go (Golang)** | Provides a robust, concurrent HTTP server, persistent storage management, and system-level operations. |
| **Frontend** | **TypeScript** | Strongly typed, modern client-side logic ensuring reliability and maintainability. |
| **Build Tool** | **Bun** | Ultra-fast bundler and runtime used to compile frontend assets lightning-fast. |
| **Styling** | **CSS Variables** | A centralized design token system allowing for instant theming and high-performance rendering without CSS-in-JS overhead. |

---

## 📦 Installation & Build

### Prerequisites
- **Go 1.21+**
- **Bun** (for building frontend assets)

### ⚡ Automated Installation (One-Liner)
Install Kashboard with a single command. This script automates everything: user creation, directory setup, and systemd service registration.

```bash
curl -fsSL https://raw.githubusercontent.com/codigosh/Kashboard/main/install.sh | sudo bash
```

### 🛠️ Build from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/kashboard.git
   cd kashboard
   ```

2. **Build the Frontend**
   Compile TypeScript, process CSS, and bundle assets into the `dist` folder:
   ```bash
   bun run build
   ```

3. **Build the Binary**
   Generate the final executable with Go:
   ```bash
   go build -o kashboard ./cmd/dashboard/main.go
   ```

4. **Run**
   ```bash
   ./kashboard
   ```
   Open `http://localhost:8080` in your browser to start the Setup Wizard.

---

## Credits

- **Icons**: 
  - Tabler Icons (MIT License - https://github.com/tabler/tabler-icons)
  - Homarr Labs Dashboard Icons (Apache 2.0 - https://github.com/homarr-labs/dashboard-icons)
- **Design Inspiration**: Homarr Dashboard (Apache 2.0 - https://github.com/homarr-labs/homarr)

<div align="center">
  <sub>Built with ❤️ by codigosh</sub>
</div>

