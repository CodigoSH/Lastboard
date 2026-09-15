# Troubleshooting

Common issues when self-hosting Lastboard, and how to resolve them.

## "Database directory is not writable"

Lastboard can't write its SQLite file. This usually happens when running unprivileged (`PUID`/`PGID`) against a data directory owned by another user, common on **Proxmox/LXC** bind mounts.

- Remove `PUID`/`PGID` to run as `root` (the safe default), **or**
- Make sure the data directory is owned by the `PUID`/`PGID` you set.

See [Configuration → PUID / PGID](../getting-started/configuration.md#puid--pgid-running-unprivileged).

## Too many "429 Too Many Requests" / login lockouts

Behind a reverse proxy without `TRUST_PROXY`, every visitor appears to come from the proxy's IP, so they share one rate-limit and lockout bucket.

A setting spelled in a way Lastboard cannot read falls back to its default, so
`TRUST_PROXY=True` — with a capital letter — means the same as not setting it at
all. Lastboard says so at startup: look for `configuration ignored` in the log,
which names the setting, the value found and what will be used instead.

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

- History is only recorded with **24/7 monitoring** on. With it off the up/down dots still work, but nothing is stored, so there is no history to show.
- Recorded checks are kept for **30 days**; older data is pruned.

See [Monitoring & Uptime](../monitoring/overview.md).

## The Proxmox page says the token cannot see anything

Almost always privilege separation on the token. A token created **without** `--privsep 0`
needs an ACL entry of its own as well as the user's, and what applies is the *intersection* of
the two — so a brand-new token can end up able to do nothing at all. Recreate it with
`--privsep 0`, or give the token its own ACL entry.

**Save and connect** reads the host immediately and reports what the token can actually see, so
you can fix it there rather than discovering it later. See
[Proxmox → Create the token](../proxmox/overview.md#1-create-the-token-on-your-proxmox-host).

## The Proxmox start and shutdown buttons are missing

Two reasons, and Lastboard tells you which:

- **The token has no `VM.PowerMgmt`.** Lastboard asks the host what the token may do rather than
  assuming, so the buttons are simply not drawn. Add the privilege to the role, or leave it off
  deliberately for a read-only integration.
- **You are not the administrator.** Power actions are administrator-only, on the page and in
  the widget alike.

Nodes never get these buttons, at any privilege level. That is deliberate — see
[Starting and stopping](../proxmox/overview.md#starting-and-stopping).

## A Proxmox machine shows the default icon and no bookmark

Matching is deliberately strict: naming the wrong service as the one that went down is worse
than naming none. A machine goes unmatched when its name does not resolve to **exactly one**
bookmark — two bookmarks would fit, or none does (`23-jellyfin-musica` against a bookmark
called *Jellyfin Music* is a different word in a different language).

- If a bookmark does serve it, edit the bookmark and pick the machine under **Served by**. That
  always wins over the guess.
- If nothing will ever bookmark it — a CI runner, a tunnel, the container Lastboard itself runs
  on — open the machine and click its icon to
  [choose one](../proxmox/overview.md#machines-that-will-never-have-a-bookmark).

## A badge says the dashboard is offline

Lastboard shows an offline indicator when a request to **its own server** fails. It is about
your browser's link to Lastboard, not about your services — a service being down shows up as a
red status dot on its tile instead.

The board keeps a copy of its last layout in the browser, so it still draws while the badge is
up — but changes made in that state cannot reach the server and will not stick. The badge
clears itself as soon as a request succeeds again. There is no service worker, so an installed Lastboard needs to reach the server exactly
as the browser tab does.

## After restoring a backup, the app looks broken or shows old data

A restore replaces the database, but your browser may still hold cached assets or local state.

- Do a hard refresh (**Ctrl/Cmd + Shift + R**), or open the app in a private window.

## Notifications never arrive

- Alerts require **24/7 monitoring** — there's no server to send them in tab mode.
- Use **Send test** in **Settings → Monitoring** to verify the endpoint and token.
- Check that the notification server is reachable from the Lastboard host.

See [Monitoring → Notifications](../monitoring/overview.md#notifications).

## Still stuck?

Open an issue on the [Forgejo repository](https://git.codigosh.com/CodigoSH/Lastboard/issues) — include your version, how you run Lastboard (Docker/native), and any relevant logs.
