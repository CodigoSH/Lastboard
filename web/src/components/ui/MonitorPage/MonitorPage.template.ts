import { escapeHtml } from '../../../services/escape';
import {
    outageTotals, stateOf,
    type AttentionItem, type Check, type FleetTotals, type Outage, type OutageFilter, type RangeLabel, type RowGroup, type ServiceRow, type ServiceState, type StateFilter,
} from '../../../services/monitorPage';
import { barHtml, boxHtml, chartCardHtml, emptyHtml, FACE_NONE, faceHtml, icon, kpiHtml, type Level, type T } from '../infra/infra.template';

export type { T };

/**
 * The markup of the status page, as pure functions.
 *
 * A service's name, address and board are written by whoever made the bookmark
 * and go through escapeHtml here and nowhere else. Text the page itself says
 * arrives through `t`, so these can be read and tested without the i18n
 * singleton.
 */

/** How the page formats what depends on the language. */
export interface Fmt {
    num: (n: number) => string;
    /** An availability given as 0..100, with how many decimals the place has room for; "—" when it has no data (< 0). */
    avail: (pct: number, digits?: number) => string;
    /** A response time in milliseconds, in the unit that reads best. */
    ms: (n: number | null) => string;
    /** A length of time in words, in two units ("1 hour and 12 minutes"). */
    span: (sec: number) => string;
    /** How long ago an instant was, in one unit; '' under a minute. */
    ago: (iso: string) => string;
    /** A moment, in the app's language. */
    date: (iso: string) => string;
    /** A clock time, to the second. */
    clock: (iso: string) => string;
}

const e = escapeHtml;

/** A value that is a machine's, not a sentence: addresses stay left-to-right in any language. */
const tech = (v: string, cls = ''): string => `<span class="tech${cls ? ' ' + cls : ''}" dir="ltr">${e(v)}</span>`;

const LEVEL: Record<ServiceState, 'ok' | 'warn' | 'bad' | ''> = { up: 'ok', slow: 'warn', down: 'bad', none: '' };
const STATE_KEYS: Record<ServiceState, string> = { up: 'status.online', slow: 'monitorpage.slow', down: 'monitorpage.down', none: 'monitor.status_unknown' };

export const toneOf = (r: ServiceRow): 'ok' | 'warn' | 'bad' | '' => LEVEL[stateOf(r)];
const dotOf = (r: ServiceRow): string => { const k = toneOf(r); return `<span class="dot${k ? ' dot--' + k : ''}"></span>`; };

/** The state as a coloured dot; its words are what the pointer brings up. */
export function stateDot(tone: 'ok' | 'warn' | 'bad' | '', label: string): string {
    return `<span class="dot state-dot${tone ? ' dot--' + tone : ''}" role="img" tabindex="0" title="${e(label)}" aria-label="${e(label)}"></span>`;
}

/** What the last check got back, for a person: the HTTP code, or that nothing answered. */
export const causeText = (code: number, t: T): string => (code > 0 ? `HTTP ${code}` : t('monitorpage.cause_none'));

// ── The header ─────────────────────────────────────────────────────────────

/** "11/14 running · Down: 2 · Slow: 1" — the line beside the page's name. */
export function summaryHtml(tt: FleetTotals, t: T, fmt: Fmt): string {
    const parts = [`<span><i class="dot dot--ok"></i><b>${e(fmt.num(tt.up))}</b>/${e(fmt.num(tt.total))} ${e(t('infra.filter_up').toLowerCase())}</span>`];
    if (tt.down) parts.push(`<span><i class="dot dot--bad"></i>${e(t('monitorpage.down'))}: <b>${e(fmt.num(tt.down))}</b></span>`);
    if (tt.slow) parts.push(`<span><i class="dot dot--warn"></i>${e(t('monitorpage.slow'))}: <b>${e(fmt.num(tt.slow))}</b></span>`);
    return parts.join('');
}

// ── The four indicators ────────────────────────────────────────────────────

