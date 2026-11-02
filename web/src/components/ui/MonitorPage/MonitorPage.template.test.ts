import { describe, expect, test } from 'bun:test';
import {
    attentionHtml, cardHtml, causeCode, causeText, checksTabHtml, downLine, moreHtml, outageSpan, PANEL_LINES, drawerFooterHtml, drawerHeadHtml, inventoryHtml, kpisHtml, latestOutagesBoxHtml, listHeadHtml,
    monitoringKpi, outageRowHtml, outagesPanelHtml, outagesTabHtml, rowHtml, stateChips, summaryHtml, summaryTabHtml, type Fmt, type MonitoringSetup, type ServiceView, type T,
} from './MonitorPage.template';
import { attentionList, fleetTotals, groupRows, readRow, RANGES, type Outage, type ServiceRow } from '../../../services/monitorPage';

const t: T = (key, params) => `[${key}${params ? ':' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',') : ''}]`;
const fmt: Fmt = {
    num: n => `N(${n})`, avail: (p, d) => (p < 0 ? '—' : `A(${p}${d !== undefined ? ',' + d : ''})`), ms: n => (n === null ? '—' : `M(${n})`),
    span: s => `S(${s})`, one: s => `O(${s})`, ago: iso => (iso === 'now' ? '' : `G(${iso})`), date: iso => `D(${iso})`, clock: iso => `C(${iso})`,
};
const evil = '<img src=x onerror=alert(1)>';

const row = (over: Partial<ServiceRow> & { name: string }): ServiceRow => readRow({
    item_id: 1, status: 'up', uptime_pct: 100, latency_ms: 100, avg_ms_24h: 100, url: 'plex.lan', board: 'Media', uptime_7d: 100, uptime_30d: 100, heartbeat: [], ...over,
});
const view = (r: ServiceRow, over: Partial<ServiceView> = {}): ServiceView => ({ row: r, face: '', selected: false, showBoard: false, ...over });
const setup = (over: Partial<MonitoringSetup> = {}): MonitoringSetup => ({ mode: 'background', interval_sec: 300, alerts_enabled: true, notify_type: 'ntfy', fail_threshold: 3, retention_days: 30, ...over });

const noMarkup = (html: string, payload: string) => {
    expect(html).not.toContain(payload);
    expect(html).toContain('&lt;');
};

describe('what comes from the bookmark never becomes markup', () => {
    const bad = row({ name: evil, url: evil, board: evil, icon: evil });
    test('the card, the row and the group', () => {
        noMarkup(cardHtml(view(bad, { showBoard: true }), t, fmt), evil);
        noMarkup(rowHtml(view(bad), t, fmt), evil);
        noMarkup(inventoryHtml(groupRows([bad], true), 'cards', r => view(r), t, fmt), evil);
    });
    test('the panel head and its footer', () => {
        noMarkup(drawerHeadHtml({ row: bad, face: '' }, t), evil);
        expect(drawerFooterHtml(bad, t)).not.toContain('<img src=x');
    });
    test('attention and outages carry the name through escaping', () => {
        const items = attentionList([{ ...bad, status: 'down', latency_ms: null }], 'background');
        noMarkup(attentionHtml(items, new Map([[bad.item_id, { ...bad, status: 'down' as const }]]), t, fmt), evil);
        noMarkup(outageRowHtml({ item_id: 1, name: evil, start: 's', end: null, duration_sec: 1, status_code: 0 }, true, t, fmt), evil);
    });
});

