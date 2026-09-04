**Security and correctness fixes**

A maintenance release. Everything below applies to an existing installation the
moment it updates — no configuration changes, no migration steps.

### Fixed

Security:

- **The login lockout could be evaded behind a reverse proxy.** A proxy appends
  to `X-Forwarded-For` rather than replacing it, so the leftmost entry is
  written by whoever is calling. Lastboard read that one, which let an attacker
  hand themselves a fresh address on every attempt and never trip the five-try
  lockout. It now reads the entry your own proxy added. If requests reach
  Lastboard through more than one proxy, set `TRUST_PROXY_HOPS`.
- **A request for a missing file under `/dist/` or `/styles/` returned the
  application shell without a session.** Authentication no longer exempts
  anything by path prefix.
- **The monitoring notification URL and token were readable by any account.**
  They are the administrator's credentials for their own alert channel; only an
  administrator receives them now.
- **The instance metadata service is refused** on every URL the server fetches
  for you, including the background monitor. Pointing widgets and bookmarks at
  your own network is unchanged — that is what Lastboard is for.
- **The API widget no longer forwards headers that impersonate the caller**
  (`Cookie`, the `X-Forwarded-*` family). API keys and every preset still work.
- Logging in and first-run setup now refuse writes the browser reports as coming
  from another site, and the WebSocket honours a forwarded host only when
  `TRUST_PROXY` says there is a proxy in front.
- Request bodies are capped everywhere, the address table behind rate limiting
  can no longer grow without bound, and the release key is now a list so it can
  be rotated without stranding installations that are behind.

Reliability:

- **Shutting down no longer cuts background work off mid-write.** A restart could
  previously interrupt the icon migration or the monitor while it was writing.
- A handler that panics now answers with an error instead of dropping the
  connection with no status.
- Lastboard refuses to open a database written by a newer version, rather than
  migrating it downwards.
- Settings that cannot be read are reported at startup: `TRUST_PROXY=True`, with
  a capital letter, silently meant the opposite of what it looked like.

Languages:

- **Right-to-left languages are laid out right to left.** Arabic, Persian and
  Urdu were translated but rendered left to right.
- The page now declares the language it is actually in, which is what a screen
  reader announces and what the browser hyphenates by. It always said English.
- Dates and numbers are formatted in the language you chose, not the browser's,
  and values inserted into a sentence keep their punctuation in place.

### Changed

- **Releases are reproducible.** Two builds of the same source now produce
  identical binaries, so anyone can rebuild a release and compare it against the
  published checksums. The recipe is in the security documentation.
- The Docker and monitoring widgets refresh their list instead of rebuilding
  themselves on every tick, so an open popup stays open and a scrolled list stays
  where you left it.
- Bookmark health checks are probed in bounded batches rather than all at once.