/** How monitoring is set up for this account: the fourth indicator is about whether it is recording at all. */
export interface MonitoringSetup {
    mode: string;
    interval_sec: number;
    alerts_enabled: boolean;
    notify_type: string;
    fail_threshold: number;
    retention_days: number;
}

const NOTIFY_NAMES: Record<string, string> = { ntfy: 'ntfy', gotify: 'Gotify', webhook: 'Webhook' };

type Tone = 'ok' | 'warn' | 'bad' | '';

export function kpisHtml(tt: FleetTotals, setup: MonitoringSetup | null, sparks: { avail: number[]; response: number[] }, t: T, fmt: Fmt): string {
    const pctUp = tt.total ? (tt.up / tt.total) * 100 : 0;
    const ringLevel: Level = tt.down ? 'bad' : tt.slow ? 'warn' : 'ok';
    const availLevel: Level = tt.avail24 < 0 || tt.avail24 >= 99 ? 'ok' : tt.avail24 >= 95 ? 'warn' : 'bad';
    const chips: { text: string; tone: Tone }[] = [{ text: `● ${t('infra.filter_up')}: ${fmt.num(tt.up)}`, tone: 'ok' }];
    if (tt.down) chips.push({ text: `${t('monitorpage.down')}: ${fmt.num(tt.down)}`, tone: 'bad' });
    if (tt.slow) chips.push({ text: `${t('monitorpage.slow')}: ${fmt.num(tt.slow)}`, tone: 'warn' });
    if (tt.none) chips.push({ text: `${t('monitor.status_unknown')}: ${fmt.num(tt.none)}`, tone: '' });

    const services = kpiHtml({
        label: t('monitor.services'), icon: 'activity', value: fmt.num(tt.up), unit: `/ ${fmt.num(tt.total)}`,
        ring: { percent: pctUp, level: ringLevel, label: `${fmt.num(Math.round(pctUp))}%` }, chips,
    });
    const availability = kpiHtml({
        label: t('monitorpage.kpi_availability'), icon: 'check',
        value: tt.avail24 < 0 ? '—' : fmt.avail(tt.avail24, tt.avail24 >= 99.95 ? 0 : 1).replace(/\s*%$/, ''),
        unit: tt.avail24 < 0 ? undefined : '%',
        bar: tt.avail24 < 0 ? undefined : tt.avail24, spark: sparks.avail, sparkTone: availLevel,
        sub: [`7 d: ${fmt.avail(tt.avail7)}`, `30 d: ${fmt.avail(tt.avail30)}`],
    });
    const response = kpiHtml({
        label: t('monitor.response'), icon: 'clock', value: tt.latencyNow === null ? '—' : fmt.num(Math.round(tt.latencyNow)), unit: tt.latencyNow === null ? undefined : 'ms',
        spark: sparks.response, sparkTone: tt.slow ? 'warn' : 'ok',
        sub: [`${t('monitor.avg_24h')}: ${fmt.ms(tt.latencyAvg)}`, tt.slowest ? `${t('monitorpage.slowest')}: ${tt.slowest.name} · ${fmt.ms(tt.slowest.latency_ms)}` : ''],
    });
    return `<div class="kpis">${services}${availability}${response}${monitoringKpi(setup, t, fmt)}</div>`;
}

