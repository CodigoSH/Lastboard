import { describe, expect, test } from 'bun:test';
import {
    attentionCount, attentionList, bucketLatency, countByFilter, fillGaps, filterOutages, fleetTotals, groupRows, isSlow, lowestAvailability,
    outageTotals, passes, readRow, sortOutages, sortRows, stateOf, trendSeries, type Outage, type ServiceRow,
} from './monitorPage';

const row = (over: Partial<ServiceRow> & { name: string }): ServiceRow => readRow({
    item_id: Math.floor(Math.random() * 1e6), status: 'up', uptime_pct: 100, latency_ms: 100, avg_ms_24h: 100, url: `${over.name}.lan`, board: 'Casa', uptime_7d: 100, uptime_30d: 100, ...over,
});

describe('readRow', () => {
    test('a server from before the page fills the rest with "not known"', () => {
        const r = readRow({ item_id: 1, name: 'x', status: 'up', uptime_pct: 99, latency_ms: 10, heartbeat: [] });
        expect(r.url).toBe('');
        expect(r.uptime_7d).toBe(-1);
        expect(r.avg_ms_24h).toBeNull();
        expect(r.down_since).toBeNull();
        expect(r.status_code).toBe(0);
    });
    test('a status it does not know is "no data", not an invented one', () => {
        expect(readRow({ item_id: 1, status: 'weird' as never }).status).toBe('none');
    });
});

describe('what state a service is in', () => {
    test('answering at its usual pace is up', () => {
        expect(stateOf(row({ name: 'a' }))).toBe('up');
    });
    test('far above its own usual and by a margin worth noticing is slow', () => {
        expect(isSlow(row({ name: 'a', latency_ms: 1200, avg_ms_24h: 380 }))).toBe(true);
        expect(stateOf(row({ name: 'a', latency_ms: 1200, avg_ms_24h: 380 }))).toBe('slow');
    });
    test('tripling a tiny figure is not slow: 20 ms to 60 ms is nothing', () => {
        expect(isSlow(row({ name: 'a', latency_ms: 60, avg_ms_24h: 20 }))).toBe(false);
    });
    test('a margin alone is not slow either: a service that always takes seconds', () => {
        expect(isSlow(row({ name: 'a', latency_ms: 3100, avg_ms_24h: 3000 }))).toBe(false);
    });
    test('down is down and never slow; no data is no data', () => {
        expect(stateOf(row({ name: 'a', status: 'down', latency_ms: null }))).toBe('down');
        expect(stateOf(row({ name: 'a', status: 'none', latency_ms: null, avg_ms_24h: null }))).toBe('none');
    });
    test('without an average there is nothing to be slower than', () => {
        expect(isSlow(row({ name: 'a', latency_ms: 5000, avg_ms_24h: null }))).toBe(false);
    });
});

describe('fleetTotals', () => {
    const rows = [
        row({ name: 'a', uptime_pct: 100, uptime_7d: 100, uptime_30d: 100, latency_ms: 100, avg_ms_24h: 100 }),
        row({ name: 'b', latency_ms: 1300, avg_ms_24h: 300, uptime_pct: 98, uptime_7d: 99, uptime_30d: 99 }),
        row({ name: 'c', status: 'down', latency_ms: null, uptime_pct: 90, uptime_7d: 95, uptime_30d: 98 }),
        row({ name: 'd', status: 'none', latency_ms: null, avg_ms_24h: null, uptime_pct: -1, uptime_7d: -1, uptime_30d: -1 }),
    ];
    const t = fleetTotals(rows);

    test('counts every service once; slow ones also answer', () => {
        expect([t.total, t.up, t.slow, t.down, t.none]).toEqual([4, 2, 1, 1, 1]);
    });
    test('the means leave out what has no data, instead of counting it as 0 %', () => {
        expect(t.avail24).toBeCloseTo((100 + 98 + 90) / 3, 5);
        expect(t.avail7).toBeCloseTo((100 + 99 + 95) / 3, 5);
        expect(t.avail30).toBeCloseTo((100 + 99 + 98) / 3, 5);
    });
    test('the response is the answering services', () => {
        expect(t.latencyNow).toBe(700);
        expect(t.slowest?.name).toBe('b');
    });
    test('nothing to measure says so', () => {
        const none = fleetTotals([row({ name: 'x', status: 'none', latency_ms: null, avg_ms_24h: null, uptime_pct: -1 })]);
        expect(none.avail24).toBe(-1);
        expect(none.latencyNow).toBeNull();
        expect(none.slowest).toBeNull();
    });
});

