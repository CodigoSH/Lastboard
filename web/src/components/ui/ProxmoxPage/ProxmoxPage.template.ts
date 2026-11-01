import { escapeHtml } from '../../../services/escape';
import type { PxGuest, PxHost } from '../../../services/proxmoxApi';
import type { PxTask } from '../../../services/proxmoxTasks';
import type { UnitGroup } from '../../../services/infraUnits';
import {
    type AttentionItem, type FleetNode, type FleetStore, type FleetTotals, type AttentionReason,
} from '../../../services/proxmoxOverview';
import { barHtml, boxHtml, chartCardHtml, emptyHtml, icon, kpiHtml, meterLevel, type Level, type T } from '../infra/infra.template';
import { typeLabel, type Fmt as TaskFmt } from './ProxmoxTasks.template';

export type { T };

/**
 * The markup of the Proxmox page, as pure functions.
 *
 * Everything that comes from a hypervisor — names of machines, nodes, stores and
 * hosts, the kind of a store, the names of tasks — is written by somebody else
 * and goes through escapeHtml here and nowhere else. Text the page itself says
 * arrives through `t`, so these can be read and tested without the i18n singleton.
 */

/** How the page formats what depends on the language. */
export interface Fmt {
    num: (n: number) => string;
    /** A percentage given as 0–100, with up to one decimal. */
    pct: (n: number) => string;
    bytes: (n: number) => string;
    dec: (n: number) => string;
    /** An uptime in words, in full and in short, for the one that fits. */
    uptime: (sec: number) => { long: string; short: string };
}

const e = escapeHtml;
const tech = (v: string): string => `<span class="tech" dir="ltr">${e(v)}</span>`;

/** An uptime that is written in full where there is room and in short where there is not: the page picks, by measuring. */
export function uptimeHtml(fmt: Fmt, sec: number): string {
    const u = fmt.uptime(sec);
    return `<span data-uptime-long="${e(u.long)}" data-uptime-short="${e(u.short)}">${e(u.long)}</span>`;
}

const FACE_NONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';

/** A machine's face: the icon somebody chose, or the one the bookmark wears, or the board's own. */
export function faceHtml(url: string, cls = 'face'): string {
    return url
        ? `<span class="${cls}"><img src="${e(url)}" alt="" loading="lazy"></span>`
        : `<span class="${cls} ${cls}--none">${FACE_NONE}</span>`;
}

// ── The header ─────────────────────────────────────────────────────────────

/** "6/9 running · 3 stopped · 2 warnings" — the line under the page's name. */
export function summaryHtml(tt: FleetTotals, t: T, fmt: Fmt): string {
    const parts = [
        `<span><i class="dot dot--ok"></i><b>${e(fmt.num(tt.running))}</b>/${e(fmt.num(tt.guests))} ${e(t('widget.proxmox.running_label').toLowerCase())}</span>`,
        `<span><b>${e(fmt.num(tt.stopped))}</b> ${e(t('docker.state_stopped'))}</span>`,
    ];
    if (tt.attention) parts.push(`<span><i class="dot dot--bad"></i><b>${e(fmt.num(tt.attention))}</b> ${e(t('infra.filter_warn').toLowerCase())}</span>`);
    return parts.join('');
}

// ── Overview ───────────────────────────────────────────────────────────────

export interface OverviewData {
    totals: FleetTotals;
    attention: AttentionItem[];
    nodes: FleetNode[];
    stores: FleetStore[];
    hosts: PxHost[];
    cpuSpark: number[];
    /** The chart, already drawn, or '' while there is none. */
    chart: string;
    latest: { tasks: PxTask[]; where: string } | null;
    /** The ranges the history can be read over, and the one chosen. */
    ranges: { id: string; label: string }[];
    range: string;
}

const REASON_KEYS: Partial<Record<AttentionReason, string>> = { host_down: 'proxmox.connection_error' };