/** The fourth indicator: is anything being recorded, how often, for how long, and who is told. */
export function monitoringKpi(setup: MonitoringSetup | null, t: T, fmt: Fmt): string {
    const label = t('widget.monitor.name');
    if (!setup) return kpiHtml({ label, icon: 'gear', value: '—' });
    const alerts = setup.alerts_enabled && NOTIFY_NAMES[setup.notify_type] ? NOTIFY_NAMES[setup.notify_type] : t('monitorpage.off');
    const chips: { text: string; tone: Tone }[] = setup.mode === 'background'
        ? [{ text: `● ${t('monitorpage.on')}`, tone: 'ok' }, { text: t('monitorpage.alerts', { method: alerts }), tone: '' }]
        : [{ text: t('monitorpage.alerts', { method: t('monitorpage.off') }), tone: 'warn' }];
    const kpi = setup.mode === 'background'
        ? kpiHtml({
            label, icon: 'gear', value: '24/7', unit: t('monitorpage.every', { time: fmt.span(setup.interval_sec) }),
            sub: [t('monitorpage.kept', { time: fmt.span(setup.retention_days * 86400) }), `${t('monitorpage.threshold')}: ${fmt.num(setup.fail_threshold)}`], chips,
        })
        : kpiHtml({ label, icon: 'gear', value: t('monitorpage.live'), unit: t('monitorpage.no_history'), sub: [t('monitorpage.live_only'), ''], chips });
    // The way to the settings sits with the chips, inside the same card.
    const settings = `<button type="button" class="chip chip--link" data-act="settings">${icon('gear', 11)}<span class="chip__t">${e(t('monitorpage.settings'))}</span></button>`;
    return kpi.replace(/(<div class="kpi__chips">[\s\S]*?)(<\/div>\s*<\/div>\s*)$/, `$1${settings}$2`);
}

// ── Attention ──────────────────────────────────────────────────────────────

/** How long a service has been down, in words, from when its outage began; '' when that is not known. */
export function downSince(r: ServiceRow, fmt: Fmt, nowMs = Date.now()): string {
    if (!r.down_since) return '';
    const sec = Math.max(0, (nowMs - Date.parse(r.down_since)) / 1000);
    return sec >= 60 ? fmt.span(sec) : '';
}

/** "Down for 28 minutes · HTTP 502". Under a minute it says so rather than "0 minutes". */
export function downLine(r: ServiceRow, t: T, fmt: Fmt): string {
    const time = downSince(r, fmt);
    return time
        ? t('monitorpage.att_down_sub', { time, cause: causeText(r.status_code, t) })
        : `${t('monitorpage.just_now')} · ${causeText(r.status_code, t)}`;
}

export function attentionHtml(items: AttentionItem[], rows: Map<number, ServiceRow>, t: T, fmt: Fmt): string {
    if (!items.length) return `<div class="allok">${icon('check', 22)}<span>${e(t('infra.all_ok'))}</span></div>`;
    return `<div class="attn">${items.map(a => {
        if (a.kind === 'off') {
            return `<button type="button" class="attn__row" data-act="settings"><span class="dot dot--warn"></span>
                <span class="attn__t"><b>${e(t('monitorpage.att_off'))}</b><span>${e(t('monitorpage.att_off_hint'))}</span></span>${icon('chevR', 15)}</button>`;
        }
        const r = a.id !== undefined ? rows.get(a.id) : undefined;
        const name = a.name ?? '';
        let title: string, sub: string, tone = '';
        if (a.kind === 'down') {
            title = t('monitorpage.att_down', { name });
            sub = r ? downLine(r, t, fmt) : '';
            tone = 'bad';
        } else if (a.kind === 'slow') {
            title = t('monitorpage.att_slow', { name });
            sub = t('monitorpage.att_slow_sub', { now: fmt.ms(r?.latency_ms ?? null), avg: fmt.ms(r?.avg_ms_24h ?? null) });
            tone = 'warn';
        } else {
            title = t('monitorpage.att_none', { name });
            sub = t('monitorpage.att_none_sub');
        }
        return `<button type="button" class="attn__row" data-id="${a.id}"><span class="dot${tone ? ' dot--' + tone : ''}"></span>
            <span class="attn__t"><b>${e(title)}</b><span>${e(sub)}</span></span>${icon('chevR', 15)}</button>`;
    }).join('')}</div>`;
}

// ── The overview ───────────────────────────────────────────────────────────

export function rangeSegHtml(act: string, current: RangeLabel, ranges: readonly RangeLabel[]): string {
    return `<span class="seg seg--text" role="group">${ranges.map(r => `<button type="button" data-${act}="${r}" aria-pressed="${r === current}">${e(r)}</button>`).join('')}</span>`;
}

