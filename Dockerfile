# === Stage 1: Frontend Build ===
FROM oven/bun:1 AS frontend-builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
# PRODUCTION BUILD
RUN bun web/build.ts

# === Stage 2: Go Build (With Embed) ===
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy Go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Copy Frontend Build into Go 'internal/web/dist' for embedding
# Note: 'internal/web/server.go' expects 'dist' in the same folder.
COPY --from=frontend-builder /app/web/dist /app/internal/web/dist

# Build the Single Binary
RUN CGO_ENABLED=1 GOOS=linux go build -o /app/lastboard ./cmd/dashboard

# === Stage 3: Final Runtime ===
FROM alpine:latest

WORKDIR /app

# Create persistent data directory
RUN mkdir -p /app/data

# Copy ONLY the static binary
COPY --from=builder /app/lastboard /app/lastboard

# Environment
ENV PORT=8080
ENV DB_FILE=/app/data/lastboard.db

# Expose internal port
EXPOSE 8080

# Command
CMD ["/app/lastboard"]