/** The sentence under an item of the attention list. */
export function reasonText(a: AttentionItem, t: T, fmt: Fmt): string {
    switch (a.reason) {
        case 'outage': return `${t('proxmox.stopped_breaks')} ${a.link ?? ''}`.trim();
        case 'cpu': return `${t('widget.telemetry.cpu')} ${fmt.pct(a.value)}`;
        case 'node_mem': return `${t('widget.telemetry.ram')} ${fmt.pct(a.value)}`;
        case 'store_full': return `${t('proxmox.storage')} ${fmt.pct(a.value)}`;
        default: return t(REASON_KEYS[a.reason] ?? 'proxmox.connection_error');
    }
}

export function attentionHtml(items: AttentionItem[], showHost: boolean, t: T, fmt: Fmt): string {
    if (!items.length) return `<div class="allok">${icon('check', 22)}<span>${e(t('infra.all_ok'))}</span></div>`;
    return `<div class="attn">${items.map(a => `<button type="button" class="attn__row" data-go="${e(a.kind)}" data-host="${e(a.hostId)}" data-ref="${e(a.ref)}">
        <span class="dot dot--${a.tone}"></span>
        <span class="attn__t"><b>${e(a.title)}</b><span>${e(reasonText(a, t, fmt))}${showHost && a.kind !== 'host' ? ` · ${e(a.hostName)}` : ''}</span></span>
        ${icon('chevR', 15)}
    </button>`).join('')}</div>`;
}

const nodeLevel = (n: FleetNode): Level => meterLevel(Math.max(n.cpu, n.mem, n.disk));
const DOT: Record<Level, string> = { ok: 'dot--ok', warn: 'dot--warn', bad: 'dot--bad' };

const meter = (label: string, percent: number, fmt: Fmt): string =>
    `<div class="mrow"><span>${e(label)}</span>${barHtml(percent)}<b>${e(fmt.pct(percent))}</b></div>`;

/** A node as a card: its name, what it is made of and its three loads. */
export function nodeCardHtml(n: FleetNode, showHost: boolean, t: T, fmt: Fmt): string {
    // One line: what it is made of, and how long it has been on.
    const made = n.cores > 0
        ? `${e(fmt.num(n.cores))} ${e(t('proxmox.cores').toLowerCase())} / ${e(fmt.num(n.threads))} ${e(t('proxmox.threads'))}`
        : `${e(fmt.num(n.threads))} ${e(t('proxmox.threads'))}`;
    return `<button type="button" class="card card--btn unit" data-go="node" data-host="${e(n.hostId)}" data-ref="${e(n.name)}">
        <div class="unit__h"><span class="dot ${DOT[nodeLevel(n)]}"></span><span class="unit__n">${e(n.name)}</span>${showHost ? `<span class="unit__tail unit__tail--near"><span class="chip">${e(n.hostName)}</span></span>` : ''}</div>
        <div class="unit__sub unit__sub--split"><span>${made}</span><span class="fit" title="${e(t('proxmox.uptime'))}">${icon('clock', 12)}${uptimeHtml(fmt, n.uptime)}</span></div>
        <div class="unit__m">${meter(t('widget.telemetry.cpu'), n.cpu, fmt)}${meter(t('widget.telemetry.ram'), n.mem, fmt)}${meter(t('widget.proxmox.disk'), n.disk, fmt)}</div>
    </button>`;
}

/** A store as a row of a card: its name and kind, how full it is, and the figures. */
export function storeRowHtml(s: FleetStore, showHost: boolean, t: T, fmt: Fmt): string {
    return `<button type="button" class="task task--store" data-go="store" data-host="${e(s.hostId)}" data-ref="${e(s.name)}" data-node="${e(s.node)}">
        <span class="task__main"><b>${e(s.name)}</b><small>${e(s.kind)}${s.shared ? ' · ' + e(t('proxmoxpage.shared')) : ''}${showHost ? ' · ' + e(s.hostName) : ''}</small></span>
        <span class="task__bar">${barHtml(s.percent)}</span>
        <span class="task__r"><b>${e(fmt.pct(s.percent))}</b><br>${e(fmt.bytes(s.used))} / ${e(fmt.bytes(s.total))}</span>
    </button>`;
}

