# AGENTS.md - Lastboard Development Guide

This file provides guidance for agentic coding agents working in this repository.

## Project Overview

Lastboard is a dashboard application with:
- **Go backend** (`internal/`, `cmd/`) - HTTP API server using SQLite
- **TypeScript frontend** (`web/src/`) - Bun-based build system, uses React-like patterns
- **Go version**: 1.26.1 | **Bun version**: 1.3.11+

## Build Commands

### Full Build
```bash
make build          # Builds frontend + backend
bun run build       # Frontend only (web/build.ts)
go build -o bin/lastboard ./cmd/lastboard/main.go
```

### Development
```bash
make run            # Run the application
make dev            # Run with hot-reload (requires air)
```

### Testing

**Go tests:**
```bash
make test                    # All tests with coverage
make test-verbose            # Verbose output
make test-coverage           # Generate HTML coverage report
make test-quick              # Quick tests only (-short flag)

# Single test
go test ./internal/... -run TestValidateUsername -v

# Single package
go test ./internal/web/api/... -v

# Benchmarks
make benchmark
go test ./internal/... -bench=. -benchmem -run=^$
```

**Bun/TypeScript tests:**
```bash
bun test web/src/services/collisionService.test.ts
```

### Linting & Vetting
```bash
go vet ./...
go build ./...
```

### Docker
```bash
docker build -t lastboard:local .
```

## Code Style Guidelines

### Go

- **Formatting**: Use `gofmt` - standard Go formatting is enforced
- **Error handling**: Return errors as values; use `if err != nil` pattern
- **Logging**: Use `log/slog` for structured logging
- **Struct tags**: Place JSON tags on same line as field, e.g., `Field string json:"field_name"`
- **HTTP handlers**: Use `net/http` with `http.Error()` for errors
- **Database**: Use `database/sql` with `?` placeholders (not `$1`)

**Example struct:**
```go
type User struct {
    ID          int       `json:"id"`
    Username    string    `json:"username"`
    Password    string    `json:"-"` // Never expose in JSON
    CreatedAt   time.Time `json:"created_at"`
}
```

### TypeScript/Frontend

- **Indentation**: 4 spaces (not tabs)
- **Types**: Always use explicit types; avoid `any`
- **Strict mode**: TypeScript strict mode is enabled
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Testing**: Uses `bun:test` - import `describe`, `it`, `expect` from 'bun:test'

**Example service class:**
```typescript
class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = window.LASTBOARD_CONFIG?.API_BASE_URL || '';
    }

    async get<T>(url: string): Promise<T> {
        return this.request<T>(url, { method: 'GET' });
    }
}

export const apiService = new ApiService();
```

### Import Organization (Go)

1. Standard library
2. External packages (e.g., `golang.org/x/crypto`)
3. Internal packages

```go
import (
    "database/sql"
    "encoding/json"
    "net/http"
    "time"

    "github.com/CodigoSH/Lastboard/internal/core/user"
    "golang.org/x/crypto/bcrypt"
)
```

### Import Organization (TypeScript)

1. Relative imports (`../`, `./`)
2. External packages
3. No path aliases in use

```typescript
import { ApiResponse } from '../types';
import { collisionService } from './collisionService';
```

## Project Structure

```
├── cmd/
│   ├── lastboard/main.go          # Main entry point
│   └── lastboard-verify/main.go   # Verification CLI
├── internal/
│   ├── core/                      # Business logic
│   │   ├── dashboard/
│   │   ├── setup/
│   │   └── user/
│   ├── platform/
│   │   └── database/              # SQLite operations
│   └── web/
│       ├── api/                   # HTTP handlers
│       ├── middleware/            # Auth, ratelimit, setup
│       └── util/
├── web/
│   ├── src/
│   │   ├── components/            # UI components
│   │   ├── services/             # API, i18n, theme
│   │   ├── store/                # State management
│   │   ├── widgets/              # Dashboard widgets
│   │   └── locales/              # i18n
│   └── public/locales/           # Translation JSON files
├── scripts/                       # Build/release scripts
└── Makefile
```

## Translation Workflow

All translations are in `web/public/locales/`. The master file is `en.json`.

1. Edit `web/public/locales/en.json` first
2. Run `bun run i18n:sync` to propagate to all languages
3. Commit with `git add web/public/locales/*.json`

Never manually edit generated locale keys.

## Release Process

Use the release script for versioning:
```bash
./scripts/release.sh [stable|beta|rc]
```

## Security Notes

- Passwords hashed with bcrypt
- CSRF tokens required for state-changing operations
- Session tokens are HTTP-only cookies
- User input is validated before database operations
- Use `go vet` and security scanners before committing

## CSS Responsive Guidelines

### Adaptive Width Pattern
Use `clamp()` with container queries (`cqi`) for responsive elements that scale with screen size:

```css
/* Sidebar panel - scales with viewport */
width: clamp(180px, 12cqi, 250px);

/* Content panel - scales with container */
width: clamp(280px, 45cqi, 400px);

/* Modals - scales with container, 85cqi for wider responsive range */
width: clamp(300px, 85cqi, 400px);
```

### Server Restart After CSS/Frontend Changes
**CRITICAL**: After modifying CSS files, you MUST rebuild and restart the server:
```bash
# 1. Kill existing process
pkill -9 -f lastboard

# 2. Clean rebuild (removes cached dist)
rm -rf web/dist internal/web/dist && make build

# 3. Rebuild Go binary
go build -o bin/lastboard ./cmd/lastboard/main.go

# 4. Restart server
./bin/lastboard &
```

Do NOT trust that `make build` alone updates the running server. The Go binary serves the frontend from `internal/web/dist/`. Always verify the binary is rebuilt.

## Code Analysis Guidelines

When auditing code or providing analysis:

- **Verify before presenting**: Compile code snippets mentally before showing them; ensure all variables are declared and imports are correct
- **Consult documentation for uncertain topics**: If unsure about Go/TypeScript behavior, check official docs or pkg.go.dev
- **Think through attack vectors completely**: When analyzing security issues, consider all paths including edge cases (e.g., not just prefix matching but what the validation actually allows)
- **No invented solutions**: Never present code that wouldn't compile or work; if a solution is uncertain, say so and research it first
- **Be precise with examples**: Ensure examples accurately illustrate the problem, not a variant of it
- **Verify logic flow before describing impact**: When describing what code does, trace the actual execution path. Do not assume behavior from glancing at code - read the full conditional logic including all branches
- **Know idiomatic patterns**: Familiarize yourself with standard library conventions (e.g., `QueryRow` with `err != sql.ErrNoRows`, `Scan` being positional not by name). If unsure whether a pattern is correct, research it
- **Read the full context**: Do not analyze code snippets in isolation. A variable like `r.Body` may have been modified earlier in the function, changing the expected behavior
- **Trace all code paths**: When evaluating impact, consider what happens in ALL branches, not just the "happy path"
