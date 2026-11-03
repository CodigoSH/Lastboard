import { describe, expect, test } from 'bun:test';
import { beatsHtml, BEATS, monitorShell, readItemConfig, type MonitorShellInput, type WRow } from './monitorWidget';

const row = (over: Partial<WRow> = {}): WRow => ({ item_id: 1, name: 'Plex', status: 'up', uptime_pct: 99.9, latency_ms: 42, heartbeat: [], icon: 'plex', ...over });
const input = (rows: WRow[], over: Partial<MonitorShellInput> = {}): MonitorShellInput => ({
    rows, items: [], itemOrder: [], itemConfig: {}, showAll: true, showSummary: true, resolveIcon: i => `/icons/${i}`, t: k => `[${k}]`, num: n => String(n), time: s => s, ...over,
});

describe('the Monitoring widget says', () => {
    test('a service with its icon, its latency, its uptime and the strip of its last readings', () => {
        const spec = monitorShell(input([row()]));
        const r = spec.rows[0];
        expect(r.sel).toBe('1');
        expect(r.face).toBe('/icons/plex');
        expect(r.metrics.map(m => m.text)).toEqual(['42 ms', '100%']);
        expect(r.extra).toContain('sh-beats');
        expect(r.tone).toBe('ok');
    });
    test('the icon set here wins over the bookmark\'s, by the service\'s id; the name is always the bookmark\'s', () => {
        const spec = monitorShell(input([row()], { itemConfig: { '1': { icon: 'film' } } }));
        expect(spec.rows[0].face).toBe('/icons/film');
        expect(spec.rows[0].name).toBe('Plex');
        const other = monitorShell(input([row({ item_id: 2 })], { itemConfig: { '1': { icon: 'film' } } }));
        expect(other.rows[0].face).toBe('/icons/plex');
    });
    test('a service that is down is red, one never checked is grey and has no readings', () => {
        const spec = monitorShell(input([row({ item_id: 1, status: 'down' }), row({ item_id: 2, status: 'none', uptime_pct: -1, latency_ms: null })]));
        expect(spec.rows[0].tone).toBe('bad');
        expect(spec.rows[1].tone).toBe('off');
        expect(spec.rows[1].metrics).toEqual([]);
    });
    test('uptime is read the other way round from a resource: low is the bad end', () => {
        const spec = monitorShell(input([row({ uptime_pct: 99.5 }), row({ item_id: 2, uptime_pct: 96 }), row({ item_id: 3, uptime_pct: 80 })]));
        expect(spec.rows.map(r => r.metrics[1].tone)).toEqual(['ok', 'warn', 'bad']);
    });
    test('the chosen ones, in the order they were arranged in', () => {
        const rows = [row({ item_id: 1, name: 'a' }), row({ item_id: 2, name: 'b' }), row({ item_id: 3, name: 'c' })];
        expect(monitorShell(input(rows, { items: [3, 1], itemOrder: [1, 3] })).rows.map(r => r.name)).toEqual(['a', 'c']);
        expect(monitorShell(input(rows, { itemOrder: [3] })).rows.map(r => r.name)).toEqual(['c', 'a', 'b']);
    });
    test('the totals and the foot count what is drawn', () => {
        const spec = monitorShell(input([row({ item_id: 1 }), row({ item_id: 2, status: 'down', uptime_pct: 50 })], { items: [1, 2] }));
        expect(spec.foot).toBe('[status.online]: 1/2');
        expect(spec.summary.map(m => m.label)).toEqual(['[monitor.uptime]', '[monitor.response]']);
    });
    test('the totals can be switched off while the rows stay', () => {
        const spec = monitorShell(input([row()], { showSummary: false }));
        expect(spec.summary).toEqual([]);
        expect(spec.rows).toHaveLength(1);
    });
    test('services that are gone, or none at all, are said in words', () => {
        expect(monitorShell(input([row()], { items: [99] })).state).toBe('[monitor.no_services_selected]');
        expect(monitorShell(input([])).state).toBe('[monitor.overview_empty]');
    });
    test('the link to the page only when it is on', () => {
        expect(monitorShell(input([row()])).seeAll).toBe('[widget.see_all]');
        expect(monitorShell(input([row()], { showAll: false })).seeAll).toBeUndefined();
    });
});

describe('the strip of readings', () => {
    const t = (k: string) => k;
    const time = (s: string) => s;
    test('is always as long as the strip, padded on the left', () => {
        const html = beatsHtml(row({ heartbeat: [{ status: 'up', at: 'a' }, { status: 'down', at: 'b' }] }), { t, time });
        expect((html.match(/<i /g) || []).length).toBe(BEATS);
        expect(html.indexOf('data-s="none"')).toBeLessThan(html.indexOf('data-s="up"'));
        expect(html).toContain('data-s="down"');
    });
    test('a time that is markup does not reach the page as markup', () => {
        const html = beatsHtml(row({ heartbeat: [{ status: 'up', at: '"><script>' }] }), { t, time });
        expect(html).not.toContain('<script>');
    });
});

describe('what is stored for a service', () => {
    test('reads only icons: a name saved by an earlier beta is dropped, and so is an entry that says nothing', () => {
        expect(readItemConfig({ '1': { label: ' Movies ', icon: 'film' }, '2': { label: 'Only a name' }, '3': 'x', '4': { icon: 5 } })).toEqual({ '1': { icon: 'film' } });
        expect(readItemConfig(undefined)).toEqual({});
        expect(readItemConfig('garbage')).toEqual({});
    });
});
