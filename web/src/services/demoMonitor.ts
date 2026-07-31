/**
 * Synthetic monitoring data for the demo.
 *
 * The demo has no backend, so the monitoring endpoints are served from here.
 * Everything is generated deterministically from the item id and the current
 * time: the same bookmark always looks the same, latency drifts organically
 * instead of flickering, and a couple of services carry real outages so the
 * status page shows something worth looking at.
 *
 * Pure module on purpose — no localStorage, no window, no i18n — so it can be
 * unit tested and reused by both the history and the overview endpoints.
 */

export interface DemoCheck {
    checked_at: string;
    up: boolean;
    latency_ms: number | null;
    status_code: number;
}

export interface DemoIncident {
    start: string;
    end: string | null;
    duration_sec: number;
}

export interface DemoBeat {
    status: string;
    at: string;
}

export interface DemoStats {
    avg_ms_24h: number | null;
    uptime_24h: number;
    uptime_7d: number;
    uptime_30d: number;
}

export interface DemoHistory {
    range: string;
    current: DemoCheck | null;
    uptime_pct: number;
    total: number;
    checks: DemoCheck[];
    incidents: DemoIncident[];
    heartbeat: DemoBeat[];
    stats: DemoStats;
}

export interface DemoOverviewRow {
    item_id: number;
    name: string;
    status: string;
    uptime_pct: number;
    latency_ms: number | null;
    heartbeat: DemoBeat[];
}

/** An outage: it began `startMinAgo` minutes ago and lasted `durationMin`. */
interface Outage {
    startMinAgo: number;
    durationMin: number;
}

interface Profile {
    baseMs: number;
    jitterMs: number;
    outages: Outage[];
}

const HOUR = 60;
const DAY = 24 * HOUR;

/**
 * Hand-tuned profiles for the seeded demo bookmarks, keyed by their label.
 * The mix is deliberate: one flawless service, several with past outages, and
 * one that is down right now — a flat 100% everywhere would show nothing.
 */
const PROFILES: Record<string, Profile> = {
    'Plex': {
        baseMs: 186, jitterMs: 55,
        outages: [{ startMinAgo: 9 * HOUR, durationMin: 6 }],
    },
    'Jellyfin': {
        baseMs: 94, jitterMs: 28,
        outages: [{ startMinAgo: 3 * DAY, durationMin: 22 }],
    },
    'Nextcloud': {
        baseMs: 242, jitterMs: 85,
        outages: [
            { startMinAgo: 5 * HOUR, durationMin: 5 },
            { startMinAgo: 26 * HOUR, durationMin: 45 },
        ],
    },
    'Uptime Kuma': {
        baseMs: 42, jitterMs: 12,
        outages: [],
    },
    'Proxmox': {
        baseMs: 58, jitterMs: 18,
        outages: [{ startMinAgo: 19 * HOUR, durationMin: 12 }],
    },
    'Pi-hole': {
        // Down right now: an ongoing outage, long enough to be visible in the
        // uptime figure and not just as a single red beat.
        baseMs: 36, jitterMs: 10,
        outages: [
            { startMinAgo: 26, durationMin: 26 },
            { startMinAgo: 4 * DAY, durationMin: 31 },
        ],
    },
    'Grafana': {
        baseMs: 128, jitterMs: 40,
        outages: [{ startMinAgo: 2 * HOUR, durationMin: 8 }],
    },
};

/** Sampling cadence per range, kept coarse on wide windows to stay light. */
const STEP_SEC: Record<string, number> = { '24h': 300, '7d': 900, '30d': 1800 };
const SPAN_SEC: Record<string, number> = { '24h': 86400, '7d': 604800, '30d': 2592000 };

export const DEMO_RANGES = ['24h', '7d', '30d'];

