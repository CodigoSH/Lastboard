# Security Overview

Lastboard is built from the ground up with defense-in-depth principles. We prioritize keeping your personal infrastructure safe and completely isolated.

## The threat model, stated plainly

Lastboard is **self-hosted and single-tenant**: personal, family or closed-team. Everyone with
an account is somebody you gave an account to, and the operator owns the network the app sits
on. Two consequences are deliberate, and they are features rather than oversights:

- **Private addresses are not blocked.** Pointing a bookmark, a monitor, an API widget or a
  Docker host at `192.168.1.x`, `10.x` or `.local` *is* the product. Blocking them would break
  it without protecting anybody, because the person entering the address is the person running
  the server.
- **Self-signed certificates are accepted on outbound checks.** Home services use internal CAs
  and bare IPs; refusing them would mean nothing could be monitored.
- **A credential goes only where you sent it.** Every request that carries one — an API widget's
  key, a Server Health source's header, a Gotify or ntfy token, a Proxmox token, a Docker
  agent's token — follows a redirect only on the same server (or from its `http` to its own
  `https`). A redirect to any other address is not followed, so a service that is misconfigured
  or taken over cannot pass your key on. Status checks, which carry nothing, follow redirects as
  a browser would, so a service behind a sign-in page still shows as up.

What that model does **not** excuse is anything on this page: session handling, authorization,
CSRF, headers, rate limiting, update integrity and input limits are held to the same standard
they would be on a public service.

## Authentication and sessions

- **Passwords** are hashed with **Argon2id** (64 MiB, 3 passes). They are never stored or logged
  in any recoverable form, and verification is constant-time so a wrong password cannot be
  distinguished by timing. At most **two** passwords are hashed at the same moment, so a flood
  of sign-in attempts cannot exhaust the memory of a small server. A password can be up to **256
  characters**. Accounts created on earlier versions have a bcrypt hash; it keeps working, and
  is replaced by an Argon2id one the next time that account signs in.
- **Sessions** are **HMAC-SHA256 signed tokens** carrying their own expiry. The signing secret
  is generated on first run and kept in the database — there is no `SESSION_SECRET` to set, and
  nothing to leak into an environment file or a process list. A token names the account by its
  **id** and carries the **password generation** it was opened under: changing a password ends
  every open session of that account, and a cookie left over from a deleted account cannot sign
  in to a new one that reuses the name. Restoring a backup gives every restored account a new
  generation, so it ends every session too — without touching the signing secret, so a session
  opened afterwards survives a restart.
- **The session cookie** is `HttpOnly`, `SameSite=Lax`, and `Secure` whenever the request
  arrives over HTTPS (directly or through a proxy that says so).
- **Login lockout**: after **5 failed attempts within a minute** that client is locked out for
  **5 minutes**, and attempts that arrive together are each counted. Expired lockouts are cleaned
  up as they are read, so the table cannot grow unbounded. The places that ask for the password
  again — changing it, deleting an account, resetting the instance — are held to the same
  lockout **per account**, so a stolen session cookie cannot be turned into a way to guess it.
- **One administrator per instance** — the account the Setup Wizard creates. Every account added
  afterwards is a Member and cannot be promoted, so there is no path from a Member session to
  server-wide settings, user management, backups, updates or Docker control. A Member's monitoring
  and Proxmox connections are their own: nobody sees or uses another account's hypervisors, tokens or
  alert channel.

## Authorization

**Authorization is declared at each route**, not by a list of public path prefixes inside the
middleware. A prefix list is the classic way to leak a whole tree: anything under `/dist/` or
`/styles/` matches, *including paths that do not exist*, and those fall through to the
application shell — which would then be served with no session. Here a route is protected where
it is declared, the SPA shell falls through to a **protected** handler, and a static asset is
only served when it really exists in the embedded filesystem.

## CSRF and cross-site requests

- Every state-changing method (`POST`, `PUT`, `PATCH`, `DELETE`) requires a matching
  `csrf_token` cookie and `X-CSRF-Token` header. A mismatch is **`403 Forbidden`**, with no
  partial work done first.
- On top of that, **`Sec-Fetch-Site`** is checked. The browser writes that header from the real
  origins and a page cannot forge it, so a write started from another site is rejected before
  the token is even looked at. When the header is absent — an old browser, or `curl` — nothing
  breaks: the request falls back to the token check alone.

## Headers

Every response carries:

| Header | Value |
| :--- | :--- |
| `Content-Security-Policy` | see below |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` — **only over HTTPS** |

The policy itself:

```
default-src 'self';
script-src  'self' 'nonce-<per request>';
style-src   'self' 'unsafe-inline';
img-src     'self' data: https:;
connect-src 'self' wss: ws: https://cdn.jsdelivr.net
            https://api.github.com https://git.codigosh.com
            https://*.open-meteo.com;