describe('attention', () => {
    const rows = [
        row({ name: 'ok' }),
        row({ name: 'slowone', latency_ms: 1300, avg_ms_24h: 300 }),
        row({ name: 'dead', status: 'down', latency_ms: null }),
        row({ name: 'new', status: 'none', latency_ms: null, avg_ms_24h: null }),
    ];
    test('down first, then slow, then the ones never checked', () => {
        expect(attentionList(rows, 'background').map(a => `${a.kind}:${a.name}`)).toEqual(['down:dead', 'slow:slowone', 'none:new']);
    });
    test('when nothing is being recorded, the page says so, right after the services that are down', () => {
        expect(attentionList(rows, 'tab').map(a => a.kind)).toEqual(['down', 'off', 'slow', 'none']);
    });
    test('a service that has never been checked is a note, not a warning', () => {
        expect(attentionCount(attentionList(rows, 'background'))).toBe(2);
    });
    test('a healthy fleet with 24/7 on has nothing to say', () => {
        expect(attentionList([row({ name: 'a' })], 'background')).toEqual([]);
    });
});

describe('the inventory', () => {
    const rows = [
        row({ name: 'Plex', board: 'Media', uptime_pct: 99.9, latency_ms: 200 }),
        row({ name: 'Immich', board: 'Media', status: 'down', latency_ms: null, uptime_pct: 87 }),
        row({ name: 'Forgejo', board: 'Servidores', uptime_pct: 100, latency_ms: 90 }),
        row({ name: 'Blog', board: 'Web', status: 'none', latency_ms: null, uptime_pct: -1, avg_ms_24h: null }),
        row({ name: 'Orphan', board: '' }),
    ];
    test('search matches name, address and board', () => {
        expect(passes(rows[0], 'plex', 'all')).toBe(true);
        expect(passes(rows[0], 'plex.lan', 'all')).toBe(true);
        expect(passes(rows[0], 'media', 'all')).toBe(true);
        expect(passes(rows[0], 'nextcloud', 'all')).toBe(false);
    });
    test('the chips are the three states, and a slow service still counts as running', () => {
        const slow = row({ name: 's', latency_ms: 2000, avg_ms_24h: 300 });
        expect(passes(slow, '', 'up')).toBe(true);
        expect(passes(rows[1], '', 'down')).toBe(true);
        expect(passes(rows[3], '', 'none')).toBe(true);
        expect(passes(rows[1], '', 'up')).toBe(false);
    });
    test('counts for the chips', () => {
        expect(countByFilter(rows)).toEqual({ all: 5, up: 3, down: 1, none: 1 });
    });
    test('by state: down first, then running, then no data; ties by name', () => {
        expect(sortRows(rows, 'state').map(r => r.name)).toEqual(['Immich', 'Forgejo', 'Orphan', 'Plex', 'Blog']);
    });
    test('by availability the least available goes first and no data goes last', () => {
        expect(sortRows(rows, 'uptime').map(r => r.name)).toEqual(['Immich', 'Plex', 'Forgejo', 'Orphan', 'Blog']);
    });
    test('by response the slowest first; one that did not answer goes last', () => {
        const names = sortRows(rows, 'response').map(r => r.name);
        expect(names[0]).toBe('Plex');
        expect(names.slice(-2).sort()).toEqual(['Blog', 'Immich']);
    });
    test('sorting does not touch what it was given', () => {
        const copy = rows.map(r => r.name);
        sortRows(rows, 'name');
        expect(rows.map(r => r.name)).toEqual(copy);
    });
    test('grouping by board keeps the order of appearance and puts the board-less last', () => {
        expect(groupRows(rows, true).map(g => g.name)).toEqual(['Media', 'Servidores', 'Web', '']);
        expect(groupRows(rows, false)).toHaveLength(1);
    });
    test('the lowest availability leaves out what has no data', () => {
        expect(lowestAvailability(rows.map(r => ({ ...r, uptime_30d: r.uptime_pct })), 2).map(r => r.name)).toEqual(['Immich', 'Plex']);
    });
});

describe('outages', () => {
    const list: Outage[] = [
        { start: 's1', end: null, duration_sec: 1680, status_code: 502 },
        { start: 's2', end: 'e2', duration_sec: 1200, status_code: 503 },
        { start: 's3', end: 'e3', duration_sec: 600, status_code: 0 },
    ];
    test('totals: the ongoing one counts in the time without service, not in the recovery', () => {
        const t = outageTotals(list);
        expect([t.count, t.ongoing, t.recovered]).toEqual([3, 1, 2]);
        expect(t.downSec).toBe(3480);
        expect(t.meanRecoverySec).toBe(900);
    });
    test('with nothing recovered there is no mean to give', () => {
        expect(outageTotals([list[0]]).meanRecoverySec).toBeNull();
        expect(outageTotals([]).count).toBe(0);
    });
    test('the filters', () => {
        expect(filterOutages(list, 'ongoing')).toHaveLength(1);
        expect(filterOutages(list, 'recovered')).toHaveLength(2);
        expect(filterOutages(list, 'all')).toHaveLength(3);
    });
});

