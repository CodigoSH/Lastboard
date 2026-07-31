import { describe, expect, test } from 'bun:test';
import {
    generateChecks, summarize, beats, buildHistory, buildOverviewRow, isCurrentlyDown,
} from './demoMonitor';

// Fixed clock so the generated windows are reproducible.
const NOW = Date.parse('2026-07-31T12:00:00.000Z');

describe('generateChecks', () => {
    test('covers the requested window oldest-first', () => {
        const checks = generateChecks(1, 'Jellyfin', '24h', NOW);
        expect(checks.length).toBe(288); // 24h at one check every 5 minutes

        const first = Date.parse(checks[0].checked_at);
        const last = Date.parse(checks[checks.length - 1].checked_at);
        expect(last).toBeGreaterThan(first);
        expect(last).toBeLessThanOrEqual(NOW);
        expect((last - first) / 3600000).toBeCloseTo(23.9, 1);
    });

    test('is deterministic for the same item and clock', () => {
        expect(generateChecks(3, 'Plex', '24h', NOW)).toEqual(generateChecks(3, 'Plex', '24h', NOW));
    });

    test('gives different services different latencies', () => {
        const kuma = generateChecks(1, 'Uptime Kuma', '24h', NOW).at(-1)!.latency_ms!;
        const nextcloud = generateChecks(2, 'Nextcloud', '24h', NOW).at(-1)!.latency_ms!;
        expect(kuma).toBeLessThan(nextcloud);
    });

    test('reports no latency and no status code while down', () => {
        const down = generateChecks(9, 'Pi-hole', '24h', NOW).filter(c => !c.up);
        expect(down.length).toBeGreaterThan(0);
        for (const c of down) {
            expect(c.latency_ms).toBeNull();
            expect(c.status_code).toBe(0);
        }
    });

    test('falls back to the 24h window for an unknown range', () => {
        expect(generateChecks(1, 'Plex', 'nonsense', NOW).length)
            .toBe(generateChecks(1, 'Plex', '24h', NOW).length);
    });
});

describe('summarize', () => {
    const at = (minutesAgo: number) => new Date(NOW - minutesAgo * 60000).toISOString();
    const check = (minutesAgo: number, up: boolean) => ({
        checked_at: at(minutesAgo), up, latency_ms: up ? 50 : null, status_code: up ? 200 : 0,
    });

    test('returns -1 uptime with no data', () => {
        expect(summarize([], NOW)).toEqual({ uptimePct: -1, incidents: [] });
    });

    test('computes uptime and closes a recovered outage', () => {
        const checks = [check(40, true), check(30, false), check(20, false), check(10, true)];
        const { uptimePct, incidents } = summarize(checks, NOW);

        expect(uptimePct).toBe(50);
        expect(incidents.length).toBe(1);
        expect(incidents[0].start).toBe(at(30));
        expect(incidents[0].end).toBe(at(10));
        expect(incidents[0].duration_sec).toBe(20 * 60);
    });

    test('leaves an ongoing outage open and measures it up to now', () => {
        const { incidents } = summarize([check(30, true), check(10, false)], NOW);
        expect(incidents.length).toBe(1);
        expect(incidents[0].end).toBeNull();
        expect(incidents[0].duration_sec).toBe(10 * 60);
    });
});

describe('beats', () => {
    test('keeps the most recent n, oldest first', () => {
        const checks = generateChecks(1, 'Plex', '24h', NOW);
        const strip = beats(checks, 30);

        expect(strip.length).toBe(30);
        expect(strip[strip.length - 1].at).toBe(checks[checks.length - 1].checked_at);
        expect(['up', 'down']).toContain(strip[0].status);
    });

    test('returns everything when there are fewer checks than n', () => {
        expect(beats(generateChecks(1, 'Plex', '24h', NOW).slice(0, 5), 30).length).toBe(5);
    });
});

describe('buildHistory', () => {
    test('exposes the full payload the detail view reads', () => {
        const h = buildHistory(4, 'Nextcloud', '24h', NOW);

        expect(h.range).toBe('24h');
        expect(h.total).toBe(h.checks.length);
        expect(h.current).toEqual(h.checks[h.checks.length - 1]);
        expect(h.heartbeat.length).toBe(40);
        expect(h.stats.uptime_24h).toBeGreaterThan(0);
        expect(h.stats.avg_ms_24h).toBeGreaterThan(0);
    });

    test('shows a curated service with realistic, not perfect, uptime', () => {
        const h = buildHistory(4, 'Nextcloud', '24h', NOW);
        expect(h.uptime_pct).toBeLessThan(100);
        expect(h.uptime_pct).toBeGreaterThan(95);
        expect(h.incidents.length).toBeGreaterThan(0);
    });

    test('keeps a flawless service at 100% with no incidents', () => {
        const h = buildHistory(5, 'Uptime Kuma', '7d', NOW);
        expect(h.uptime_pct).toBe(100);
        expect(h.incidents).toEqual([]);
    });
});

describe('buildOverviewRow', () => {
    test('reports a service in an ongoing outage as down', () => {
        const row = buildOverviewRow(7, 'Pi-hole', NOW);
        expect(row.status).toBe('down');
        expect(row.latency_ms).toBeNull();
        expect(row.heartbeat.length).toBe(30);
    });

    test('reports a healthy service as up with latency', () => {
        const row = buildOverviewRow(8, 'Jellyfin', NOW);
        expect(row.status).toBe('up');
        expect(row.latency_ms).toBeGreaterThan(0);
        expect(row.uptime_pct).toBe(100);
    });
});

describe('isCurrentlyDown', () => {
    test('matches the status the overview reports', () => {
        expect(isCurrentlyDown(7, 'Pi-hole')).toBe(true);
        expect(isCurrentlyDown(8, 'Jellyfin')).toBe(false);
    });

    test('treats an unknown bookmark as healthy', () => {
        expect(isCurrentlyDown(99, 'Something the visitor added')).toBe(false);
    });
});
