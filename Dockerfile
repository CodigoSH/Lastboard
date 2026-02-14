# syntax=docker/dockerfile:1

# ==========================================
# Stage 1: Frontend Build (Bun)
# ==========================================
FROM oven/bun:alpine AS frontend-builder
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
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy Go mod files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Embed Frontend: Copy dist from Stage 1 to internal/web/dist
COPY --from=frontend-builder /app/web/dist /app/internal/web/dist

# Build Static Binary
# -ldflags="-s -w" strips debug info for smaller binary size
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/lastboard ./cmd/dashboard

# ==========================================
# Stage 3: High-Performance Runtime (Alpine)
# ==========================================
FROM alpine:3.19

WORKDIR /app

# Install Runtime Dependencies
# - ca-certificates: For HTTPS requests
# - tzdata: For timezone support
# - curl: For Healthcheck
RUN apk add --no-cache ca-certificates tzdata curl

# Create non-root user for security
RUN addgroup -S codigosh && adduser -S codigosh -G codigosh

# Create persistent data directory with correct permissions
RUN mkdir -p /app/data && chown -R codigosh:codigosh /app/data

# Copy Binary from Builder
COPY --from=backend-builder /app/lastboard /app/lastboard

# Networking Configuration
# Application listens on internal fixed port 8080 by default
EXPOSE 8080

# Switch to non-root user
USER codigosh

# Healthcheck
# Uses localhost:8080 explicitly as per "Fixed Port" requirement
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/dashboard/health || exit 1

# Entrypoint
ENTRYPOINT ["/app/lastboard"]