describe('the four indicators', () => {
    const rows = [
        row({ item_id: 1, name: 'a' }),
        row({ item_id: 2, name: 'b', status: 'down', latency_ms: null, uptime_pct: 90 }),
        row({ item_id: 3, name: 'c', latency_ms: 1300, avg_ms_24h: 300 }),
        row({ item_id: 4, name: 'd', status: 'none', latency_ms: null, avg_ms_24h: null, uptime_pct: -1, uptime_7d: -1, uptime_30d: -1 }),
    ];
    const totals = fleetTotals(rows);
    const html = kpisHtml(totals, setup(), { avail: [99, 98], response: [100, 200] }, t, fmt);

    test('services: how many are running of how many, and each kind as "label: N"', () => {
        expect(html).toContain('N(2)');
        expect(html).toContain('/ N(4)');
        expect(html).toContain('[infra.filter_up]: N(2)');
        expect(html).toContain('[monitorpage.down]: N(1)');
        expect(html).toContain('[monitorpage.slow]: N(1)');
        expect(html).toContain('[monitor.status_unknown]: N(1)');
    });
    test('no figure in these is a count followed by a word', () => {
        expect(html).not.toMatch(/N\(\d+\) \[/);
    });
    test('availability and response', () => {
        expect(html).toContain('7 d: A(');
        expect(html).toContain('[monitor.avg_24h]');
        expect(html).toContain('[monitorpage.slowest]: c');
    });
    test('without any data the figures say so instead of 0', () => {
        const none = kpisHtml(fleetTotals([rows[3]]), setup(), { avail: [], response: [] }, t, fmt);
        expect(none).toContain('—');
        expect(none).not.toContain('A(0');
    });
    test('monitoring on: 24/7, how often, how long it is kept, who is told', () => {
        const k = monitoringKpi(setup(), t, fmt);
        expect(k).toContain('24/7');
        expect(k).toContain('[monitorpage.every:time=S(300)]');
        expect(k).toContain('[monitorpage.kept:time=S(2592000)]');
        expect(k).toContain('[monitorpage.alerts:method=ntfy]');
        expect(k).toContain('data-act="settings"');
    });
    test('alerts switched off or with no channel say off, not a method that does not exist', () => {
        expect(monitoringKpi(setup({ alerts_enabled: false }), t, fmt)).toContain('[monitorpage.alerts:method=[monitorpage.off]]');
        expect(monitoringKpi(setup({ notify_type: 'none' }), t, fmt)).toContain('[monitorpage.alerts:method=[monitorpage.off]]');
    });
    test('monitoring off: the page says it is live only, and offers the way to turn it on', () => {
        const k = monitoringKpi(setup({ mode: 'tab' }), t, fmt);
        expect(k).toContain('[monitorpage.live]');
        expect(k).toContain('[monitorpage.live_only]');
        expect(k).not.toContain('24/7');
        expect(k).toContain('data-act="settings"');
    });
    test('the header line follows the same "label: N" rule', () => {
        const s = summaryHtml(totals, t, fmt);
        expect(s).toContain('[monitorpage.down]: <b>N(1)</b>');
        expect(s).toContain('[monitorpage.slow]: <b>N(1)</b>');
    });
});

describe('attention', () => {
    test('a service that is down says since when and what it got back', () => {
        const r = row({ item_id: 7, name: 'Immich', status: 'down', latency_ms: null, status_code: 502, down_since: new Date(Date.now() - 28 * 60000).toISOString() });
        const html = attentionHtml(attentionList([r], 'background'), new Map([[7, r]]), t, fmt);
        expect(html).toContain('[monitorpage.att_down:name=Immich]');
        expect(html).toContain('time=O(');
        expect(html).toContain('cause=[monitorpage.cause_unavailable]');
        expect(html).toContain('data-id="7"');
    });
    test('a connection that was refused is "no answer", not "HTTP 0"', () => {
        const r = row({ item_id: 7, name: 'x', status: 'down', latency_ms: null, status_code: 0, down_since: new Date(Date.now() - 5 * 60000).toISOString() });
        expect(downLine(r, t, fmt)).toContain('[monitorpage.cause_none]');
        expect(downLine(r, t, fmt)).not.toContain('HTTP 0');
    });
    test('an outage that began seconds ago does not say "0 minutes"', () => {
        const r = row({ item_id: 7, name: 'x', status: 'down', latency_ms: null, status_code: 502, down_since: new Date(Date.now() - 10000).toISOString() });
        expect(downLine(r, t, fmt)).toContain('[monitorpage.just_now]');
        expect(downLine(r, t, fmt)).not.toContain('S(');
    });
    test('a slow one says what it takes now and what it usually takes', () => {
        const r = row({ item_id: 8, name: 'Nextcloud', latency_ms: 1300, avg_ms_24h: 300 });
        expect(attentionHtml(attentionList([r], 'background'), new Map([[8, r]]), t, fmt)).toContain('now=M(1300),avg=M(300)');
    });
    test('without 24/7 the first thing it says is that, and it leads to the settings', () => {
        const html = attentionHtml(attentionList([], 'tab'), new Map(), t, fmt);
        expect(html).toContain('[monitorpage.att_off]');
        expect(html).toContain('data-act="settings"');
    });
    test('nothing to say is said once', () => {
        expect(attentionHtml([], new Map(), t, fmt)).toContain('[infra.all_ok]');
    });
});

describe('the inventory', () => {
    const up = row({ item_id: 1, name: 'Plex', uptime_pct: 99.9, latency_ms: 200, heartbeat: [{ status: 'up', at: 'a' }, { status: 'down', at: 'b' }] });
    const down = row({ item_id: 2, name: 'Immich', status: 'down', latency_ms: null, status_code: 0, uptime_pct: 87, down_since: new Date(Date.now() - 600000).toISOString() });
    const none = row({ item_id: 3, name: 'Blog', status: 'none', latency_ms: null, uptime_pct: -1, avg_ms_24h: null });

    test('the dot is the last thing in the tail of a card, after its availability', () => {
        const html = cardHtml(view(up), t, fmt);
        const tail = html.slice(html.indexOf('unit__tail'));
        expect(tail.indexOf('class="chip')).toBeLessThan(tail.indexOf('class="dot'));
        expect(html.slice(0, html.indexOf('unit__tail'))).not.toContain('class="dot');
    });
    test('every card holds its status in one block and the heartbeat after it, whatever the state', () => {
        for (const r of [up, down, none]) {
            const html = cardHtml(view(r), t, fmt);
            expect(html).toContain('class="unit__st"');
            if (r !== none) expect(html.indexOf('class="beats')).toBeGreaterThan(html.indexOf('</div>', html.indexOf('class="unit__st"')));
        }
    });
    test('a card carries its id, its address and, if asked, its board', () => {
        const html = cardHtml(view(up, { showBoard: true }), t, fmt);
        expect(html).toContain('data-id="1"');
        expect(html).toContain('plex.lan');
        expect(html).toContain('Media');
        expect(cardHtml(view(up), t, fmt)).not.toContain('· Media');
    });
    test('the heartbeat has a bar for every check, padded to the left with grey ones', () => {
        const html = cardHtml(view(up), t, fmt);
        expect(html.match(/<i class="d"/g)?.length).toBe(1);
        expect(html.match(/<i class="n"/g)?.length).toBe(28);
    });
    test('a service that is down says since when and why on its card', () => {
        const html = cardHtml(view(down), t, fmt);
        expect(html).toContain('is-off');
        expect(html).toContain('[monitorpage.att_down_sub');
        expect(html).toContain('[monitorpage.cause_none]');
    });
    test('one never checked says so, with no bars invented', () => {
        const html = cardHtml(view(none), t, fmt);
        expect(html).toContain('[monitorpage.no_checks]');
        expect(html).not.toContain('class="beats');
    });
    test('a service without a face gets the shell\'s placeholder; one with a face gets its image', () => {
        expect(cardHtml(view(up), t, fmt)).toContain('face--none');
        expect(cardHtml(view(up, { face: '/api/icons/p' }), t, fmt)).toContain('<img src="/api/icons/p"');
    });
    test('the list view has the same columns as its head', () => {
        const head = listHeadHtml(t);
        expect(head.match(/<span/g)?.length).toBe(7);
        expect(rowHtml(view(up), t, fmt)).toContain('[status.online]');
    });
    test('boards become groups, and a board with nothing in it draws nothing', () => {
        const html = inventoryHtml(groupRows([up, down, none], true), 'cards', r => view(r), t, fmt);
        expect(html).toContain('gpill');
        expect(inventoryHtml([{ name: 'Empty', rows: [] }], 'cards', r => view(r), t, fmt)).toBe('');
    });
    test('the toolbar chips are running, down and no data', () => {
        expect(stateChips(t).map(c => c.id)).toEqual(['all', 'up', 'down', 'none']);
    });
});

describe('outages', () => {
    const list: Outage[] = [
        { item_id: 1, name: 'Immich', start: 'a', end: null, duration_sec: 600, status_code: 502 },
        { item_id: 2, name: 'Plex', start: 'b', end: 'c', duration_sec: 1200, status_code: 0 },
    ];
    test('an ongoing one says so; a closed one says how long and that it recovered', () => {
        expect(outageRowHtml(list[0], true, t, fmt)).toContain('[monitorpage.is_down]');
        const closed = outageRowHtml(list[1], true, t, fmt);
        expect(closed).toContain('was_down:time=O(1200)');
        expect(closed).toContain('[monitorpage.working_again]');
        expect(closed).toContain('[monitorpage.cause_none]');
    });
    test('one that began a moment ago does not say "ago" with nothing before it', () => {
        expect(outageRowHtml({ ...list[0], start: 'now' }, true, t, fmt)).toContain('[monitorpage.just_now]');
    });
    test('the tab: totals, filters and the list', () => {
        const rows = new Map([[1, row({ item_id: 1, name: 'Immich' })]]);
        const html = outagesTabHtml(list, list, '30 d', RANGES, 'all', t, fmt, rows);
        expect(html).toContain('data-ofilter="ongoing"');
        expect(html).toContain('data-orange="7 d"');
        expect(html).toContain('O(1800)');
        expect(html).toContain('O(1200)');
    });
    test('with none, it says there were none and shows no zero-length mean', () => {
        const html = outagesTabHtml([], [], '24 h', RANGES, 'all', t, fmt, new Map());
        expect(html).toContain('[monitor.no_incidents]');
        expect(html).toContain('—');
    });
    test('the latest outages box and the panel list have the same empty words', () => {
        expect(latestOutagesBoxHtml([], t, fmt, 0)).toContain('[monitor.no_incidents]');
        expect(outagesPanelHtml([], t, fmt)).toContain('[monitor.no_incidents]');
    });
});

describe('the panel', () => {
    const r = row({ item_id: 5, name: 'Nextcloud', status_code: 200, checked_at: '2026-01-01T00:00:00Z', uptime_pct: 99.1, uptime_7d: 99.4, uptime_30d: 99.6 });
    test('three windows, a chart slot, the heartbeat and the facts', () => {
        const html = summaryTabHtml({ row: r, chart: '<svg id="c"></svg>', range: '24 h', ranges: RANGES, setup: setup() }, t, fmt);
        expect(html).toContain('A(99.1,2)');
        expect(html).toContain('A(99.6,2)');
        expect(html).toContain('<svg id="c">');
        expect(html).toContain('data-range="7 d"');
        expect(html).toContain('D(2026-01-01T00:00:00Z)');
        expect(html).toContain('[monitorpage.threshold]');
    });
    test('without readings the chart says there is nothing yet', () => {
        expect(summaryTabHtml({ row: r, chart: '', range: '24 h', ranges: RANGES, setup: null }, t, fmt)).toContain('[monitor.no_data_yet]');
    });
    test('a window with no data shows a dash and no bar', () => {
        const html = summaryTabHtml({ row: { ...r, uptime_30d: -1 }, chart: '', range: '24 h', ranges: RANGES, setup: null }, t, fmt);
        expect(html).toContain('<b>—</b>');
    });
    test('the checks: newest first, a failure in red with what came back', () => {
        const html = checksTabHtml([
            { checked_at: 't1', up: true, latency_ms: 100, status_code: 200 },
            { checked_at: 't2', up: false, latency_ms: null, status_code: 502 },
        ], 2592000, t, fmt);
        expect(html.indexOf('C(t2)')).toBeLessThan(html.indexOf('C(t1)'));
        expect(html).toContain('class="bad"');
        expect(html).toContain('cause_unavailable');
    });
    test('the footer: open the service (when it has an address) and clear its history', () => {
        expect(drawerFooterHtml(r, t)).toContain('data-act="visit"');
        expect(drawerFooterHtml(r, t)).toContain('data-act="clear"');
        expect(drawerFooterHtml({ ...r, url: '' }, t)).not.toContain('data-act="visit"');
    });
});

describe('what a person reads about an outage', () => {
    test('a status code becomes what it means; the code itself stays for a tooltip', () => {
        const want: [number, string][] = [[0, 'cause_none'], [401, 'cause_denied'], [403, 'cause_denied'], [404, 'cause_missing'], [408, 'cause_unavailable'],
            [502, 'cause_unavailable'], [503, 'cause_unavailable'], [504, 'cause_unavailable'], [500, 'cause_error'], [599, 'cause_error'], [418, 'cause_other'], [302, 'cause_other']];
        for (const [code, key] of want) {
            expect(causeText(code, t)).toBe(`[monitorpage.${key}]`);
            expect(causeText(code, t)).not.toMatch(/\d{3}/);
        }
        expect(causeCode(502)).toBe('HTTP 502');
        expect(causeCode(0)).toBe('');
    });
    test('a length of time is never seconds: under a minute says so, under an hour is one unit, then two', () => {
        expect(outageSpan(20, t, fmt)).toBe('[monitorpage.under_minute]');
        expect(outageSpan(1848, t, fmt)).toBe('O(1848)');
        expect(outageSpan(3600, t, fmt)).toBe('S(3600)');
    });
    test('the words say how long it was down and that it works again, not "recovered"', () => {
        const html = outageRowHtml({ item_id: 1, name: 'Plex', start: 'a', end: 'b', duration_sec: 1848, status_code: 502 } as Outage, true, t, fmt);
        expect(html).toContain('[monitorpage.was_down:time=O(1848)]');
        expect(html).toContain('[monitorpage.working_again]');
        expect(html).not.toContain('monitor.ev_recovered');
        expect(html).toContain('title="HTTP 502"');
    });
    test('the "view all" button appears only when there is more than what is shown', () => {
        expect(moreHtml('all-x', 6, 6, t, fmt)).toBe('');
        expect(moreHtml('all-x', 6, 67, t, fmt)).toContain('data-act="all-x"');
        expect(moreHtml('all-x', 6, 67, t, fmt)).toContain('N(67)');
    });
    test('the side panel shows the first lines and offers the rest; the window shows them all', () => {
        const list = Array.from({ length: PANEL_LINES + 5 }, (_, i) => ({ start: `s${i}`, end: `e${i}`, duration_sec: 600, status_code: 0 } as Outage));
        const few = outagesPanelHtml(list, t, fmt);
        expect(few.match(/class="task out"/g)?.length).toBe(PANEL_LINES);
        expect(few).toContain('data-act="all-panel-outages"');
        const every = outagesPanelHtml(list, t, fmt, true);
        expect(every.match(/class="task out"/g)?.length).toBe(PANEL_LINES + 5);
        expect(every).not.toContain('data-act=');
    });
    test('the checks list does the same', () => {
        const checks = Array.from({ length: PANEL_LINES * 2 + 3 }, (_, i) => ({ checked_at: `t${i}`, up: true, latency_ms: 10, status_code: 200 }));
        const few = checksTabHtml(checks as never, 86400, t, fmt);
        expect(few.match(/class="chk"/g)?.length).toBe(PANEL_LINES * 2);
        expect(few).toContain('data-act="all-checks"');
        expect(checksTabHtml(checks as never, 86400, t, fmt, true).match(/class="chk"/g)?.length).toBe(PANEL_LINES * 2 + 3);
    });
});