export function chartCardForFleet(chart: string, range: RangeLabel, ranges: readonly RangeLabel[], t: T): string {
    return chartCardHtml(t('monitorpage.chart_title'),
        [{ name: t('monitorpage.mean'), color: 'var(--ok)' }, { name: t('monitorpage.slowest'), color: 'var(--warn)' }],
        rangeSegHtml('fleet', range, ranges), chart, t('dockerpage.collecting'));
}

const lowRow = (r: ServiceRow, fmt: Fmt): string => {
    const tone = r.uptime_30d >= 99 ? 'ok' : r.uptime_30d >= 95 ? 'warn' : 'bad';
    return `<button type="button" class="task low" data-id="${r.item_id}"><span><b>${e(r.name)}</b><small>${e(r.board)}</small></span>
        <div class="bar bar--thick" data-l="${tone}"><i style="inline-size:${Math.max(0, Math.min(100, r.uptime_30d)).toFixed(1)}%"></i></div>
        <span class="task__r"><b>${e(fmt.avail(r.uptime_30d, 2))}</b></span></button>`;
};

export function lowestBoxHtml(rows: ServiceRow[], t: T, fmt: Fmt): string {
    const body = rows.length
        ? `<div class="card tasks">${rows.map(r => lowRow(r, fmt)).join('')}</div>`
        : `<div class="card"><div class="chart__empty">${e(t('monitor.no_data_yet'))}</div></div>`;
    return boxHtml(t('monitorpage.lowest'), body, '30 d');
}

/** One outage as a line: what happened, to which service, since when, and for how long. */
export function outageRowHtml(o: Outage, named: boolean, t: T, fmt: Fmt, rows?: Map<number, ServiceRow>): string {
    const ongoing = o.end === null;
    const cause = causeText(o.status_code, t);
    const ago = fmt.ago(o.start);
    const when = ago ? t('monitorpage.ago', { time: ago }) : t('monitorpage.just_now');
    const who = named ? o.name ?? rows?.get(o.item_id ?? -1)?.name ?? '' : cause;
    const sub = named ? `${cause} · ${when}` : when;
    const right = ongoing
        ? `<span class="chip chip--bad">${e(t('monitorpage.ongoing'))}</span>`
        : `${e(fmt.span(o.duration_sec))}<br><span class="ok">${e(t('monitor.ev_recovered'))}</span>`;
    return `<button type="button" class="task out" ${o.item_id ? `data-id="${o.item_id}"` : 'data-noopen="1"'}><span class="dot dot--${ongoing ? 'bad dot--run' : 'ok'}"></span>
        <span><b>${e(who)}</b><small>${e(sub)}</small></span><span class="task__r">${right}</span></button>`;
}

export function latestOutagesBoxHtml(list: Outage[], t: T, fmt: Fmt, total: number): string {
    const body = list.length
        ? `<div class="card tasks">${list.map(o => outageRowHtml(o, true, t, fmt)).join('')}</div>`
        : `<div class="card"><div class="chart__empty">${e(t('monitor.no_incidents'))}</div></div>`;
    return boxHtml(t('monitorpage.latest'), body, fmt.num(total));
}

// ── The inventory ──────────────────────────────────────────────────────────

/** One service as the inventory sees it. */
export interface ServiceView {
    row: ServiceRow;
    /** The face's address, already resolved; '' for none. */
    face: string;
    selected: boolean;
    showBoard: boolean;
}

const BEATS = 30;

/** The last `n` checks as bars, oldest first; where the service has fewer, the earlier place is left grey. */
export function beatsHtml(row: ServiceRow, t: T, fmt: Fmt, n = BEATS, cls = 'beats--sm'): string {
    const real = row.heartbeat.slice(-n);
    const pad = '<i class="n"></i>'.repeat(Math.max(0, n - real.length));
    const bars = real.map(b => {
        const down = b.status === 'down';
        const label = `${t(down ? 'monitorpage.cause_none' : 'status.online')} · ${fmt.date(b.at)}`;
        return `<i class="${down ? 'd' : ''}" title="${e(label)}"></i>`;
    }).join('');
    return `<div class="beats ${cls}">${pad}${bars}</div>`;
}

