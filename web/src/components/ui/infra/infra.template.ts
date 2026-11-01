import { escapeHtml } from '../../../services/escape';
import type { StatusFilter, SortKey, UnitCounts } from '../../../services/infraUnits';

/**
 * The pieces the infrastructure pages are drawn from, as pure functions: the
 * indicators, the tabs, the house box, the chart and the inventory toolbar.
 * Text the page itself says arrives through `t`, and what comes from a host is
 * escaped here and nowhere else.
 */

export type T = (key: string, params?: Record<string, string>) => string;

const e = escapeHtml;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ── Icons ──────────────────────────────────────────────────────────────────

const ICONS = {
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    mem: '<rect x="2.5" y="7" width="19" height="9" rx="1.5"/><path d="M6 16v2M10 16v2M14 16v2M18 16v2M6 10.5v2M10 10.5v2M14 10.5v2M18 10.5v2"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    server: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>',
    play: '<path d="M7 4.5v15l12-7.5-12-7.5z"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevR: '<path d="M9 6l6 6-6 6"/>',
    chevL: '<path d="M15 6l-6 6 6 6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v5M12 18h.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    disk: '<rect x="3" y="13" width="18" height="6" rx="1.5"/><path d="M3 13l2-8h14l2 8M7 16h.01M11 16h2"/>',
    bookmark: '<path d="M6 4h12v17l-6-4-6 4V4z"/>',
    pen: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 16, cls = ''): string {
    return `<svg class="ic${cls ? ' ' + cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

// ── Meters ─────────────────────────────────────────────────────────────────

export type Level = 'ok' | 'warn' | 'bad';

/** Green below 60, amber from 60, red from 90: the three steps every meter of the product uses. */
export function meterLevel(percent: number): Level {
    return percent >= 90 ? 'bad' : percent >= 60 ? 'warn' : 'ok';
}

/** A horizontal meter, filled to a percentage. */
export function barHtml(percent: number): string {
    const p = clamp(Number.isFinite(percent) ? percent : 0, 0, 100);
    return `<div class="bar" data-l="${meterLevel(p)}"><i style="inline-size:${p.toFixed(1)}%"></i></div>`;
}

/** A ring with the figure inside it. */
export function ringHtml(percent: number, level: Level, label: string): string {
    const r = 24;
    const c = 2 * Math.PI * r;
    const p = clamp(Number.isFinite(percent) ? percent : 0, 0, 100);
    const stroke = level === 'bad' ? 'var(--danger)' : level === 'warn' ? 'var(--warn)' : 'var(--ok)';
    return `<div class="ring"><svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
        <circle cx="29" cy="29" r="${r}" fill="none" stroke="var(--track)" stroke-width="5"/>
        <circle cx="29" cy="29" r="${r}" fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${((p / 100) * c).toFixed(1)} ${c.toFixed(1)}"/>
    </svg><b>${e(label)}</b></div>`;
}

/** A line of the last readings, as small as a word. Empty with fewer than two. */
export function sparkHtml(values: number[], opts: { max?: number } = {}): string {
    if (values.length < 2) return '<svg class="spark" aria-hidden="true"></svg>';
    const w = 100;
    const h = 30;
    const top = opts.max ?? Math.max(1e-9, ...values) * 1.15;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - (clamp(v, 0, top) / top) * (h - 4)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${line}L${w} ${h}L0 ${h}Z" fill="currentColor" opacity=".13"/><path d="${line}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

// ── Indicators ─────────────────────────────────────────────────────────────

export interface KpiSpec {
    label: string;
    icon: IconName;
    /** The figure, already formatted, and its unit. */
    value: string;
    unit?: string;
    /** Instead of the figure alone: a ring beside it. */
    ring?: { percent: number; level: Level; label: string };
    /** Two small lines under the figure. */
    sub?: [string, string];
    /** A meter under it. */
    bar?: number;
    spark?: number[];
    /** The colour the line is drawn in: the level of the figure it ends on. */
    sparkTone?: Level;
    chips?: { text: string; tone?: 'ok' | 'warn' | 'bad' | '' }[];
}

export function kpiHtml(k: KpiSpec): string {
    const chips = k.chips?.length
        ? `<div class="kpi__chips">${k.chips.map(c => `<span class="chip${c.tone ? ' chip--' + c.tone : ''}">${e(c.text)}</span>`).join('')}</div>`
        : '';
    return `<div class="card kpi">
        <div class="kpi__top"><span class="lbl">${e(k.label)}</span>${icon(k.icon, 16)}</div>
        <div class="kpi__main"><div class="kpi__v">${e(k.value)}${k.unit ? `<small>${e(k.unit)}</small>` : ''}</div>${k.ring ? ringHtml(k.ring.percent, k.ring.level, k.ring.label) : (k.spark && k.spark.length > 1 ? `<div class="kpi__spark" style="color:var(--${k.sparkTone === 'bad' ? 'danger' : k.sparkTone ?? 'ok'})">${sparkHtml(k.spark)}</div>` : '')}</div>
        ${k.bar !== undefined ? barHtml(k.bar) : ''}
        ${k.sub ? `<div class="kpi__sub"><span>${e(k.sub[0])}</span><span>${e(k.sub[1])}</span></div>` : ''}
        ${chips}
    </div>`;
}

// ── Tabs, boxes ────────────────────────────────────────────────────────────

export interface TabSpec { id: string; label: string; count?: number; bad?: boolean }

export function tabsHtml(tabs: TabSpec[], active: string, formatCount: (n: number) => string, cls = 'tab'): string {
    return tabs.map(tb => `<button type="button" class="${cls}" role="tab" data-tab="${e(tb.id)}" aria-selected="${tb.id === active}">${e(tb.label)}${
        tb.count !== undefined ? `<span class="n${tb.bad ? ' n--bad' : ''}">${e(formatCount(tb.count))}</span>` : ''}</button>`).join('');
}

/** The house box: its name is a pill sitting on the border. */
export function boxHtml(title: string, body: string, tail = ''): string {
    return `<section class="box"><span class="pill">${e(title)}${tail ? `<span class="pill__n">${e(tail)}</span>` : ''}</span>${body}</section>`;
}

/** The card a chart lives in: its name and legend on one side, a control or a chip on the other. */
export function chartCardHtml(title: string, legend: { name: string; color: string }[], right: string, chart: string, empty: string): string {
    return `<div class="card chart">
        <div class="chart__head"><div><span class="lbl">${e(title)}</span><div class="legend legend--below">${legend.map(l => `<span><i style="background:${l.color}"></i>${e(l.name)}</span>`).join('')}</div></div>${right}</div>
        ${chart || `<div class="chart__empty">${e(empty)}</div>`}
    </div>`;
}

export const emptyHtml = (title: string, hint = ''): string =>
    `<div class="empty"><b>${e(title)}</b>${hint ? e(hint) : ''}</div>`;

export const errorHtml = (message: string): string =>
    `<div class="err" role="alert">${icon('alert', 18)}<span>${e(message)}</span></div>`;

// ── Chart ──────────────────────────────────────────────────────────────────

/** `labels`, when given, are what the cursor reads out instead of the plotted value: a line drawn on another scale still says its own truth. */
export interface ChartSeries { name: string; color: string; data: number[]; labels?: string[] }

export interface ChartSpec {
    series: ChartSeries[];
    max: number;
    height?: number;
    /** The labels under the first and the last point. */
    edges: [string, string];
    /** Formats a value for the axis and the cursor. */
    fmt: (v: number) => string;
}

const CW = 640;
const PAD_L = 40;
const PAD_B = 22;
const PAD_T = 8;

/** Where in the chart the cursor is: the index of the point, and its x in the chart's own units. */
export function chartIndexAt(n: number, fraction: number): { index: number; x: number } {
    if (n < 2) return { index: 0, x: PAD_L };
    const iw = CW - PAD_L - 8;
    const x = clamp(fraction, 0, 1) * CW;
    const index = clamp(Math.round(((x - PAD_L) / iw) * (n - 1)), 0, n - 1);
    return { index, x: PAD_L + (index / (n - 1)) * iw };
}

export const CHART_WIDTH = CW;

/** An area chart. Numbers are SVG coordinates and never go through a locale. */
export function chartHtml(id: string, spec: ChartSpec): string {
    const h = spec.height ?? 190;
    const n = spec.series[0]?.data.length ?? 0;
    if (n < 2) return '';
    const iw = CW - PAD_L - 8;
    const ih = h - PAD_B - PAD_T;
    const X = (i: number) => PAD_L + (i / (n - 1)) * iw;
    const Y = (v: number) => PAD_T + ih - (clamp(v, 0, spec.max) / spec.max) * ih;
    const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD_T + ih - f * ih;
        return `<line x1="${PAD_L}" x2="${CW - 8}" y1="${y}" y2="${y}" stroke="var(--track)" ${f ? 'stroke-dasharray="2 4"' : ''}/>
            <text x="${PAD_L - 8}" y="${y + 3.5}" text-anchor="end" font-size="10" font-family="var(--font-mono)" fill="var(--text-dim)">${e(spec.fmt(f * spec.max))}</text>`;
    }).join('');
    const defs = spec.series.map((s, k) =>
        `<linearGradient id="${e(id)}-g${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".28"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`).join('');
    const paths = spec.series.map((s, k) => {
        const line = s.data.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
        return `<path d="${line}L${X(n - 1).toFixed(1)} ${PAD_T + ih}L${X(0).toFixed(1)} ${PAD_T + ih}Z" fill="url(#${e(id)}-g${k})"/>
            <path d="${line}" fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');
    // The edge labels are text in a drawing, so their start and end are physical: they are set from the data's own direction.
    const edge = (x: number, anchor: string, txt: string) =>
        `<text x="${x}" y="${h - 4}" text-anchor="${anchor}" font-size="10" font-family="var(--font-mono)" fill="var(--text-dim)">${e(txt)}</text>`;
    return `<div class="chart__wrap" data-chart="${e(id)}">
        <svg viewBox="0 0 ${CW} ${h}" role="img" aria-label="${e(spec.series.map(s => s.name).join(', '))}"><defs>${defs}</defs>${grid}${paths}${edge(PAD_L, 'start', spec.edges[0])}${edge(CW - 8, 'end', spec.edges[1])}
            <line class="cur" y1="${PAD_T}" y2="${PAD_T + ih}" stroke="var(--text-dim)" stroke-dasharray="3 3" opacity="0"/></svg>
        <div class="tip"></div>
    </div>`;
}

// ── The inventory toolbar ──────────────────────────────────────────────────

export interface ToolbarSpec {
    query: string;
    status: StatusFilter;
    counts: UnitCounts;
    sort: SortKey;
    grouped: boolean;
    view: 'cards' | 'list';
    searchLabel: string;
    groupLabel: string;
    /** The key that puts the cursor in the search box, as the person reads it. */
    shortcut: string;
}

const FILTER_KEYS: [StatusFilter, string][] = [
    ['all', 'infra.filter_all'], ['up', 'infra.filter_up'], ['off', 'infra.filter_off'], ['warn', 'infra.filter_warn'],
];
const SORT_KEYS: [SortKey, string][] = [
    ['name', 'infra.sort_name'], ['state', 'infra.sort_state'], ['cpu', 'infra.sort_cpu'], ['mem', 'infra.sort_mem'],
];

/** The options of the sort selector, in the shape the product's own select takes. */
export function sortOptions(t: T): { value: string; label: string }[] {
    return SORT_KEYS.map(([value, key]) => ({ value, label: t(key) }));
}

export function toolbarHtml(o: ToolbarSpec, t: T, fmt: (n: number) => string): string {
    const chips = FILTER_KEYS.map(([id, key]) =>
        `<button type="button" class="fchip" data-filter="${id}" aria-pressed="${o.status === id}">${e(t(key))} <span class="n">${e(fmt(o.counts[id]))}</span></button>`).join('');
    return `<div class="tools">
        <label class="search">${icon('search', 14)}<input id="inv-q" type="search" value="${e(o.query)}" placeholder="${e(o.searchLabel)}" aria-label="${e(o.searchLabel)}" autocomplete="off"><kbd>${e(o.shortcut)}</kbd></label>
        ${chips}
        <span class="pspacer"></span>
        <button type="button" class="fchip" id="inv-group" aria-pressed="${o.grouped}">${e(o.groupLabel)}</button>
        <app-select id="inv-sort" aria-label="${e(t('infra.sort'))}"></app-select>
        <span class="seg" role="group" aria-label="${e(t('infra.view'))}">
            <button type="button" data-view="cards" aria-pressed="${o.view === 'cards'}" title="${e(t('infra.view_cards'))}" aria-label="${e(t('infra.view_cards'))}">${icon('grid', 15)}</button>
            <button type="button" data-view="list" aria-pressed="${o.view === 'list'}" title="${e(t('infra.view_list'))}" aria-label="${e(t('infra.view_list'))}">${icon('list', 15)}</button>
        </span>
    </div>`;
}