function latestTasksHtml(latest: NonNullable<OverviewData['latest']>, t: T, tfmt: TaskFmt): string {
    if (!latest.tasks.length) return `<div class="card"><div class="chart__empty">${e(t('proxmox.tasks_empty'))}</div></div>`;
    const tone = { ok: 'ok', error: 'bad', warning: 'warn', running: 'warn' } as const;
    return `<div class="card tasks">${latest.tasks.slice(0, 5).map(k => `<div class="task">
        <span class="dot dot--${tone[k.state]}${k.state === 'running' ? ' dot--pulse' : ''}"></span>
        <span class="task__main"><b>${e(typeLabel(k.type, t))}${k.id ? ` ${tech(k.id)}` : ''}</b><small>${tech(k.user)} · ${e(tfmt.time(k.start))}${k.message ? ` · <span class="why why--${k.state}">${e(k.message)}</span>` : ''}</small></span>
        <span class="task__r">${k.end ? e(tfmt.span(Math.max(0, k.end - k.start))) : e(t('proxmox.task_state_running'))}</span></div>`).join('')}</div>`;
}

export function overviewHtml(o: OverviewData, t: T, fmt: Fmt, tfmt: TaskFmt): string {
    const tt = o.totals;
    const runningPct = tt.guests ? (tt.running / tt.guests) * 100 : 0;
    const memPct = tt.memTotal > 0 ? (tt.memUsed / tt.memTotal) * 100 : 0;
    const ringLevel: Level = tt.outages ? 'bad' : tt.stopped ? 'warn' : 'ok';
    const worst = tt.worstStore;
    const showHost = o.hosts.length > 1;

    const kpis = [
        kpiHtml({
            label: t('proxmox.machines'), icon: 'server', value: fmt.num(tt.running), unit: `/ ${fmt.num(tt.guests)}`,
            ring: { percent: runningPct, level: ringLevel, label: `${fmt.num(Math.round(runningPct))}%` },
            chips: [
                { text: `● ${fmt.num(tt.running)} ${t('docker.state_running')}`, tone: 'ok' },
                ...(tt.stopped ? [{ text: `${fmt.num(tt.stopped)} ${t('docker.state_stopped')}`, tone: (tt.outages ? 'bad' : 'warn') as 'bad' | 'warn' }] : []),
                { text: `${fmt.num(tt.lxc)} LXC` }, { text: `${fmt.num(tt.vm)} VM` },
            ],
        }),
        kpiHtml({
            label: t('widget.telemetry.cpu'), icon: 'cpu', value: fmt.num(Math.round(tt.cpu)), unit: '%', bar: tt.cpu, spark: o.cpuSpark, sparkTone: meterLevel(tt.cpu),
            sub: [`${t('proxmox.nodes')}: ${fmt.num(tt.nodes)}`, `${t('proxmox.threads')}: ${fmt.num(tt.threads)}`],
        }),
        kpiHtml({
            label: t('widget.telemetry.ram'), icon: 'mem', value: tt.memTotal ? fmt.bytes(tt.memUsed) : '—', unit: tt.memTotal ? `/ ${fmt.bytes(tt.memTotal)}` : undefined,
            bar: tt.memTotal ? memPct : undefined,
            sub: tt.memTotal ? [`${fmt.pct(memPct)} ${t('proxmox.used').toLowerCase()}`, `${fmt.bytes(tt.memTotal - tt.memUsed)} ${t('widget.api.label.freespace').toLowerCase()}`] : undefined,
        }),
        kpiHtml({
            label: t('proxmox.storage'), icon: 'disk', value: worst ? fmt.num(Math.round(worst.percent)) : '—', unit: worst ? `% · ${worst.name}` : undefined,
            bar: worst ? worst.percent : undefined,
            sub: worst ? [`${t('proxmox.storage')}: ${fmt.num(tt.storeCount)}`, `${fmt.bytes(tt.storeFree)} ${t('widget.api.label.freespace').toLowerCase()}`] : undefined,
        }),
    ].join('');

    const seg = `<div class="seg seg--text" role="group">${o.ranges.map(r => `<button type="button" data-range="${e(r.id)}" aria-pressed="${r.id === o.range}">${e(r.label)}</button>`).join('')}</div>`;
    const chart = chartCardHtml(t('proxmoxpage.history'),
        [{ name: t('widget.telemetry.cpu'), color: 'var(--ok)' }, { name: t('widget.telemetry.ram'), color: 'var(--warn)' }], seg, o.chart, t('dockerpage.collecting'));

    const nodes = o.nodes.length ? `<div class="cards">${o.nodes.map(n => nodeCardHtml(n, showHost, t, fmt)).join('')}</div>` : `<div class="chart__empty">${e(t('proxmox.not_configured'))}</div>`;
    const stores = o.stores.length
        ? `<div class="card tasks">${[...o.stores].sort((a, b) => b.percent - a.percent).slice(0, 5).map(s => storeRowHtml(s, showHost, t, fmt)).join('')}</div>`
        : `<div class="card"><div class="chart__empty">${e(t('dockerpage.none'))}</div></div>`;
    const hosts = showHost
        ? boxHtml(t('proxmox.hypervisors'), `<div class="cards">${o.hosts.map(h => {
            const shape = h.error ? t('proxmox.connection_error') : h.cluster ? `${t('proxmox.cluster')} · ${fmt.num(h.nodes.length)}` : t('proxmox.single_node');
            const up = (h.guests || []).filter(g => g.running).length;
            return `<article class="card unit"><div class="unit__h"><span class="dot ${h.error ? 'dot--bad' : 'dot--ok'}"></span><span class="unit__n">${e(h.name)}</span></div>
                <div class="unit__sub"><span>${e(shape)}</span></div>
                ${h.error ? '' : `<div class="kpi__sub"><span>${e(fmt.num(up))}/${e(fmt.num((h.guests || []).length))} ${e(t('docker.state_running'))}</span></div>`}</article>`;
        }).join('')}</div>`, fmt.num(o.hosts.length))
        : '';

    return `<div class="kpis">${kpis}</div>
        <div class="grid g-main" style="margin-block-start:26px">${chart}${boxHtml(t('dockerpage.attention'), attentionHtml(o.attention, showHost, t, fmt))}</div>
        ${boxHtml(t('proxmox.nodes'), nodes, fmt.num(o.nodes.length))}
        <div class="grid g-2">${boxHtml(t('proxmox.storage'), stores, t('proxmoxpage.by_use'))}${o.latest ? boxHtml(t('proxmoxpage.latest_tasks'), latestTasksHtml(o.latest, t, tfmt), o.latest.where) : ''}</div>
        ${hosts}`;
}