const attrs = (v: ServiceView): string => `data-id="${v.row.item_id}"`;

export function cardHtml(v: ServiceView, t: T, fmt: Fmt): string {
    const r = v.row, st = stateOf(r), down = st === 'down';
    const tail = `${r.uptime_pct >= 0 ? `<span class="chip${down ? ' chip--bad' : ''}">${e(fmt.avail(r.uptime_pct))}</span>` : ''}${dotOf(r)}`;
    let body: string;
    if (st === 'none') body = `<div class="unit__off">${e(t('monitorpage.no_checks'))}</div>`;
    else if (down) body = `<div class="unit__off">${e(downLine(r, t, fmt))}</div>${beatsHtml(r, t, fmt)}`;
    else {
        // The bar is the response against four times what it usually is: full is "as bad as it gets", not "full".
        const base = r.avg_ms_24h && r.avg_ms_24h > 0 ? r.avg_ms_24h * 4 : Math.max(1, r.latency_ms ?? 1);
        const share = Math.max(4, Math.min(100, ((r.latency_ms ?? 0) / base) * 100));
        body = `<div class="unit__m"><div class="mrow"><span>${e(t('monitor.response'))}</span>${barHtml(st === 'slow' ? Math.max(share, 65) : Math.min(share, 50))}<b>${e(fmt.ms(r.latency_ms))}</b></div>${beatsHtml(r, t, fmt)}</div>`;
    }
    return `<button type="button" class="card card--btn unit${down ? ' is-off' : ''}${v.selected ? ' is-sel' : ''}" ${attrs(v)}>
        <div class="unit__h">${faceHtml(v.face)}<span class="unit__n">${e(r.name) || '—'}</span><span class="unit__tail">${tail}</span></div>
        <div class="unit__sub">${tech(r.url || '—')}${v.showBoard && r.board ? `<span>· ${e(r.board)}</span>` : ''}</div>
        ${body}
    </button>`;
}

export function rowHtml(v: ServiceView, t: T, fmt: Fmt): string {
    const r = v.row, st = stateOf(r);
    return `<button type="button" class="tr${st === 'down' ? ' is-off' : ''}${v.selected ? ' is-sel' : ''}" ${attrs(v)}>
        ${dotOf(r)}<span class="nm">${faceHtml(v.face)} ${e(r.name) || '—'}</span>
        <span class="cell tech" dir="ltr">${e(r.url || '—')}</span><span class="cell">${e(t(STATE_KEYS[st]))}</span>
        <span class="cell">${e(fmt.avail(r.uptime_pct))}</span><span class="cell">${e(fmt.ms(r.latency_ms))}</span>${beatsHtml(r, t, fmt, 24)}
    </button>`;
}

export function listHeadHtml(t: T): string {
    return `<div class="tr tr--h" aria-hidden="true"><span></span><span>${e(t('infra.col_name'))}</span><span>${e(t('sessions.col_address'))}</span><span>${e(t('dockerpage.state'))}</span><span>24 h</span><span>${e(t('monitor.response'))}</span><span>${e(t('monitor.recent_checks'))}</span></div>`;
}

export function inventoryHtml(groups: RowGroup[], view: 'cards' | 'list', viewOf: (r: ServiceRow) => ServiceView, t: T, fmt: Fmt): string {
    return groups.map(g => {
        if (!g.rows.length) return '';
        const views = g.rows.map(viewOf);
        const body = view === 'cards'
            ? `<div class="cards">${views.map(v => cardHtml(v, t, fmt)).join('')}</div>`
            : `<div class="tbl tbl--mon">${listHeadHtml(t)}${views.map(v => rowHtml(v, t, fmt)).join('')}</div>`;
        return g.name
            ? `<section class="group"><div class="group__h"><span class="gpill">${e(g.name)}</span><span class="rule"></span></div>${body}</section>`
            : `<section class="group">${body}</section>`;
    }).join('');
}

