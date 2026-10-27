# Podman

Podman answers the same API as Docker through a socket of its own, so Lastboard's [Docker widget](../widgets/docker.md) and Docker page, and the [Lastboard Agent](https://git.codigosh.com/CodigoSH/lastboard-agent), work with it unchanged. What follows is for rootless Podman, the way it is normally run.

## Turn the socket on

Once, as the user that runs your containers:

```bash
systemctl --user enable --now podman.socket
```

It lives at `$XDG_RUNTIME_DIR/podman/podman.sock` — `/run/user/1000/podman/podman.sock` for the user with id 1000.

## Run Lastboard with it

Mount the socket where Docker's would be, and turn SELinux labelling off for that one container:

```bash
podman run -d --name lastboard -p 8080:8080 \
  -v lastboard-data:/var/lib/lastboard \
  -v $XDG_RUNTIME_DIR/podman/podman.sock:/var/run/docker.sock \
  --security-opt label=disable \
  git.codigosh.com/codigosh/lastboard:latest
```

Then add a host of type **Local (socket)**. Two things are easy to get wrong here:

- **Without `--security-opt label=disable`**, on a system where SELinux is enforcing (Fedora, RHEL and their relatives), the container is not allowed to open the socket, and the host shows *Could not connect to Docker host*.
- **Leave `PUID` and `PGID` unset.** In rootless Podman the container's root is your own user on the host — the user that owns the socket — so it gives nothing away. With `PUID` set, Lastboard switches to an id that cannot read the socket, and the host shows *Could not connect to Docker host* again.

## Run the agent with it

The agent is the same, with the same two rules:

```bash
podman run -d --name lastboard-agent -p 2375:2375 \
  -e TOKEN=your_secure_random_token \
  -v $XDG_RUNTIME_DIR/podman/podman.sock:/var/run/docker.sock \
  --security-opt label=disable \
  git.codigosh.com/codigosh/lastboard-agent:latest
```

## As a service, with Quadlet

Quadlet is how Podman runs a container as a systemd service. Save this as `~/.config/containers/systemd/lastboard.container`:

```ini
[Unit]
Description=Lastboard
Requires=podman.socket
After=podman.socket

[Container]
Image=git.codigosh.com/codigosh/lastboard:latest
ContainerName=lastboard
PublishPort=8080:8080
Volume=lastboard-data:/var/lib/lastboard
Volume=%t/podman/podman.sock:/var/run/docker.sock
SecurityLabelDisable=true

[Service]
Restart=always

[Install]
WantedBy=default.target
```

`%t` is the same runtime folder as `$XDG_RUNTIME_DIR`. For the agent, the same file as `lastboard-agent.container`, with `Image=git.codigosh.com/codigosh/lastboard-agent:latest`, `ContainerName=lastboard-agent`, `PublishPort=2375:2375`, `Environment=TOKEN=…` and no data volume. Then:

```bash
systemctl --user daemon-reload
systemctl --user start lastboard
```

A user's services stop when that user logs out unless lingering is on for them: `loginctl enable-linger $USER` keeps them running, and starting at boot.

## A native install

A native install reads Docker at `/var/run/docker.sock` and nowhere else. To watch Podman from it, run the agent as above on the same machine and add it as a **Lastboard Agent** host at `127.0.0.1:2375`.