/** Deterministic [0,1) noise — same seed, same value, no global state. */
function noise(seed: number): number {
    let t = (seed + 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Profile for a bookmark. Seeded demo services get their curated one; anything
 * the visitor marks for status checking gets a healthy profile with a latency
 * derived from its id, so it still looks alive.
 */
function profileFor(label: string, itemId: number): Profile {
    const known = PROFILES[label];
    if (known) return known;
    return { baseMs: 70 + Math.round(noise(itemId) * 180), jitterMs: 30, outages: [] };
}

/**
 * Whether a check that old falls inside an outage. The window is closed at both
 * ends so an outage reaching the present (startMinAgo === durationMin) still
 * covers the latest check — that is what "down right now" means here.
 */
function isDown(minutesAgo: number, outages: Outage[]): boolean {
    return outages.some(o => minutesAgo <= o.startMinAgo && minutesAgo >= o.startMinAgo - o.durationMin);
}

/**
 * Builds the check series for one item over a range, oldest first. Timestamps
 * are snapped to the sampling grid so repeated calls return stable data and the
 * detail view only re-renders when a new check would really have landed.
 */
export function generateChecks(itemId: number, label: string, range: string, now: number): DemoCheck[] {
    const step = STEP_SEC[range] ?? STEP_SEC['24h'];
    const span = SPAN_SEC[range] ?? SPAN_SEC['24h'];
    const profile = profileFor(label, itemId);

    const stepMs = step * 1000;
    const end = Math.floor(now / stepMs) * stepMs;
    const count = Math.floor(span / step);

    const checks: DemoCheck[] = [];
    for (let i = 0; i < count; i++) {
        const ts = end - (count - 1 - i) * stepMs;
        const minutesAgo = (now - ts) / 60000;
        const bucket = Math.floor(ts / stepMs);

        if (isDown(minutesAgo, profile.outages)) {
            checks.push({
                checked_at: new Date(ts).toISOString(),
                up: false,
                latency_ms: null,
                status_code: 0,
            });
            continue;
        }

        // A slow wave plus per-check jitter: reads as a living service rather
        // than noise around a flat line.
        const wave = 1 + 0.18 * Math.sin(bucket / 9 + itemId);
        const jitter = (noise(bucket * 31 + itemId) * 2 - 1) * profile.jitterMs;
        const spike = noise(bucket * 17 + itemId * 7) > 0.97 ? profile.baseMs * 0.9 : 0;
        const latency = Math.max(8, Math.round(profile.baseMs * wave + jitter + spike));

        checks.push({
            checked_at: new Date(ts).toISOString(),
            up: true,
            latency_ms: latency,
            status_code: 200,
        });
    }
    return checks;
}

/**
 * Uptime percentage and outage list for a series, oldest first. Mirrors the
 * backend's summary so the demo and a real install read identically.
 */
export function summarize(checks: DemoCheck[], now: number): { uptimePct: number; incidents: DemoIncident[] } {
    if (!checks.length) return { uptimePct: -1, incidents: [] };

    let up = 0;
    let start: string | null = null;
    const incidents: DemoIncident[] = [];

    for (const c of checks) {
        if (c.up) {
            up++;
            if (start !== null) {
                incidents.push({
                    start,
                    end: c.checked_at,
                    duration_sec: Math.round((Date.parse(c.checked_at) - Date.parse(start)) / 1000),
                });
                start = null;
            }
        } else if (start === null) {
            start = c.checked_at;
        }
    }
    if (start !== null) {
        incidents.push({
            start,
            end: null,
            duration_sec: Math.round((now - Date.parse(start)) / 1000),
        });
    }

    return { uptimePct: (up / checks.length) * 100, incidents };
}

/** The most recent `n` checks as heartbeat beats, oldest first. */
export function beats(checks: DemoCheck[], n: number): DemoBeat[] {
    return checks.slice(Math.max(0, checks.length - n)).map(c => ({
        status: c.up ? 'up' : 'down',
        at: c.checked_at,
    }));
}

function uptimeOf(checks: DemoCheck[]): number {
    if (!checks.length) return -1;
    return (checks.filter(c => c.up).length / checks.length) * 100;
}

/** Fixed-window figures for the detail stat cards, independent of the chart range. */
export function buildStats(itemId: number, label: string, now: number): DemoStats {
    const day = generateChecks(itemId, label, '24h', now);
    const upDay = day.filter(c => c.up && c.latency_ms != null);
    const avg = upDay.length
        ? Math.round(upDay.reduce((sum, c) => sum + (c.latency_ms || 0), 0) / upDay.length)
        : null;

    return {
        avg_ms_24h: avg,
        uptime_24h: uptimeOf(day),
        uptime_7d: uptimeOf(generateChecks(itemId, label, '7d', now)),
        uptime_30d: uptimeOf(generateChecks(itemId, label, '30d', now)),
    };
}

/** Full history payload for one item — the shape GET /api/monitor/history returns. */
export function buildHistory(itemId: number, label: string, range: string, now: number): DemoHistory {
    const name = label || `#${itemId}`;
    const normalized = DEMO_RANGES.includes(range) ? range : '24h';
    const checks = generateChecks(itemId, name, normalized, now);
    const { uptimePct, incidents } = summarize(checks, now);

    return {
        range: normalized,
        current: checks.length ? checks[checks.length - 1] : null,
        uptime_pct: uptimePct,
        total: checks.length,
        checks,
        incidents,
        heartbeat: beats(checks, 40),
        stats: buildStats(itemId, name, now),
    };
}

/** One status-page row per monitored bookmark — the shape GET /api/monitor/overview returns. */
export function buildOverviewRow(itemId: number, label: string, now: number): DemoOverviewRow {
    const checks = generateChecks(itemId, label, '24h', now);
    const { uptimePct } = summarize(checks, now);
    const last = checks.length ? checks[checks.length - 1] : null;

    return {
        item_id: itemId,
        name: label,
        status: last ? (last.up ? 'up' : 'down') : 'none',
        uptime_pct: uptimePct,
        latency_ms: last ? last.latency_ms : null,
        heartbeat: beats(checks, 30),
    };
}

/** True when the service is currently in an outage — keeps the grid dots honest. */
export function isCurrentlyDown(itemId: number, label: string): boolean {
    const profile = profileFor(label, itemId);
    return isDown(0, profile.outages);
}