// ── The inventory of machines ──────────────────────────────────────────────

/** One machine as the inventory sees it. */
export interface GuestView {
    hostId: string;
    hostName: string;
    showHost: boolean;
    guest: PxGuest;
    /** The bookmark that backs it, if any. */
    link: string;
    /** The face's address, already resolved; '' for none. */
    face: string;
    selected: boolean;
}

const dotTone = (v: GuestView): 'ok' | 'warn' | 'bad' | '' =>
    !v.guest.running ? (v.link ? 'bad' : '') : v.guest.cpu >= 90 ? 'warn' : 'ok';
const dotOf = (v: GuestView): string => { const tone = dotTone(v); return `<span class="dot${tone ? ' dot--' + tone : ''}"></span>`; };
const kindText = (g: PxGuest): string => `${g.kind === 'lxc' ? 'LXC' : 'VM'} ${g.vmid}`;
const attrs = (v: GuestView): string => `data-host="${e(v.hostId)}" data-vmid="${v.guest.vmid}"`;
const bookmarkChip = (v: GuestView): string => v.link ? `<span class="chip chip--link" title="${e(v.link)}">${icon('bookmark', 11)}<span class="chip__t">${e(v.link)}</span></span>` : '';
const ramPct = (g: PxGuest): number => (g.mem_total > 0 ? (g.mem / g.mem_total) * 100 : 0);