font-src    'self';
object-src  'none';
frame-ancestors 'self'
```

Two details worth knowing:

- **`script-src` carries a fresh nonce on every request** and does *not* allow
  `'unsafe-inline'`. Markup injected into the page cannot execute as script.
- **`style-src` keeps `'unsafe-inline'` on purpose, and that is measured, not assumed.** The
  interface sets inline `style` attributes for everything it computes at runtime — a tooltip's
  position, a bar's width, a tile being dragged. Removing it on a real instance produced **922
  violations, every one of them an attribute and none of them a `<style>` block**. There is no
  nonce mechanism for style attributes, so the directive cannot be tightened without rewriting
  the interface to stop computing anything.

The hosts in `connect-src` are the icon CDN (jsDelivr), the icon and release metadata
sources (`api.github.com`, `git.codigosh.com`) and the weather and city-lookup service
(`open-meteo.com`) the Clock and Weather widgets call from your browser. Nothing else can be
reached from the page.

See [Headers](headers.md) for HSTS in detail.

## Rate limiting and request limits

- **Token-bucket rate limiting per client IP**: 20 requests per second with a burst of 50, with
  stale buckets swept automatically so the table cannot be grown by minting addresses.
- **Answers from outside are read up to a ceiling**: what a Docker host or the release server sends is
  capped, so a misbehaving endpoint cannot fill the server's memory.
- **Every request body is capped at 16 MiB** by a middleware that applies to every route, and
  individual handlers declare their own, much tighter, ceilings on top — the smaller of the two
  wins. Without the global cap, a handler that forgets would read whatever a caller cares to
  keep sending.
- **`TRUST_PROXY`**: Lastboard ignores `X-Forwarded-For` unless you say a proxy is in front. A
  proxy *appends* to that header rather than replacing it, so Lastboard reads the entry **your**
  proxy added — the rightmost — and not the one the caller sent. Reading the left-hand entry
  would let anyone pick their own identity and shake off the login lockout with a rotating
  header. With more than one proxy in the chain, set `TRUST_PROXY_HOPS`; if the count is higher
  than the real chain, Lastboard falls back to the connecting address, which is the safe
  failure.

## Data at rest and in flight

- **Everything lives in one SQLite file.** Foreign keys and a busy timeout are set in the
  connection string itself rather than with a one-off statement, so they apply to every
  connection in the pool and cascading deletes really cascade.
- **Locally stored icons.** An icon you pick is downloaded once, by your instance, and served
  from your own database from then on. Loading your dashboard therefore reports nothing to a
  CDN — neither your address nor, by way of the icons requested, which services you run. Boards
  built before this existed are brought in when the server starts, so this holds after an
  upgrade too rather than only for bookmarks made since. Stored icons are served with
  `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` and
  `nosniff`, so an SVG opened directly can't execute anything. See
  [Where icons are stored](../getting-started/bookmarks.md#where-icons-are-stored).
- **Credentials you enter** — a Docker agent token, an API widget key, a notification token —
  are stored with the thing that uses them and sent only to the address you configured.
- **XSS prevention**: user-submitted content (Markdown, notepad HTML) goes through a built-in
  sanitizer with an explicit allow-list of tags and attributes before it touches the DOM. No
  third-party sanitization library is involved.

## The Proxmox token

The Proxmox integration authenticates with **API tokens, never passwords**, and a token secret
is **write-only from the browser's side**: it is stored on the server and no endpoint ever sends
it back — not masked, not blanked, absent. A save that arrives without one keeps the secret
already stored, so editing anything else on a connection cannot lose its credential.

More than one hypervisor can be connected, and each is judged on its own: the addresses, the
names and the token ids are visible to the administrator alone — including **how many** there
are, which is reconnaissance in itself. Every other account learns only *whether* the
integration is on, which is all the top bar needs to decide whether to offer the page.

Starting and stopping machines is administrator-only and is refused unless the token of the
hypervisor **that machine is on** carries `VM.PowerMgmt` — asked of the host rather than
assumed, and asked per host, so a read-only token is never covered by a permissive one
elsewhere. The only actions Lastboard will relay are **start** and **shutdown of a machine**;
nothing addressed at a node, ever. See [Proxmox](../proxmox/overview.md).

An icon chosen for a machine is stored against the hypervisor's own generated id, and the id is
resolved on the server rather than believed: a browser cannot invent one and write a setting
nothing will ever read or prune.

## Running unprivileged

Lastboard can run as a non-root user via `PUID`/`PGID`. It defaults to root to avoid bind-mount
permission issues (common on Proxmox/LXC); when `PUID`/`PGID` are set, it fixes the
data-directory ownership automatically and then drops privileges **before serving any request**.
See [Configuration](../getting-started/configuration.md#puid--pgid-running-unprivileged).

> One consequence: an unprivileged process cannot replace its own binary, so the in-app updater
> is unavailable in that mode. Update with `docker compose pull` or by re-running the install
> script.

## Public demo mode

`DEMO_ONLY=true` turns the instance into a frontend-only demo: no authentication, no
persistence, and every response carries `X-Robots-Tag: noindex, nofollow` so a public demo does
not compete with the real site in search results. It is not a way to run a read-only instance
for real data — there is no data.

## Update Delivery

The web installer and in-app update mechanism communicate directly with our self-hosted Forgejo instance (`git.codigosh.com`). There are no intermediaries or third-party services involved in the update path.

- **No Tracking:** No IP addresses, user identifiers, or telemetry are collected at any point.
- **No Modification:** Release metadata and binaries are fetched directly from the official `CodigoSH/Lastboard` repository. Nothing is modified in transit.
- **Checksum Verification:** Every binary is verified against the line of the `checksums.txt` published with each release that **names that archive**, so one platform's archive cannot pass for another's. Mismatches abort the installation immediately. A download over the size limit is refused rather than cut short, each update works in a directory of its own, and only one runs at a time.
- **Signature Verification:** When release signing is enabled, `checksums.txt` is signed with an Ed25519 key whose public half is embedded in the binary. A missing or invalid signature aborts the update — a tampered mirror cannot strip the signature to fall back to a weaker check. See [Release Signing](release-signing.md).

## Reporting Vulnerabilities

If you discover a security vulnerability within this project, please contact us directly at **admin@codigosh.com**.

We ask that you do not report security vulnerabilities through public issue trackers to prevent zero-day exposure.
