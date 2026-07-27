# API Widget

The API widget turns any JSON HTTP endpoint into a live tile on your dashboard. Point it at a service's API, tell it which values to show, and it keeps them refreshed — no plugin per service, no code.

![API Widget](../assets/w-api.png)

## Description

Most self-hosted apps expose a JSON API. The API widget fetches one and renders selected fields, either as **big metric numbers** or as a **scrolling list**. The request runs **on the Lastboard server**, not in your browser — so it can reach services on private IPs and accept self-signed certificates, which a browser can't do because of CORS and network isolation.

Typical uses: AdGuard blocked-queries, Paperless document counts, Immich photo/video totals, Sonarr/Radarr queue size, a Forgejo repo list, and anything else with a JSON endpoint.

## Two Ways to Configure It

When you add an API widget, its configuration offers two approaches:

### 1. Service preset (guided)

Pick a known service from the list and you only fill **one or two fields** — usually the base URL and an API key or token. Lastboard composes the full request (endpoint path, auth header, field mappings) for you.

| Field | Example |
| :--- | :--- |
| **Base URL** | `http://10.0.0.5:8000` (host and port, no trailing path) |
| **Credential** | An API key, token, or `user:password`, depending on the service |

### 2. Advanced (manual)

Full control for any endpoint that has no preset. Set the **Service** selector to *Advanced (custom)* and configure the request yourself.

![API widget configuration](../assets/w-api-conf.png)

| Field | Description |
| :--- | :--- |
| **Endpoint URL** | The full endpoint, including path and any query string. `http://` or `https://`. |
| **Method** | `GET` (default), `POST`, or `HEAD`. |
| **Headers** | Custom request headers, **one per line** as `Name: value` — typically for authentication (e.g. `Authorization: Bearer …` or `X-Api-Key: …`). |
| **List array** *(optional)* | A path to an array in the response. Fill it to render a **list**; leave it empty for **metrics**. See [Display Modes](#display-modes). |
| **Fields** | The values to show, **one per line** — see [Field Mappings](#field-mappings). |
| **Refresh** | How often to re-fetch (minimum **15s**). |

> Services that authenticate with a login session rather than a token or API key (for example qBittorrent, Deluge, or UniFi) are not offered as presets and must be configured in Advanced mode if their API supports header/token auth.

## Display Modes

### Metric mode (default)

Each mapping becomes a large number with a caption. Great for counts and totals. If you map two or three fields, they sit side by side.

### List mode

Set an **array path** — the location of a JSON array in the response (e.g. `data`, `response.results`). The widget renders one **row per array item**, and each mapping becomes a **column** within the row. The first column is emphasized as the primary label. Up to **50 rows** are shown, scrolling if needed.

## Field Mappings

The **Fields** box holds one mapping per line, in the form:

```
Label = path | format
```

- **Label** — the caption shown under a metric, or the column heading in a list. In list mode the label can be left empty (write `= path`).
- **Path** — where the value lives in the JSON, using dot and bracket notation:
  - `num_dns_queries` — a top-level field
  - `queue.speed` — a nested field
  - `response.data.stream_count` — deeper nesting
  - `results[0].title` — the first element of an array

  In **metric mode** the path is read from the whole response. In **list mode** it is read from **each array item**, relative to that item.
- **`| format`** *(optional)* — how the raw value is displayed:

| Format | Effect | Example |
| :--- | :--- | :--- |
| *(omit)* | Shown as-is | `online` |
| `\| number` | Thousands separators | `1,240,533` |
| `\| bytes` | Human-readable size | `4.2 GB` |
| `\| percent` | Rounded percentage | `73%` |

Example:

```
Queries = num_dns_queries | number
Blocked = num_blocked_filtering | number
```

A missing value renders as `—`.

## Supported Service Presets

Presets fill in the endpoint and authentication for you. Items marked *(beta)* are provided on a best-effort basis and may need tweaking for your version.

| Service | Category | Credential | Shows |
| :--- | :--- | :--- | :--- |
| **AdGuard Home** | Network | `user:password` | DNS queries, blocked |
| **Paperless-ngx** | Files | API token | Documents, inbox |
| **Immich** | Media | API key | Photos, videos |
| **Jellyfin** | Media | API key | Movies, series |
| **Sonarr** | Media | API key | Queue size |
| **Radarr** | Media | API key | Queue size |
| **SABnzbd** | Downloads | API key | Queue, speed |
| **Tautulli** | Media | API key | Active streams |
| **Forgejo / Gitea** | Dev | Access token | Repository list |
| **Speedtest Tracker** *(beta)* | Network | Bearer token | Download, upload |
| **Nextcloud** *(beta)* | Files | `user:password` | Files, free space |

> Where to find the credential varies per service — usually under Settings → API / Access Tokens. For AdGuard and Nextcloud, use the same username and password you log in with.

## How the Fetch Works

- **Server-side.** Lastboard's backend makes the request, so the target can be a **private IP** (`10.x`, `192.168.x`, `.local`) unreachable from your browser.
- **Self-signed certificates are accepted.** Internal HTTPS services with their own certificate work without extra setup.
- **Limits.** Each request times out after **8 seconds** and reads at most **512 KiB** of the response. Keep endpoints lightweight (many APIs accept a `limit` or `pageSize` query parameter).
- **Failure is graceful.** If the service is down or the request fails, the tile shows an **Unreachable** state instead of an error, and retries on the next refresh.

> **Security note:** Reaching private IPs and skipping TLS verification are intentional for a self-hosted, single-tenant instance. Any credential you enter is stored with the widget's configuration and sent only to the URL you configured.

## Troubleshooting

| Symptom | Likely cause |
| :--- | :--- |
| **Unreachable** | Wrong host/port, service down, or the credential is missing/invalid. Confirm the URL works with `curl` from the Lastboard host. |
| **All values show `—`** | The **path** doesn't match the JSON. Check the real response shape and adjust the path. |
| **Empty list** | The **array path** doesn't point at an array, or the array is empty. |
| **A number looks wrong** | The field isn't numeric — remove the **Number/Bytes/Percent** format, or pick the correct one. |
