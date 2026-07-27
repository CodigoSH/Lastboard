# Troubleshooting

Common issues when self-hosting Lastboard, and how to resolve them.

## "Database directory is not writable"

Lastboard can't write its SQLite file. This usually happens when running unprivileged (`PUID`/`PGID`) against a data directory owned by another user, common on **Proxmox/LXC** bind mounts.

- Remove `PUID`/`PGID` to run as `root` (the safe default), **or**
- Make sure the data directory is owned by the `PUID`/`PGID` you set.

See [Configuration → PUID / PGID](../getting-started/configuration.md#puid--pgid-running-unprivileged).

## Too many "429 Too Many Requests" / login lockouts

Behind a reverse proxy without `TRUST_PROXY`, every visitor appears to come from the proxy's IP, so they share one rate-limit and lockout bucket.

- Set `TRUST_PROXY=true` **only** when Lastboard sits behind a proxy (Nginx, Traefik, Caddy, Cloudflare, Pangolin…).
- Never enable it when Lastboard is exposed directly to the internet — it would let clients spoof their IP.

See [Configuration → TRUST_PROXY](../getting-started/configuration.md#trust_proxy).

## The dashboard disconnects or widgets stop updating behind a proxy

Live widgets and status updates use long-lived connections (WebSocket/SSE). Some proxies close idle connections or don't upgrade them.

- Ensure your proxy **passes WebSocket upgrades** and doesn't impose a short read/idle timeout on the Lastboard route.
- For Nginx, forward the `Upgrade`/`Connection` headers and raise `proxy_read_timeout`.

## An API or monitored service shows "Unreachable" / down, but it works in my browser

The request runs on the **Lastboard server**, not your browser, so what matters is reachability *from the host*.

- Confirm the URL responds from the Lastboard machine (e.g. `curl` from that host).
- Use an address the server can reach — a container name or private IP may differ from what your browser uses.
- Self-signed certificates are accepted, so that alone won't cause failure.
- For the API widget, a missing or wrong **credential** also shows as Unreachable. See the [API Widget](../widgets/api.md#troubleshooting).

## A monitored service shows no history

- History is only recorded continuously in **24/7 (server-side)** monitoring mode. In "While the tab is open" mode, data is gathered only while Lastboard is open.
- Recorded checks are kept for **30 days**; older data is pruned.

See [Monitoring & Uptime](../monitoring/overview.md).

## After restoring a backup, the app looks broken or shows old data

A restore replaces the database, but your browser may still hold cached assets or local state.

- Do a hard refresh (**Ctrl/Cmd + Shift + R**), or open the app in a private window.

## Notifications never arrive

- Alerts require **24/7 monitoring** — there's no server to send them in tab mode.
- Use **Send test** in **Settings → Notifications** to verify the endpoint and token.
- Check that the notification server is reachable from the Lastboard host.

See [Monitoring → Notifications](../monitoring/overview.md#notifications).

## Still stuck?

Open an issue on the [Forgejo repository](https://git.codigosh.com/CodigoSH/Lastboard/issues) — include your version, how you run Lastboard (Docker/native), and any relevant logs.