export const noMatchHtml = (t: T, filtered: boolean): string => emptyHtml(t(filtered ? 'monitorpage.no_match' : 'monitor.overview_empty'));

/** The state chips of this page's toolbar: running, down, no data. */
export function stateChips(t: T): { id: StateFilter; label: string }[] {
    return [
        { id: 'all', label: t('infra.filter_all') }, { id: 'up', label: t('infra.filter_up') },
        { id: 'down', label: t('monitorpage.down') }, { id: 'none', label: t('monitor.status_unknown') },
    ];
}

// ── The outages tab ────────────────────────────────────────────────────────

export function outagesTabHtml(list: Outage[], shown: Outage[], range: RangeLabel, ranges: readonly RangeLabel[], filter: OutageFilter, t: T, fmt: Fmt, rows: Map<number, ServiceRow>): string {
    const tot = outageTotals(list);
    const sum = `<div class="inc-sum">
        <div class="card"><span class="lbl">${e(t('monitor.incidents'))} · ${e(range)}</span><b class="num">${e(fmt.num(tot.count))}</b><small>${e(t('monitorpage.ongoing'))}: ${e(fmt.num(tot.ongoing))}</small></div>
        <div class="card"><span class="lbl">${e(t('monitorpage.out_downtime'))}</span><b class="num">${e(tot.downSec ? fmt.span(tot.downSec) : '—')}</b><small>${e(t('monitorpage.out_downtime_sub'))}</small></div>
        <div class="card"><span class="lbl">${e(t('monitorpage.out_mean'))}</span><b class="num">${e(tot.meanRecoverySec === null ? '—' : fmt.span(tot.meanRecoverySec))}</b><small>${e(t('monitor.ev_recovered'))}: ${e(fmt.num(tot.recovered))}</small></div>
    </div>`;
    const chip = (id: OutageFilter, label: string, n: number) =>
        `<button type="button" class="fchip" data-ofilter="${id}" aria-pressed="${filter === id}">${e(label)} <span class="n">${e(fmt.num(n))}</span></button>`;
    const tools = `<div class="tools">${chip('all', t('infra.filter_all'), tot.count)}${chip('ongoing', t('monitorpage.ongoing'), tot.ongoing)}${chip('recovered', t('monitor.ev_recovered'), tot.recovered)}<span class="pspacer"></span>${rangeSegHtml('orange', range, ranges)}</div>`;
    const body = shown.length
        ? `<div class="card tasks">${shown.map(o => outageRowHtml(o, true, t, fmt, rows)).join('')}</div>`
        : emptyHtml(t('monitor.no_incidents'));
    return `${sum}${tools}${boxHtml(t('monitor.incidents'), body, fmt.num(shown.length))}`;
}

// ── The drawer: one service ────────────────────────────────────────────────

export interface DrawerHeadData {
    row: ServiceRow;
    face: string;
}

export function drawerHeadHtml(d: DrawerHeadData, t: T): string {
    const r = d.row, st = stateOf(r);
    return `<div class="dr__t"><span class="face face--lg">${d.face ? `<img src="${e(d.face)}" alt="">` : FACE_NONE}</span>
            <h2 title="${e(r.name)}">${e(r.name) || '—'}</h2>
            <button type="button" class="ibtn" id="dr-close" aria-label="${e(t('general.close'))}" title="${e(t('general.close'))}">${icon('x', 16)}</button></div>
        <div class="dr__chips">${stateDot(toneOf(r), t(STATE_KEYS[st]))}${r.url ? `<span class="chip">${tech(r.url)}</span>` : ''}${r.board ? `<span class="chip">${e(r.board)}</span>` : ''}</div>`;
}

/** The three windows, the chart, the heartbeat and the facts. */
export interface SummaryData {
    row: ServiceRow;
    /** The chart as drawn for the chosen range, or '' without readings. */
    chart: string;
    range: RangeLabel;
    ranges: readonly RangeLabel[];
    setup: MonitoringSetup | null;
}

