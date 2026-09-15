# Development Guide

This guide is intended for CodigoSH team members. It covers how to set up a local development environment for Lastboard.

## Prerequisites

- **Go 1.26+** (Strictly required for backend execution)
- **Bun** (Latest, required for frontend tooling)
- **Docker** (Optional, but recommended for containerized testing)
- **Air** (Optional, but highly recommended for Go hot-reloading)

## Clone & Setup

1. **Clone the repository:**
   ```bash
   git clone https://git.codigosh.com/CodigoSH/Lastboard.git
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
# Terminal 1: Build the frontend bundle (re-run after changing TypeScript or CSS)
bun run build

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

Lastboard ships translations for 20 languages. The master locale file is `web/public/locales/en.json`; every other language lives alongside it as `web/public/locales/<lang>.json`. To add or update translations:
1. Add or edit the English keys in `web/public/locales/en.json`.
2. Run the sync command: `bun run i18n:sync`. This copies any missing keys into every other locale file using the English text as a **placeholder fallback** — it does not translate anything, and it also prunes keys that no longer exist in the master.
3. Replace those English placeholders with real translations by hand in each `web/public/locales/<lang>.json`.
4. Commit `en.json` together with all updated locale files.

## Code Style

- **Go:** Follow standard Go idioms. Always run `go fmt ./...` before committing.
- **TypeScript:** The project ships no runtime dependencies and no Prettier/ESLint config — match the style of the surrounding code. Types are checked with `bunx tsc --noEmit` and tests run with `bun test`.
- **Commits:** We follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add new widget`
  - `fix: resolve layout bug`
  - `docs: update readme`

## Release Process

We use a unified shell script to handle version bumping, changelog generation, and tagging. Once a tag is pushed to Forgejo, the CI pipeline handles everything else automatically.

**Do not manually edit versions.**

The full signature is:

```
./scripts/release.sh [stable|beta|rc] [X.Y.Z] ["release title"] [--dry-run] [--yes] [--skip-checks]
```

Arguments are matched by shape, not by position: anything looking like `X.Y.Z` is taken as an
explicit version, and anything else as the title. So the usual call is just the channel and a
summary:

```bash
# For Beta releases
./scripts/release.sh beta "One-line summary of the release"

# For Release Candidates
./scripts/release.sh rc "One-line summary of the release"

# For Official Stable releases
./scripts/release.sh stable "One-line summary of the release"

# Pinning the version instead of letting the script work it out
./scripts/release.sh beta 1.9.0 "One-line summary of the release"
```

The title is the summary the changelog is built from. Pass it as an argument, or the script will ask for one. `--yes` answers the confirmations, for a non-interactive run; without a terminal and without it, a `stable` release stops on the first line rather than after a two-minute preflight.

**Preview a release before making it.** `--dry-run` prints the version it would produce, checks every file it would rewrite, renders the changelog and lists the git commands, without touching the working tree:

```bash
./scripts/release.sh beta "Summary" --dry-run
```

Before anything is written, the script requires a clean tree on `main` that is level with the remote, and runs `gofmt`, `go vet`, `go test`, `bun test` and `bun run build`. If any of them fails it stops, so a broken tree can never reach a published tag. `--skip-checks` bypasses the preflight and is meant for emergencies.

If you write `RELEASE_NOTES_<tag>.md` before running the script, those notes are used as the release body instead of the generated list of commit subjects. The file is removed from the branch afterwards but lives on in the tag.

The script bumps the version, updates the changelog, commits, and pushes a new tag. This triggers the Forgejo Actions workflows which:

1. Build the Go binary for `linux/amd64` and `linux/arm64`
2. Create the release on Forgejo with the compiled binaries and `checksums.txt`, signing `checksums.txt` with the `RELEASE_SIGNING_KEY` secret when it is set (uploading `checksums.txt.sig` alongside)
3. Build and push the multi-arch Docker image to `git.codigosh.com`

`RELEASE_SIGNING_KEY` is a **per-repository** CI secret — each project signs with its own key —
and it is read only by `cmd/sign`, never by the server. `CI_TOKEN` is inherited from the
organization and does not need to be created per project.

See [Release Signing](../security/release-signing.md) for the signing key setup.

## Running the checks

The same suite the release preflight runs, so it is worth running before you commit:

```bash
gofmt -l .          # must print nothing
go vet ./...
go test ./...
bun test
bunx tsc --noEmit
bun run build       # never silence this: a broken bundle is only visible in its output
```

`make restart` rebuilds the frontend bundle **and** the Go binary and restarts the local
instance. The binary embeds the bundle, so rebuilding only the frontend leaves the server
handing out the previous one.
