# Docker

Lastboard can read the Docker of your server and of the other machines you run, and show it beside the services it serves: every container of every host in one list, with its state and resource use and, for one container, how it is set up and what it prints. An account allowed to control Docker can also start, stop and restart them. [Podman](../podman/overview.md) answers the same API, so everything here works with it.

The tile that puts the list on your board is described in the [Docker widget](../widgets/docker.md) guide; this page is about connecting Docker, who can use what, and the Docker page.

## Prerequisites

To monitor Docker instances, Lastboard needs access to the Docker daemon.

## Connection Modes

You can connect Lastboard to Docker environments in three ways:

### 1. Local Socket (Native Install)
When running Lastboard natively on Linux, it can access `/var/run/docker.sock` directly (ensure the `lastboard` user has permission to read the socket, often by adding it to the `docker` group).

### 2. Local Socket (Docker Install)
When running Lastboard as a Docker container, uncomment the socket volume mount in the `docker-compose.yml` file to grant it access.
```yaml
    volumes:
      - ./data:/var/lib/lastboard
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

`:ro` makes the socket file read-only, not what is said through it: Lastboard can still start, stop and restart containers over a socket mounted this way, and so can anything else that reaches it. Access to the Docker socket is control over Docker — and, through it, over the host. That is the same whether Lastboard is installed natively in the `docker` group or runs as a container with the socket mounted. For a Docker on another machine, use the Lastboard Agent: it answers only the few calls the widget makes.

### 3. Remote via Lastboard Agent
For remote servers, you can use the official Lastboard Agent to securely proxy Docker API calls with an authorization token, over HTTP or — behind a reverse proxy — HTTPS.

Running **Podman** instead of Docker? Every mode above works with it through Podman's socket. Two settings that Docker does not need, and Quadlet files to run Lastboard as a service, are in the [Podman guide](../podman/overview.md).

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
The agent provides a public, unauthenticated `/health` endpoint to verify connectivity. Since v1.1.0 it also reports the agent's version there, and the Docker settings show it next to each agent host — so you can tell which release each machine runs without logging into it. An agent older than v1.1.0 reports none and is shown as `< v1.1.0`; one that does not answer shows nothing.

### Using with a Reverse Proxy
If securing the agent behind a reverse proxy (like Pangolin or Cloudflare Zero Trust), enter its address in the host's settings **with `https://`** — `https://agent.example.com` — and Lastboard reaches the agent over HTTPS. Without the scheme it speaks plain HTTP, which is what an agent on your own network answers.

The proxy must forward the `Authorization` header containing the Bearer token intact. As with the Remote TLS type, the certificate is not checked, so a self-signed one or an internal CA works; the connection is still encrypted, and the token no longer crosses the network in the clear.

## Docker hosts

