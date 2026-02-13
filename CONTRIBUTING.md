# Contributing to Lastboard

First off, thanks for taking the time to contribute! Lastboard aims to be the fastest and most beautiful personal dashboard, and your help makes that possible.

## 🛠️ Development Setup

### Prerequisites
- **Go 1.23+**
- **Bun** (Latest)
- **Docker** (Optional, for container testing)
- **Air** (Optional, for backend hot-reloading)

### Quick Start
1. **Clone the repo**
   ```bash
   git clone https://github.com/CodigoSH/Lastboard.git
   cd Lastboard
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Run in Dev Mode**
   If you have `air` installed (recommended):
   ```bash
   make dev
   ```
   Or manually:
   ```bash
   # Terminal 1 (Frontend Watch)
   bun run dev
   
   # Terminal 2 (Backend)
   go run ./cmd/dashboard/main.go
   ```

## 🏗️ Project Structure
- `cmd/dashboard`: Main entry point.
- `internal`: Backend logic (handlers, storage, services).
- `web`: Frontend application (TypeScript, CSS).
- `scripts`: Utilities for release and i18n.

## 🚀 Releasing Support
We use a unified script to handle versioning and changelogs.

**Do not manually edit `package.json` version.** Use the script:

```bash
# For Beta versions (e.g., 1.2.1-Beta.01)
./scripts/release.sh beta

# For Release Candidates
./scripts/release.sh rc

# For Official Stable Releases
./scripts/release.sh stable
```

## 🌐 Translations (i18n)
If you want to add or update translations:
1. Edit the master file `scripts/i18n-sync.ts`.
2. Run `bun run i18n:sync` to propagate changes to all `locales/*.json` files.
3. Commit both the script and the generated json files.

## 🤝 Code Style
- **Go**: Follow standard Go idioms. Run `go fmt ./...` before committing.
- **TypeScript**: We use standard prettier/eslint rules.
- **Commits**: Please follow [Conventional Commits](https://www.conventionalcommits.org/).
  - `feat: add new widget`
  - `fix: resolve layout bug`
  - `docs: update readme`
