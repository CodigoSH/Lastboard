/**
 * Synthetic values for the API widget in the demo.
 *
 * The demo has no backend, so `/api/widget/api-fetch` has nowhere to go: the
 * widget would sit there reporting a failed request, which is a poor advert for
 * a widget whose whole point is showing live numbers.
 *
 * Values are derived from the requested path and the clock, so they climb
 * slowly rather than jumping about between refreshes, and a reload shows the
 * same figures a visitor saw a moment ago.
 *
 * Pure module on purpose — no window, no storage, no i18n — so it can be tested
 * directly, like demoMonitor.
 */

/**
 * Counters the demo's own widgets ask for, with a believable starting point and
 * how fast each one climbs per minute. Anything not listed still gets a stable
 * number, so a visitor who configures their own widget sees it working too.
 */
const SERIES: Record<string, { base: number; perMinute: number }> = {
    // AdGuard Home — the demo's network tile.
    num_dns_queries: { base: 184_320, perMinute: 47 },
    num_blocked_filtering: { base: 23_871, perMinute: 9 },
};

/**
 * Arrays, for the widget's list view. The demo had only ever shown its metric
 * view, so a visitor had no way to see that the same widget can render rows.
 */
const LISTS: Record<string, unknown[]> = {
    records: [
        { title: 'Cosmos — S02E04', status: 'downloading' },
        { title: 'The Blue Planet — S01E08', status: 'downloading' },
        { title: 'Chef’s Table — S06E02', status: 'queued' },
        { title: 'Formula 1 — Round 12', status: 'queued' },
        { title: 'Planet Earth III — S01E05', status: 'queued' },
    ],
};

/** Minutes elapsed in the current day — the clock the counters run on. */
function minuteOfDay(now: number): number {
    const d = new Date(now);
    return d.getHours() * 60 + d.getMinutes();
}

/** Small stable number for a path we have no series for. */
function stableFallback(path: string): number {
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = (hash * 31 + path.charCodeAt(i)) % 9973;
    }
    return hash % 500;
}

/**
 * Answers a widget's request for a set of field paths.
 *
 * Mirrors what the real endpoint returns: a map from the path asked for to the
 * value found. A path we don't recognise gets a number rather than nothing —
 * an empty answer would render as a dash and look broken.
 */
export function demoApiValues(paths: string[], now: number = Date.now()): Record<string, unknown> {
    const minutes = minuteOfDay(now);
    const values: Record<string, unknown> = {};

    for (const path of paths) {
        if (!path) continue;
        if (LISTS[path]) {
            values[path] = LISTS[path];
            continue;
        }
        const series = SERIES[path];
        values[path] = series
            ? series.base + series.perMinute * minutes
            : stableFallback(path);
    }
    return values;
}

/**
 * The one session the demo has: the visitor's own, so the "Active sessions"
 * card has something to show. Closing it does nothing, there is nobody to
 * sign out.
 */
export function demoSessions(now: number = Date.now()): Array<{
    id: number; current: boolean; created_at: string; last_seen: string; expires_at: string;
    remember: boolean; user_agent: string; ip: string;
}> {
    return [{
        id: 1,
        current: true,
        created_at: new Date(now - 3600_000).toISOString(),
        last_seen: new Date(now).toISOString(),
        expires_at: new Date(now + 30 * 86400_000).toISOString(),
        remember: false,
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
        ip: '192.168.1.20',
    }];
}