Hosts belong to your account, as Proxmox hypervisors do: you set them up once in **Preferences → Docker**, and every Docker widget reads the same list. Each row says how the host is doing (*Connected · containers: 12*, or why it isn't), and the version for an agent. Add a host with **+ Add New Host**, change one with the pencil, remove it with the bin, and switch one off to keep it without any widget showing it.

![The Docker hosts of an account](../assets/p-docker.png)

Each host has a name, a **Type**, and — for everything except the local socket — an address. Pick the type first; the fields below it change to match.

| Type | Address to enter | Default port |
| :--- | :--- | :--- |
| **Local socket** | nothing — the address field disappears | — |
| **Lastboard Agent** | `192.168.1.100:2375`, plus the agent's token in its own field | `2375`, or whatever you set in the agent's `PORT` |
| **Remote TCP** | `192.168.1.100:2375` | `2375` — an unencrypted Docker daemon |
| **Remote TLS** | `192.168.1.100:2376` | `2376` — a TLS Docker daemon |

Enter the host and port on their own — Lastboard adds the scheme the type needs. The one scheme kept is `https://` on an agent, which means *reach it over HTTPS* (see the reverse proxy section above). An address pasted with a scheme already on it, such as `tcp://10.0.0.5:2375` from `DOCKER_HOST`, is understood as written.

![A Docker agent host with its token saved](../assets/w-p-docker-host.png)

There is no `?token=` to type: the token has its own field, which appears only for the agent. It is a secret: once saved it shows as dots and is never shown again — type a new one to replace it, or empty the box to remove it. The token is kept on the Lastboard server with your account and never travels to your browser, and a dashboard export leaves it out; a full [backup](../using/import-export.md) does carry it, so give the backup a password if it will leave your server.

### Who can use which kind of host

- **The administrator** can use every type.
- **A member** connects to Docker through a **Lastboard Agent**, with the agent's token. The local socket, Remote TCP and Remote TLS reach Docker by being the server, without any credential, so they are the administrator's: a member's account doesn't offer them. To let someone see the server's own containers, run an agent on it and give them its token.
- Whether a member has Docker at all, and whether it may start and stop containers, is one of the permissions the administrator sets for that account.

### Coming from an earlier version

Hosts used to be set up inside each widget. The first time the new version starts, they move to the account that owns the widget: the same host configured in two widgets becomes one host, agent tokens come with it, and what each widget had set on its containers — hidden, names, addresses, order — follows the host. A widget that showed every host keeps showing every host. A member who had the server's own socket in a widget keeps it in the list, marked as one only the administrator can use.

## The Docker page

The widget is a list you glance at. For one container in detail — how it is set up and what it prints — open the **Docker page**: the Docker icon in the top bar, beside the Proxmox one. It is there for an account that may look at Docker and has at least one host that is switched on and that it can use; with none, there is no icon. While the page is open the rest of the top bar is locked and the same icon (or **Esc**, or the browser's Back button) closes it, as with the Proxmox and status pages.

The list on the left holds every container of every host that is on, running ones first, then by name. With more than one host each has its own heading; a host that doesn't answer says why in its own place and the others still draw. Running containers show their CPU and memory use. Everything refreshes every ten seconds while the page is open and the browser tab is visible. **Ctrl+K** (**Cmd+K** on macOS) puts the cursor in the search box, which filters by name, image or the start of the container id.

Choose a container to see it on the right, under two tabs.

### Overview

State, health (only for an image that defines a health check), when it started, how it ended (the end time and the exit code for a container that is not running, and the exit code alone when it is running again after a non-zero one), its restart policy and how many times it has restarted, when it was created, and its image. Below that: the published ports, the mounts (each marked read-only or read-write), the networks with the container's address on each, and the **names** of its environment variables.

**The values of environment variables are never shown.** They often hold passwords and tokens, so only the names leave the server: the values are removed before the answer is sent to your browser.

### Logs

The last 100 lines when you open the tab, with **Load more lines** to read the last 1,000. Lines the container wrote to its error output are marked with a red tint and a bar; a container started with a terminal (`docker run -t`) does not separate the two, so none of its lines are marked. Colour and cursor codes are removed from the text, so a container that paints its output reads as plain text, and what it prints is only ever shown as text, never as markup.

- **Follow** asks for the lines after the last one you have every three seconds, only while the Logs tab and the browser tab are visible, and keeps the view at the end only if you were already there — scroll up to read and it stays where you left it. Turn it off to stop asking.
- **Timestamps** shows or hides the time before each line, in your language's format and your browser's time zone. This choice and *Follow* are remembered in this browser.
- **Copy** puts the lines you see on the clipboard as plain text, with the times if they are showing.
- The page keeps at most 2,000 lines; when more arrive, the oldest are dropped. If the log was larger than Lastboard reads at once, or a line was very long, a note says part of it was cut.

### Permissions and agents

Seeing the page and its logs needs permission to **view** Docker. **Start**, **Restart** and **Stop** in the container's header need permission to **control** it; an account without it sees no buttons. Restart and stop ask for confirmation first, and Stop is switched off for the Lastboard Agent's own container, as in the widget.

Details and logs of a container on an agent host need **Lastboard Agent v1.3.0 or later** on that host. With an older agent the list works as before, and the page names the host and says its agent needs updating, instead of reporting that it could not connect. Hosts of the other types (local socket, TCP, TLS) need nothing.

On a phone the list takes the screen; choosing a container opens it in its place and the Back button returns to the list.

## Starting and stopping

Containers can be started, stopped or restarted directly from the widget rows by an account allowed to control Docker: the administrator on any of its hosts, a member on its own agents. An account that may only look at Docker sees the same containers and their state, without the controls. An agent only accepts the calls it allows, so what it lets through still applies.