export function summaryTabHtml(d: SummaryData, t: T, fmt: Fmt): string {
    const r = d.row;
    const live = (label: string, v: number) => `<div class="card"><span class="lbl">${e(label)}</span><b>${e(fmt.avail(v, 2))}</b>${v < 0 ? '' : `<div class="bar" data-l="${v >= 99 ? 'ok' : v >= 95 ? 'warn' : 'bad'}"><i style="inline-size:${Math.max(0, Math.min(100, v)).toFixed(1)}%"></i></div>`}</div>`;
    const chart = `<div class="card chart"><div class="chart__head"><span class="lbl">${e(t('monitor.response'))}</span>${rangeSegHtml('range', d.range, d.ranges)}</div>
        ${d.chart || `<div class="chart__empty">${e(t('monitor.no_data_yet'))}</div>`}</div>`;
    const fact = (k: string, v: string) => `<div class="fact"><span class="lbl">${e(k)}</span><div>${v}</div></div>`;
    const facts = [
        fact(t('monitorpage.f_last'), r.checked_at ? e(fmt.date(r.checked_at)) : '—'),
        fact(t('monitorpage.f_code'), r.status_code ? tech(String(r.status_code)) : '—'),
        fact(t('monitor.current'), e(fmt.ms(r.latency_ms))),
        fact(t('monitor.avg_24h'), e(fmt.ms(r.avg_ms_24h))),
        d.setup ? fact(t('monitorpage.f_interval'), e(t('monitorpage.every', { time: fmt.span(d.setup.interval_sec) }))) : '',
        d.setup ? fact(t('monitorpage.threshold'), e(fmt.num(d.setup.fail_threshold))) : '',
    ].join('');
    return `<div class="live3">${live('24 h', r.uptime_pct)}${live('7 d', r.uptime_7d)}${live('30 d', r.uptime_30d)}</div>
        ${chart}
        <div><span class="lbl">${e(t('monitor.recent_checks'))}</span><div style="margin-top:8px">${beatsHtml(r, t, fmt, BEATS, 'beats--lg')}</div></div>
        <div class="facts">${facts}</div>`;
}

export function outagesPanelHtml(list: Outage[], t: T, fmt: Fmt): string {
    return list.length
        ? `<div class="card tasks">${list.map(o => outageRowHtml({ ...o, item_id: undefined }, false, t, fmt)).join('')}</div>`
        : emptyHtml(t('monitor.no_incidents'));
}

export function checksTabHtml(checks: Check[], retentionSec: number, t: T, fmt: Fmt): string {
    const newest = [...checks].reverse().slice(0, 40);
    const lines = newest.map(c => c.up
        ? `<div class="chk"><span class="dim">${e(fmt.clock(c.checked_at))}</span><span>${e(c.status_code ? String(c.status_code) : '—')}</span><span>${e(fmt.ms(c.latency_ms))}</span><span class="dim">${e(t('monitorpage.check_ok'))}</span></div>`
        : `<div class="chk"><span class="dim">${e(fmt.clock(c.checked_at))}</span><span class="bad">${e(c.status_code ? String(c.status_code) : '—')}</span><span class="bad">—</span><span class="bad">${e(t('monitorpage.check_fail'))} · ${e(causeText(c.status_code, t))}</span></div>`).join('');
    return `<div class="note note--calm">${e(t('monitorpage.checks_note', { time: fmt.span(retentionSec) }))}</div>
        ${newest.length ? `<div class="card tasks">${lines}</div>` : emptyHtml(t('monitor.no_data_yet'))}`;
}

export function drawerFooterHtml(row: ServiceRow, t: T): string {
    const btn = (attr: string, label: string, ic: 'link' | 'trash', cls = '') =>
        `<button type="button" class="act${cls}" ${attr}>${icon(ic, 15)}<span>${e(label)}</span></button>`;
    return (row.url ? btn('data-act="visit"', t('monitorpage.open_service'), 'link') : '') + btn('data-act="clear"', t('monitor.clear_data'), 'trash', ' act--bad');
}
