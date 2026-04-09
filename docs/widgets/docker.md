# Docker Widget

The Docker widget provides live monitoring and basic management of your Docker containers directly from Lastboard.

## Description

This widget lists containers, shows their running state, exposes port mappings, and provides real-time CPU/RAM stats. It also allows admin users to control container lifecycles (Start, Stop, Restart).

![Docker Widget](../assets/w-docker.png)

## Prerequisites

To monitor Docker instances, Lastboard needs access to the Docker daemon.

## Connection Modes

You can connect the widget to Docker environments via three distinct modes:

### 1. Local Socket (Native Install)
When running Lastboard natively on Linux, it can access `/var/run/docker.sock` directly (ensure the `lastboard` user has permission to read the socket, often by adding it to the `docker` group).

### 2. Local Socket (Docker Install)
When running Lastboard as a Docker container, uncomment the socket volume mount in the `docker-compose.yml` file to grant it access.
```yaml
    volumes:
      - ./data:/var/lib/lastboard
      - /var/run/docker.sock:/var/run/docker.sock:ro  # Read-only access
```

### 3. Remote via Lastboard Agent
For remote servers, you can use the official Lastboard Agent to securely proxy Docker API calls over HTTP with an authorization token.

## Lastboard Agent

The Lastboard Agent is a lightweight proxy that exposes specific Docker endpoints.

### Quick Start

**Using Docker Compose (Recommended):**
```yaml
services:
  lastboard-agent:
    image: git.codigosh.com/codigosh/lastboard-agent:latest
    container_name: lastboard-agent
    ports:
      - "2375:2375"
    environment:
      - TOKEN=your_secure_random_token
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped
```

**Using Docker CLI:**
```bash
docker run -d \
  --name lastboard-agent \
  -p 2375:2375 \
  -e TOKEN=your_secure_random_token \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --restart unless-stopped \
  git.codigosh.com/codigosh/lastboard-agent:latest
```

### Environment Variables
| Variable | Description |
| :--- | :--- |
| `TOKEN` | Required: The Bearer token used to authenticate requests. |
| `PORT` | The port the agent binds to (default: `2375`). |
| `SOCKET_PATH` | Path to Docker socket (default: `/var/run/docker.sock`). |

### Health Check Endpoint
The agent provides a public, unauthenticated `/health` endpoint to verify connectivity.

### Using with a Reverse Proxy
If securing the agent behind a reverse proxy (like Pangolin or Cloudflare Zero Trust), ensure your proxy forwards the `Authorization` header containing the Bearer token intact.

## Widget Configuration

In the widget's settings, you can add multiple hosts. Supported URL formats include:
- **Local:** `local` or empty string.
- **Agent Server:** `agent://IP_OR_DOMAIN:PORT?token=YOUR_TOKEN`
- **TLS/TCP:** `https://...` or `http://...`

## Customization and Admin Controls

- **Visibility:** Click the eye icon to enter Edit Mode. From here, you can hide specific containers from view.
- **Customization:** Rename containers or assign custom icons.
- **Admin Actions:** Users with the `admin` role can start, stop, or restart containers directly from the widget overlay.

---
[← Previous page](markdown.md) | [Next page →](../security/overview.md)
