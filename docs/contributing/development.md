# Development

Want to compile Lastboard from source or contribute code? Follow this guide to get your development environment set up.

## Prerequisites

- **Go 1.26+** (Strictly required for backend execution)
- **Bun** (Latest, required for frontend tooling)
- **Docker** (Optional, but recommended for containerized testing)
- **Air** (Optional, but highly recommended for Go hot-reloading)

## Clone & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/CodigoSH/Lastboard.git
   cd Lastboard
   ```

2. **Install frontend dependencies:**
   ```bash
   bun install
   ```

## Running in Dev Mode

The easiest way to develop is using the provided Makefile.

If you have `air` installed:
```bash
make dev
```
*(This command will automatically prompt you to install `air` if it is not found).*

Alternatively, run the frontend and backend watchers manually in two terminals:

```bash
# Terminal 1: Watch TypeScript & CSS
bun run dev

# Terminal 2: Run Go server
go run ./cmd/lastboard/main.go
```
The application will be available at `http://localhost:8080`.

## Project Structure

- `cmd/lastboard`: The main entry point for the Go application.
- `internal`: Backend logic (handlers, database initialization, middleware, update services).
- `web`: The entire frontend application (TypeScript, styles, HTML templates).
- `scripts`: Utilities for handling releases and translations.
- `docs`: Official documentation structure.

## Localization (i18n)

Lastboard supports translations for over 20 languages. To add or update translations:
1. Edit the master sync file: `scripts/i18n-sync.ts`.
2. Run the sync command: `bun run i18n:sync`. This updates all `locales/*.json` files.
3. Commit both the script file and all updated JSON files.

## Code Style

- **Go:** Follow standard Go idioms. Always run `go fmt ./...` before committing.
- **TypeScript:** Rely on the configured Prettier/ESLint rules for project consistency. Formatting is enforced via bun tooling.
- **Commits:** We follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add new widget`
  - `fix: resolve layout bug`
  - `docs: update readme`

## Release Process

We use a unified shell script to handle branching, building, tagging, and compiling changelogs automatically. 

**Do not manually edit versions.**

To draft a release:
```bash
# For Beta releases
./scripts/release.sh beta

# For Release Candidates
./scripts/release.sh rc

# For Official Stable releases
./scripts/release.sh stable
```

---
[← Previous page](../security/overview.md) | [Back to Top](../README.md)