export function cardHtml(v: GuestView, t: T, fmt: Fmt): string {
    const g = v.guest;
    const meters = g.running
        ? `<div class="unit__m">
            <div class="mrow"><span>CPU</span>${barHtml(g.cpu)}<b>${e(fmt.pct(g.cpu))}</b></div>
            <div class="mrow"><span>RAM</span>${barHtml(ramPct(g))}<b>${e(fmt.bytes(g.mem))}</b></div></div>`
        : `<div class="unit__off">${e(t('docker.state_stopped'))}${v.link ? ` · ${e(t('proxmox.stopped_breaks'))} ${e(v.link)}` : ''}</div>`;
    return `<button type="button" class="card card--btn unit${g.running ? '' : ' is-off'}${v.selected ? ' is-sel' : ''}" ${attrs(v)}>
        <div class="unit__h">${dotOf(v)}${faceHtml(v.face)}<span class="unit__n">${e(g.name) || '—'}</span><span class="unit__tail">${bookmarkChip(v)}</span></div>
        <div class="unit__sub">${tech(kindText(g))}<span>· ${e(g.node)}</span>${v.showHost ? `<span>· ${e(v.hostName)}</span>` : ''}</div>
        ${meters}
    </button>`;
}

export function rowHtml(v: GuestView, t: T, fmt: Fmt): string {
    const g = v.guest;
    return `<button type="button" class="tr${g.running ? '' : ' is-off'}${v.selected ? ' is-sel' : ''}" ${attrs(v)}>
        ${dotOf(v)}<span class="nm">${faceHtml(v.face)} ${e(g.name) || '—'}${v.showHost ? ` <span class="dim">· ${e(v.hostName)}</span>` : ''}</span>
        <span class="cell tech" dir="ltr">${e(kindText(g))} · ${e(g.node)}</span>
        <span class="cell">${e(t(g.running ? 'docker.state_running' : 'docker.state_stopped'))}</span>
        <span class="cell">${g.running ? e(fmt.pct(g.cpu)) : '—'}</span><span class="cell">${g.running ? e(fmt.bytes(g.mem)) : '—'}</span>
    </button>`;
}

export function listHeadHtml(t: T): string {
    return `<div class="tr tr--h" aria-hidden="true"><span></span><span>${e(t('infra.col_name'))}</span><span>${e(t('proxmoxpage.col_where'))}</span><span>${e(t('dockerpage.state'))}</span><span>CPU</span><span>RAM</span></div>`;
}

/** The inventory: groups of cards or rows. `viewOf` turns a unit id back into what it draws. */
export function inventoryHtml(groups: UnitGroup[], view: 'cards' | 'list', viewOf: (id: string) => GuestView | undefined, t: T, fmt: Fmt, withHeads: boolean): string {
    return groups.map(g => {
        const views = g.units.map(u => viewOf(u.id)).filter((x): x is GuestView => !!x);
        if (!views.length) return '';
        const head = withHeads ? `<div class="group__h"><span class="gpill">${e(g.name)}</span><span class="rule"></span></div>` : '';
        const body = view === 'cards'
            ? `<div class="cards">${views.map(v => cardHtml(v, t, fmt)).join('')}</div>`
            : `<div class="tbl">${listHeadHtml(t)}${views.map(v => rowHtml(v, t, fmt)).join('')}</div>`;
        return `<section class="group">${head}${body}</section>`;
    }).join('');
}

export const noMatchHtml = (t: T, filtered: boolean): string => emptyHtml(t(filtered ? 'dockerpage.no_match' : 'widget.proxmox.empty'));

/** A hypervisor that did not answer, in its own words. */
export function hostErrorHtml(key: string, hostName: string, t: T): string {
    return `<div class="err" role="alert">${icon('alert', 18)}<span><b>${e(hostName)}</b> ${e(t(key))}</span></div>`;
}

// ── Storage ────────────────────────────────────────────────────────────────

export function storageTabHtml(stores: FleetStore[], showHost: boolean, t: T, fmt: Fmt): string {
    if (!stores.length) return emptyHtml(t('dockerpage.none'));
    const order = [...new Set(stores.map(s => s.hostId))];
    return order.map(id => {
        const mine = stores.filter(s => s.hostId === id).sort((a, b) => b.percent - a.percent);
        return boxHtml(mine[0].hostName, `<div class="card tasks">${mine.map(s => storeRowHtml(s, false, t, fmt)).join('')}</div>`, showHost ? fmt.num(mine.length) : '');
    }).join('');
}

// ── The drawer ─────────────────────────────────────────────────────────────

export interface GuestDrawer {
    view: GuestView;
    hostName: string;
    /** The two charts, drawn, or '' while the history has not arrived. */
    chart: string;
    canPower: boolean;
    busy: boolean;
    bookmarkUrl: string;
    hasChosenIcon: boolean;
    uptime: number;
}

