# Installation

Get Lastboard up and running using your preferred method. We officially support Docker, Podman and native Linux installations.

![The Setup Wizard on a fresh install](../assets/setup.png)

The first time you open Lastboard it walks you through three steps: your language and theme, the admin account, and a summary. There is nothing to configure before that — the wizard creates the database on the spot.

## Requirements

- **Docker Method:** Docker and Docker Compose installed.
- **Podman Method:** Podman installed; the Quadlet files in the [Podman guide](../podman/overview.md) need Podman 4.4 or later.
- **Native Method:** Linux OS (amd64 or arm64).

## Method 1: Docker (Recommended)

The easiest way to install Lastboard is via Docker Compose. Images are published to our self-hosted registry at `git.codigosh.com`.

> **Note:** If your Docker daemon returns an authentication error when pulling the image, log in first:
> ```bash
> docker login git.codigosh.com
> ```

Create a `docker-compose.yml` file with the following content:

```yaml
services:
  lastboard:
    image: git.codigosh.com/codigosh/lastboard:latest
    container_name: lastboard
    ports:
      - "8080:8080"
    environment:
      - TZ=America/New_York
      # - TRUST_PROXY=true   # Uncomment if running behind a reverse proxy
    volumes:
      - ./data:/var/lib/lastboard
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Start the container:
```bash
docker compose up -d
```

## Method 2: Native Linux Installation

You can install Lastboard directly on your host machine using our automated script. This sets up a systemd service and runs the application.

Run the following command:
```bash
curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash
```

### Running it again

The same command updates an existing installation. It reads the port and proxy setting from
your service, tells you which version you have, and installs the latest only if it is
different:

- **Newer release available** — it shows `Updating v1.9.2 → v1.9.3`, takes a copy of your
  database and replaces the binary.
- **Already the latest** — it says so and stops, touching nothing: no download, no database
  copy, no restart.
- **Install it anyway** — to repair a damaged binary, or to answer the reverse-proxy question
  differently, add `--reinstall`:

```bash
curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash -s -- --reinstall
```

### Removing it

The installer does not leave a copy of itself on your machine, so there is no
`install.sh` to run. Fetch it again and pass the option through:

```bash
curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash -s -- --uninstall
```

The `-s --` is what hands `--uninstall` to the script instead of to `bash`. This stops and
disables the service, removes the unit, the binary and the symlink, and leaves your database
where it is, in `/var/lib/lastboard`.

To delete the data and the service account as well, add `--purge`:

```bash
curl -fsSL https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh | sudo bash -s -- --uninstall --purge
```

It asks you to type `DELETE` first, and refuses outright when there is no terminal to ask
on — so it cannot erase a database from a script.

> If you saved the script to a file, `sudo bash install.sh --uninstall` (and `--purge`) does the same.


## Method 3: Podman

The image is the same. Run it with `podman run`, or as a service with a Quadlet file; `podman compose` reads the `docker-compose.yml` above as well. The [Podman guide](../podman/overview.md) has the commands, the Quadlet file and the two settings the socket needs (`--security-opt label=disable`, and no `PUID` or `PGID`).

## Connecting Docker and Podman hosts

However Lastboard is installed, a host is added in **Settings → Docker / Podman**, and the Lastboard Agent reaches any of them:

| Lastboard runs as | The machine's own Docker or Podman | Another machine |
| :--- | :--- | :--- |
| **Native** | A Local socket host, at the engine's socket. Lastboard's user must be allowed to open it, which a rootless Podman does not allow: use the agent. | The agent on that machine. |
| **Docker** | Mount the Docker socket into the container, or run the agent and reach it as `host.docker.internal`. | The agent on that machine. |
| **Podman** | Mount the Podman socket (see the guide), or run the agent and reach it as `host.containers.internal`. | The agent on that machine. |

See [Docker and Podman](../docker/overview.md#docker-hosts) for each type of host and what its errors mean.

## First Run

Once Lastboard is running, it will be available on port `8080` by default. Open your browser and navigate to `http://your-server-ip:8080`.

You will be greeted by the **Setup Wizard**, which walks you through creating your first admin user. Zero configuration files to touch!

## Installing it as an app

Lastboard ships a web app manifest, so a browser can install it to the home screen or the
desktop and open it in its own window with no address bar. Nothing to enable: the manifest is
linked from the dashboard **and** from the login page, which is the page you land on from a
phone with no session.

- **Android (Chrome)** — the menu offers *Install app*. It is minted as a real WebAPK, with
  the Lastboard icon and no browser badge on it.
- **Desktop (Chrome, Edge)** — an install control appears at the end of the address bar.
- **iOS (Safari)** — *Share → Add to Home Screen*.

> **It needs HTTPS with a certificate the device trusts.** Over plain `http://` on the LAN, or
> with a self-signed certificate, no browser will install it — put Lastboard behind a reverse
> proxy with a real certificate first (see below). Browsers that do not mint WebAPKs
> themselves — Brave and Firefox on Android — place a shortcut instead, and their launcher
> stamps their own badge on the icon. That is the browser, not Lastboard.

> **A login in front of Lastboard stops it too.** If a reverse proxy or a tunnel asks for its own
> sign-in before the page, the browser cannot read the manifest or the icons — it fetches them
> without that sign-in — and offers no install. Lastboard has its own login; leave the one in
> front off for it.

**The app is named after your panel.** It takes the name you gave it in **Settings →
Personalization**, the one in the top bar, so two servers installed on one phone are not both
"Lastboard". Install it signed in: from the login page, with no session yet, it is called
"Lastboard". An app installed before you renamed the panel keeps its old name until the
browser checks it again, or until you install it once more.

The service worker is only there for push notifications and keeps no copy of the app, so an
installed Lastboard is a window onto your server, not an offline copy: it needs to reach the
server the same way the browser tab does.

## Reverse Proxy Setup

If you plan to use a reverse proxy, you must set the `TRUST_PROXY=true` environment variable.

### Nginx Example
```nginx
server {
    listen 80;
    server_name dashboard.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Caddy Example
```txt
dashboard.example.com {
    reverse_proxy 127.0.0.1:8080
}
```
