# syntax=docker/dockerfile:1

# Where the binaries come from is a build argument:
#
#   BINARIES=source    (the default) compiles them here, from the source in the
#                      build context. `docker build .` from a checkout.
#   BINARIES=prebuilt  takes them, already built, from image-bin/ in the build
#                      context. The release does this: the image then carries
#                      the very binary that is inside the release's tarball,
#                      checked by its checksums.txt, and not a second build of
#                      the same commit.
ARG BINARIES=source

# ==========================================
# Stage 1: Frontend Build (Bun)
# ==========================================
# Pinned, and to the same version .forgejo/workflows/tests.yml installs: a
# floating tag means the image that built the release is not the one the
# tests ran against, and nothing says so.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.4-alpine AS frontend-builder
WORKDIR /app

# Install dependencies (Frozen Lockfile for reproducibility)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun web/build.ts

# ==========================================
# Stage 2: Backend Build (Go), from the source
# ==========================================
FROM --platform=$BUILDPLATFORM golang:1.27.4-alpine AS bins-source
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
ARG VERSION=dev

# Build main binary (timetzdata embeds timezone DB in the binary: the runtime
# image has no /usr/share/zoneinfo). The release builds it the same way.
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -tags timetzdata \
    -ldflags="-s -w -X git.codigosh.com/CodigoSH/Lastboard/internal/version.Current=${VERSION}" \
    -o /out/lastboard ./cmd/lastboard

# Build healthcheck binary for target platform
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o /out/healthcheck ./cmd/healthcheck && \
    cp /etc/ssl/certs/ca-certificates.crt /out/ca-certificates.crt

# ==========================================
# Stage 2, the other way: binaries built by the release
# ==========================================
# On the build platform too, so nothing runs under emulation. image-bin/ holds,
# for each architecture, the server taken out of the release's tarball and the
# health check.
FROM --platform=$BUILDPLATFORM alpine:3.24 AS bins-prebuilt
ARG TARGETARCH
COPY image-bin/lastboard-linux-${TARGETARCH} /out/lastboard
COPY image-bin/healthcheck-linux-${TARGETARCH} /out/healthcheck
RUN cp /etc/ssl/certs/ca-certificates.crt /out/ca-certificates.crt

FROM bins-${BINARIES} AS bins

# ==========================================
# Stage 3: Runtime (Alpine, no RUN = no QEMU)
# ==========================================
# 3.19 left Alpine's two-year support window in 2025; this is the runtime
# image people actually run.
FROM alpine:3.24

WORKDIR /app

# CA certificates (text files, architecture-independent)
COPY --from=bins /out/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

# Cross-compiled binaries
COPY --from=bins /out/lastboard /app/lastboard
COPY --from=bins /out/healthcheck /app/healthcheck

# Networking Configuration
EXPOSE 8080

# Environment Defaults
ENV DB_FILE=/var/lib/lastboard/lastboard.db
ENV PORT=8080
# PUID/PGID: when set to a non-zero value the binary chowns the data dir and
# drops to that user/group at startup. Default 0 (root) keeps the historical
# behavior and avoids bind-mount permission issues on Proxmox/LXC.
ENV PUID=0
ENV PGID=0

# Healthcheck (uses cross-compiled Go binary instead of curl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["/app/healthcheck"]

# Entrypoint
ENTRYPOINT ["/app/lastboard"]
