# syntax=docker/dockerfile:1

# ==========================================
# Stage 1: Frontend Build (Bun)
# ==========================================
FROM --platform=$BUILDPLATFORM oven/bun:alpine AS frontend-builder
WORKDIR /app

# Install dependencies (Frozen Lockfile for reproducibility)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun web/build.ts

# ==========================================
# Stage 2: Backend Build (Go)
# ==========================================
FROM --platform=$BUILDPLATFORM golang:1.26.1-alpine AS backend-builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy Go mod files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Embed Frontend: Copy dist from Stage 1 to internal/web/dist
COPY --from=frontend-builder /app/web/dist /app/internal/web/dist

# Cross-compile for target platform
ARG TARGETOS
ARG TARGETARCH

# Build main binary (timetzdata embeds timezone DB in the binary)
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -tags timetzdata -ldflags="-s -w" -o /app/lastboard ./cmd/lastboard

# Build healthcheck binary for target platform
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -ldflags="-s -w" -o /app/healthcheck ./cmd/healthcheck

# ==========================================
# Stage 3: Runtime (Alpine, no RUN = no QEMU)
# ==========================================
FROM alpine:3.19

WORKDIR /app

# CA certificates from builder (text files, architecture-independent)
COPY --from=backend-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Cross-compiled binaries
COPY --from=backend-builder /app/lastboard /app/lastboard
COPY --from=backend-builder /app/healthcheck /app/healthcheck

# Networking Configuration
EXPOSE 8080

# Environment Defaults
ENV DB_FILE=/var/lib/lastboard/lastboard.db
ENV PORT=8080

# Healthcheck (uses cross-compiled Go binary instead of curl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["/app/healthcheck"]

# Entrypoint
ENTRYPOINT ["/app/lastboard"]