export function guestHeadHtml(d: GuestDrawer, t: T): string {
    const g = d.view.guest;
    const kind = t(g.kind === 'lxc' ? 'proxmox.container' : 'proxmox.vm');
    return `<div class="dr__t">
            <button type="button" class="face face--edit" data-icon="${g.vmid}" title="${e(t('proxmox.icon_set'))}" aria-label="${e(t('proxmox.icon_set'))}">${d.view.face ? `<img src="${e(d.view.face)}" alt="">` : FACE_NONE}<span class="face__pen">${icon('pen', 11)}</span></button>
            <h2 title="${e(g.name)}">${e(g.name) || '—'}</h2>
            <button type="button" class="ibtn" id="dr-close" aria-label="${e(t('general.close'))}" title="${e(t('general.close'))}">${icon('x', 16)}</button></div>
        <div class="dr__chips"><span class="chip chip--${g.running ? 'ok' : (d.view.link ? 'bad' : 'warn')}">${e(t(g.running ? 'docker.state_running' : 'docker.state_stopped'))}</span>
            <span class="chip">${e(kind)} ${tech(String(g.vmid))}</span><span class="chip">${e(g.node)}</span>${d.view.showHost ? `<span class="chip">${e(d.hostName)}</span>` : ''}${bookmarkChip(d.view)}</div>`;
}

const fact = (k: string, v: string, wide = false): string => `<div class="fact${wide ? ' fact--w' : ''}"><span class="lbl">${e(k)}</span><div>${v}</div></div>`;

export function guestSummaryHtml(d: GuestDrawer, t: T, fmt: Fmt): string {
    const g = d.view.guest;
    const warn = !g.running && d.view.link
        ? `<div class="err" role="alert">${icon('alert', 18)}<span><b>${e(t('proxmox.stopped_title'))}</b> · ${e(t('proxmox.stopped_breaks'))} <em>${e(d.view.link)}</em></span></div>`
        : '';
    const live = g.running
        ? `<div class="live3">
            <div class="card"><span class="lbl">CPU</span><b>${e(fmt.pct(g.cpu))}</b>${barHtml(g.cpu)}</div>
            <div class="card"><span class="lbl">RAM</span><b>${e(fmt.bytes(g.mem))}</b>${barHtml(ramPct(g))}</div>
            <div class="card"><span class="lbl">${e(t('proxmox.uptime'))}</span><b class="fit">${uptimeHtml(fmt, d.uptime)}</b></div></div>`
        : '';
    const facts = [
        fact(t('proxmox.state'), e(t(g.running ? 'docker.state_running' : 'docker.state_stopped'))),
        fact(t('widget.api.extra_node'), tech(g.node)),
        g.running && g.mem_total > 0 ? fact(t('widget.telemetry.ram'), e(`${fmt.bytes(g.mem)} / ${fmt.bytes(g.mem_total)}`)) : '',
        fact(t('proxmox.bookmark'), d.view.link ? e(d.view.link) : '—'),
    ].join('');
    return `${warn}${live}${d.chart}<div class="facts">${facts}</div>`;
}

export function guestFooterHtml(d: GuestDrawer, t: T): string {
    const g = d.view.guest;
    const btn = (attr: string, label: string, ic: 'play' | 'stop' | 'link' | 'x', extra = '', off = false) =>
        `<button type="button" class="act${extra}" ${attr}${off ? ' disabled' : ''}>${icon(ic, 15)}<span>${e(label)}</span></button>`;
    return [
        d.canPower ? (g.running
            ? btn('data-power="1"', t('docker.action_stop'), 'stop', ' act--bad', d.busy)
            : btn('data-power="1"', t('docker.action_start'), 'play', '', d.busy)) : '',
        d.bookmarkUrl ? btn(`data-open="${e(d.bookmarkUrl)}"`, t('proxmox.open_bookmark'), 'link') : '',
        d.hasChosenIcon ? btn('data-icon-clear="1"', t('proxmox.icon_clear'), 'x') : '',
    ].join('');
}

export interface NodeDrawer {
    node: FleetNode;
    /** CPU and memory history, drawn. */
    chart: string;
    uptime: number;
    load: string;
}