describe('series', () => {
    test('a bucket where nothing answered repeats the one before, never drops to zero', () => {
        expect(fillGaps([null, 10, null, null, 30, null])).toEqual([10, 10, 10, 10, 30, 30]);
    });
    test('with nothing answering anywhere there is nothing to draw', () => {
        expect(fillGaps([null, null])).toEqual([]);
        expect(trendSeries([{ at: '2026-01-01T00:00:00Z', mean_ms: null, max_ms: null, uptime_pct: null }])).toEqual({ mean: [], max: [], at: [] });
    });
    test('the fleet series carries the time of every bucket', () => {
        const s = trendSeries([
            { at: '2026-01-01T00:00:00Z', mean_ms: 100, max_ms: 300, uptime_pct: 100 },
            { at: '2026-01-01T01:00:00Z', mean_ms: null, max_ms: null, uptime_pct: 0 },
        ]);
        expect(s.mean).toEqual([100, 100]);
        expect(s.max).toEqual([300, 300]);
        expect(s.at[1] - s.at[0]).toBe(3600000);
    });
    test('one service: the checks fold into buckets, only those that answered count', () => {
        const t0 = Date.parse('2026-01-01T00:00:00Z');
        const at = (m: number) => new Date(t0 + m * 60000).toISOString();
        const r = bucketLatency([
            { checked_at: at(1), up: true, latency_ms: 100, status_code: 200 },
            { checked_at: at(2), up: true, latency_ms: 300, status_code: 200 },
            { checked_at: at(3), up: false, latency_ms: null, status_code: 502 },
            { checked_at: at(12), up: true, latency_ms: 50, status_code: 200 },
        ], t0, t0 + 20 * 60000, 2);
        expect(r.values).toEqual([200, 50]);
        expect(r.at).toEqual([t0, t0 + 10 * 60000]);
    });
    test('a check outside the window is ignored, and an empty one draws nothing', () => {
        const t0 = Date.parse('2026-01-01T00:00:00Z');
        expect(bucketLatency([{ checked_at: new Date(t0 - 60000).toISOString(), up: true, latency_ms: 9, status_code: 200 }], t0, t0 + 1000, 4)).toEqual({ values: [], at: [] });
    });
});

describe('sortOutages', () => {
    const o = (start: string, end: string | null) => ({ start, end });
    test('what is down now first, then the newest to the oldest, without touching the list given', () => {
        const list = [o('2026-01-01T00:00:00Z', 'x'), o('2026-01-03T00:00:00Z', 'x'), o('2026-01-02T00:00:00Z', null), o('2026-01-04T00:00:00Z', 'x')];
        const copy = [...list];
        expect(sortOutages(list).map(x => x.start.slice(8, 10))).toEqual(['02', '04', '03', '01']);
        expect(list).toEqual(copy);
    });
});

describe('a service that went down inside the day', () => {
    const r = (over: Partial<Parameters<typeof readRow>[0]>) => readRow({ item_id: 1, name: 'Plex', status: 'up', uptime_pct: 100, latency_ms: 100, avg_ms_24h: 100, url: 'u', board: 'b', uptime_7d: 100, uptime_30d: 100, heartbeat: [], ...over } as never);
    test('is listed when it answers now but its 24-hour availability is under 99 %, after the ones still in trouble', () => {
        const rows = [r({ item_id: 1, name: 'Steady', uptime_pct: 100 }), r({ item_id: 2, name: 'Flaky', uptime_pct: 93.8 }), r({ item_id: 3, name: 'Edge', uptime_pct: 99 }),
            r({ item_id: 4, name: 'Gone', status: 'down', latency_ms: null, uptime_pct: 80 }), r({ item_id: 5, name: 'New', status: 'none', uptime_pct: -1, latency_ms: null })];
        expect(attentionList(rows, 'background').map(a => `${a.name}:${a.kind}`)).toEqual(['Gone:down', 'Flaky:unstable', 'New:none']);
    });
    test('it counts as a warning, and a slow one is listed once, as slow', () => {
        const slow = r({ item_id: 6, name: 'Slow', uptime_pct: 90, latency_ms: 2000, avg_ms_24h: 100 });
        const l = attentionList([r({ item_id: 2, name: 'Flaky', uptime_pct: 95 }), slow], 'background');
        expect(l.map(a => a.kind)).toEqual(['slow', 'unstable']);
        expect(attentionCount(l)).toBe(2);
    });
});