export function nodeHeadHtml(n: FleetNode, showHost: boolean, t: T): string {
    return `<div class="dr__t"><span class="dot ${DOT[nodeLevel(n)]}"></span><h2 title="${e(n.name)}">${e(n.name)}</h2>
            <button type="button" class="ibtn" id="dr-close" aria-label="${e(t('general.close'))}" title="${e(t('general.close'))}">${icon('x', 16)}</button></div>
        <div class="dr__chips"><span class="chip">${e(t('widget.api.extra_node'))}</span>${showHost ? `<span class="chip">${e(n.hostName)}</span>` : ''}<span class="chip">${e(t('proxmox.machines'))}: ${e(String(n.guests))}</span></div>`;
}

export function nodeSummaryHtml(d: NodeDrawer, t: T, fmt: Fmt): string {
    const n = d.node;
    const live = `<div class="live3">
        <div class="card"><span class="lbl">CPU</span><b>${e(fmt.pct(n.cpu))}</b>${barHtml(n.cpu)}</div>
        <div class="card"><span class="lbl">RAM</span><b>${e(fmt.pct(n.mem))}</b>${barHtml(n.mem)}</div>
        <div class="card"><span class="lbl">${e(t('widget.proxmox.disk'))}</span><b>${e(fmt.pct(n.disk))}</b>${barHtml(n.disk)}</div></div>`;
    const facts = [
        fact(t('proxmox.threads'), e(fmt.num(n.threads))),
        n.cores > 0 ? fact(t('proxmox.cores'), e(fmt.num(n.cores))) : '',
        fact(t('widget.telemetry.ram'), e(`${fmt.bytes(n.mem_used)} / ${fmt.bytes(n.mem_total)}`)),
        n.disk_total > 0 ? fact(t('widget.proxmox.disk'), e(`${fmt.bytes(n.disk_used)} / ${fmt.bytes(n.disk_total)}`)) : '',
        fact(t('proxmox.uptime'), uptimeHtml(fmt, d.uptime)),
        fact(t('proxmox.load'), e(d.load)),
    ].join('');
    return `${live}${d.chart}<div class="facts">${facts}</div>`;
}

export function storeHeadHtml(s: FleetStore, showHost: boolean, t: T): string {
    return `<div class="dr__t"><span class="dot ${DOT[meterLevel(s.percent)]}"></span><h2 title="${e(s.name)}">${e(s.name)}</h2>
            <button type="button" class="ibtn" id="dr-close" aria-label="${e(t('general.close'))}" title="${e(t('general.close'))}">${icon('x', 16)}</button></div>
        <div class="dr__chips"><span class="chip">${e(t('proxmox.storage'))}</span><span class="chip">${tech(s.kind)}</span>${s.shared ? `<span class="chip">${e(t('proxmoxpage.shared'))}</span>` : ''}${showHost ? `<span class="chip">${e(s.hostName)}</span>` : ''}</div>`;
}

export function storeSummaryHtml(s: FleetStore, t: T, fmt: Fmt): string {
    const free = Math.max(0, s.total - s.used);
    const warn = s.percent >= 90
        ? `<div class="err" role="alert">${icon('alert', 18)}<span><b>${e(t('proxmox.almost_full'))}</b> · ${e(t('widget.api.label.freespace'))}: ${e(fmt.bytes(free))}</span></div>`
        : '';
    return `${warn}<div class="live3"><div class="card"><span class="lbl">${e(t('proxmox.used'))}</span><b>${e(fmt.pct(s.percent))}</b>${barHtml(s.percent)}</div>
        <div class="card"><span class="lbl">${e(t('proxmox.used'))}</span><b>${e(fmt.bytes(s.used))}</b></div>
        <div class="card"><span class="lbl">${e(t('widget.api.label.freespace'))}</span><b>${e(fmt.bytes(free))}</b></div></div>
        <div class="facts">${fact(t('docker.host_type'), tech(s.kind))}${fact(t('widget.api.extra_node'), tech(s.node))}${fact(t('proxmox.used'), e(`${fmt.bytes(s.used)} / ${fmt.bytes(s.total)}`), true)}</div>`;
}
