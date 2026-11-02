import { escapeHtml } from '../../../services/escape';
import { containerName, type DockerContainer, type DockerHost } from '../../../services/dockerShared';
import { stateLevel, stateKey, type ContainerStats, type DockerDetail, type HostRows, type LogLine } from '../../../services/dockerPage';
import { attentionReason, type AttentionItem, type AttentionReason, type DockerTotals, type LinkOf, type ProjectRow } from '../../../services/dockerOverview';
import type { UnitGroup } from '../../../services/infraUnits';
import { niceMax } from '../../../services/dockerOverview';
import { barHtml, bookmarkChipHtml, boxHtml, chartCardHtml, emptyHtml, FACE_NONE, faceHtml, icon, kpiHtml, meterLevel, type Level, type T } from '../infra/infra.template';

export type { T };

/**
 * The markup of the Docker page, as pure functions.
 *
 * Everything that comes from a container — its name, image, paths, variable
 * names, and above all what it prints — is written by somebody else and goes
 * through escapeHtml here and nowhere else. Text the page itself says arrives
 * through `t`, so these can be read and tested without the i18n singleton.
 */

/** How the page formats what depends on the language. */
export interface Fmt {
    /** A moment, in the app's language. */
    date: (iso: string) => string;
    /** A whole number. */
    num: (n: number) => string;
    /** A percentage, with one decimal. */
    pct: (n: number) => string;
    /** A size in bytes. */
    bytes: (n: number) => string;
    /** A figure with up to two decimals. */
    dec: (n: number) => string;
}

const e = escapeHtml;

/** A value that is a machine's, not a sentence: addresses and paths stay left-to-right in any language. */
const tech = (v: string, cls = ''): string => `<span class="tech${cls ? ' ' + cls : ''}" dir="ltr">${e(v)}</span>`;

// ── What a container's state looks like ────────────────────────────────────

/** The dot a container wears: green running, amber when it needs a look, red when it is failing, grey when stopped. */
export function dotTone(c: DockerContainer, linked = false): 'ok' | 'warn' | 'bad' | '' {
    const reason = attentionReason(c, linked);
    if (reason === 'unhealthy' || reason === 'failed' || reason === 'outage') return 'bad';
    if (reason === 'restarting' || reason === 'paused') return 'warn';
    return stateLevel(c.State || c.Status) === 'up' ? 'ok' : '';
}

const dotHtml = (c: DockerContainer, linked = false): string => {
    const tone = dotTone(c, linked);
    return `<span class="dot${tone ? ' dot--' + tone : ''}"></span>`;
};

const REASON_KEYS: Record<AttentionReason, string> = {
    unhealthy: 'dockerpage.why_unhealthy',
    restarting: 'dockerpage.why_restarting',
    failed: 'dockerpage.why_failed',
    outage: 'docker.state_stopped',
    paused: 'dockerpage.why_paused',
};

export function reasonText(reason: AttentionReason, exitCode: number | undefined, t: T): string {
    return t(REASON_KEYS[reason], { code: String(exitCode ?? '') });
}

const HEALTH_KEYS: Record<string, string> = {
    healthy: 'dockerpage.health_healthy',
    unhealthy: 'dockerpage.health_unhealthy',
    starting: 'dockerpage.health_starting',
};

/** The chip for a container's own check; nothing when it has none. */
export function healthChip(health: string | undefined, t: T): string {
    if (!health) return '';
    const tone = health === 'healthy' ? 'ok' : health === 'unhealthy' ? 'bad' : 'warn';
    return `<span class="chip chip--${tone}">${e(HEALTH_KEYS[health] ? t(HEALTH_KEYS[health]) : health)}</span>`;
}

// ── The header ─────────────────────────────────────────────────────────────

/** "3/5 running · 2 stopped · 1 warning" — the line under the page's name. */
export function summaryHtml(tt: DockerTotals, t: T, fmt: Fmt): string {
    const parts = [
        `<span><i class="dot dot--ok"></i><b>${e(fmt.num(tt.running))}</b>/${e(fmt.num(tt.total))} ${e(t('docker.state_running'))}</span>`,
        `<span><b>${e(fmt.num(tt.stopped))}</b> ${e(t('docker.state_stopped'))}</span>`,
    ];
    if (tt.attention) parts.push(`<span><i class="dot dot--bad"></i><b>${e(fmt.num(tt.attention))}</b> ${e(t('infra.filter_warn').toLowerCase())}</span>`);
    return parts.join('');
}

// ── Overview ───────────────────────────────────────────────────────────────

export interface OverviewData {
    totals: DockerTotals;
    attention: AttentionItem[];
    projects: ProjectRow[];
    hosts: HostRows[];
    /** The last readings, for the small lines under the figures. */
    cores: number[];
    mem: number[];
    /** The chart, already drawn, or '' while there is not enough history. */
    chart: string;
    hostNames: Record<string, string>;
    /** The bookmark a container serves, by host and name. */
    linkOf: LinkOf;
    /** What each host's running containers use, as a share of the host; null where the host did not say how big it is. */
    hostUse: Record<string, { cpu: number | null; mem: number | null }>;
    /** What the hosts in view have, when every one of them said; null otherwise, and the figures are read against what was seen. */
    capacity: { cores: number; mem: number } | null;
}

export function attentionHtml(items: AttentionItem[], showHost: boolean, hostNames: Record<string, string>, t: T): string {
    if (!items.length) return `<div class="allok">${icon('check', 22)}<span>${e(t('dockerpage.all_ok'))}</span></div>`;
    return `<div class="attn">${items.map(a => {
        const tone = a.reason === 'unhealthy' || a.reason === 'failed' || a.reason === 'outage' ? 'bad' : 'warn';
        const host = showHost ? ` · ${e(hostNames[a.hostId] ?? '')}` : '';
        // A stopped container that a bookmark depends on says which service goes with it.
        const breaks = a.link && (a.reason === 'outage' || a.reason === 'failed') ? ` · ${e(t('proxmox.stopped_breaks'))} ${e(a.link)}` : '';
        return `<button type="button" class="attn__row" data-host="${e(a.hostId)}" data-name="${e(a.name)}">
            <span class="dot dot--${tone}"></span>
            <span class="attn__t"><b>${e(a.name)}</b><span>${e(reasonText(a.reason, a.exitCode, t))}${breaks}${host}</span></span>
            ${icon('chevR', 15)}
        </button>`;
    }).join('')}</div>`;
}

export function overviewHtml(o: OverviewData, t: T, fmt: Fmt): string {
    const tt = o.totals;
    const pctRunning = tt.total ? (tt.running / tt.total) * 100 : 0;
    const level: Level = tt.attention ? 'bad' : tt.stopped ? 'warn' : 'ok';
    // Failing its own check or ended with an error is critical; restarting and paused are only a warning.
    const critical = o.attention.filter(a => a.reason === 'unhealthy' || a.reason === 'failed' || a.reason === 'outage').length;
    // With the size of the hosts the CPU is a share of them; without it (an agent from before the call) it is read against the chart's own top.
    const cap = o.capacity;
    const cpuTop = niceMax(Math.max(tt.cores, ...o.cores));
    const cpuPct = cap ? Math.min(100, (tt.cores / cap.cores) * 100) : (tt.cores / cpuTop) * 100;
    const memBase = cap ? cap.mem : tt.memLimit;
    const memShare = memBase > 0 ? (tt.memUsed / memBase) * 100 : 0;
    const kpis = [
        kpiHtml({
            label: t('dockerpage.kpi_containers'), icon: 'box', value: fmt.num(tt.running), unit: `/ ${fmt.num(tt.total)}`,
            ring: { percent: pctRunning, level, label: `${fmt.num(Math.round(pctRunning))}%` },
            chips: [
                { text: `${fmt.num(tt.stopped)} ${t('docker.state_stopped')}`, tone: '' },
                ...(tt.attention ? [{ text: `${fmt.num(tt.attention)} ${t('infra.filter_warn').toLowerCase()}`, tone: 'bad' as const }] : []),
            ],
        }),
        kpiHtml(cap ? {
            label: t('dockerpage.kpi_cpu'), icon: 'cpu', value: fmt.num(Math.round(cpuPct)), unit: '%',
            bar: cpuPct, spark: o.cores, sparkTone: meterLevel(cpuPct),
            sub: [t('dockerpage.reporting', { count: fmt.num(tt.reporting) }), t('dockerpage.host_threads', { count: fmt.num(cap.cores) })],
        } : {
            label: t('dockerpage.kpi_cpu'), icon: 'cpu', value: fmt.dec(tt.cores), unit: t('dockerpage.cores_in_use'),
            bar: cpuPct, spark: o.cores, sparkTone: meterLevel(cpuPct),
            sub: [t('dockerpage.reporting', { count: fmt.num(tt.reporting) }), t('dockerpage.bar_scale', { cores: fmt.dec(cpuTop) })],
        }),
        kpiHtml({
            label: t('dockerpage.kpi_memory'), icon: 'mem', value: tt.reporting ? fmt.bytes(tt.memUsed) : '—',
            bar: memBase > 0 ? memShare : undefined, spark: o.mem, sparkTone: meterLevel(memShare),
            sub: memBase > 0 ? [t('dockerpage.of_limit', { limit: fmt.bytes(memBase) }), fmt.pct(memShare)] : undefined,
        }),
        kpiHtml({
            label: t('dockerpage.attention'), icon: 'alert', value: fmt.num(o.attention.length), unit: t('infra.filter_warn').toLowerCase(),
            sub: [t('dockerpage.attention_sub'), ''],
            chips: [
                { text: `${fmt.num(critical)} ${t('dockerpage.critical')}`, tone: 'bad' },
                { text: `${fmt.num(o.attention.length - critical)} ${t('infra.filter_warn').toLowerCase()}`, tone: 'warn' },
            ],
        }),
    ].join('');

    const chart = chartCardHtml(t('dockerpage.session_history'),
        cap
            ? [{ name: t('widget.telemetry.cpu'), color: 'var(--ok)' }, { name: t('widget.telemetry.ram'), color: 'var(--warn)' }]
            : [{ name: t('dockerpage.cores_in_use'), color: 'var(--ok)' }, { name: t('dockerpage.mem_of_limit'), color: 'var(--warn)' }],
        `<span class="chip">${e(t('dockerpage.live'))}</span>`, o.chart, t('dockerpage.collecting'));

    const showHost = o.hosts.length > 1;
    const attn = boxHtml(t('dockerpage.attention'), attentionHtml(o.attention, showHost, o.hostNames, t));

    // A project as a card: how its containers are doing, each one named in the colour of its own state.
    const projectCards = o.projects.map(p => {
        const mine = o.hosts.filter(h => h.host.id === p.host.id).flatMap(h => h.containers.filter(c => c.Project === p.name));
        const tones = mine.map(c => dotTone(c, !!o.linkOf(p.host.id, containerName(c))));
        const tone = tones.includes('bad') ? 'bad' : tones.includes('warn') ? 'warn' : 'ok';
        return `<button type="button" class="card card--btn unit" data-project="${e(p.name)}"${showHost ? ` title="${e(p.host.name)}"` : ''}><div class="unit__h"><span class="dot dot--${tone}"></span><span class="unit__n">${e(p.name)}</span>
            <span class="unit__tail"><span class="chip">${e(fmt.num(p.running))}/${e(fmt.num(p.total))}</span></span></div>
            <div class="unit__sub">${mine.map(c => { const k = dotTone(c, !!o.linkOf(p.host.id, containerName(c))); return `<span class="chip${k ? ' chip--' + k : ''}">${e(containerName(c))}</span>`; }).join('')}</div></button>`;
    }).join('');
    const projects = o.projects.length ? `<div class="cards">${projectCards}</div>` : `<div class="card"><div class="chart__empty">${e(t('dockerpage.no_projects'))}</div></div>`;

    const TYPE_KEYS: Record<string, string> = { agent: 'docker.host_tag_agent', tcp: 'docker.host_type_tcp', tls: 'docker.host_type_tls', local: 'docker.host_type_local' };
    const hostCards = o.hosts.map(h => {
        const up = h.containers.filter(c => stateLevel(c.State || c.Status) === 'up').length;
        const use = o.hostUse[h.host.id];
        const tone = h.error ? 'bad' : 'ok';
        return `<button type="button" class="card card--btn unit" data-hostcard="${e(h.host.id)}"><div class="unit__h"><span class="dot dot--${tone}"></span><span class="unit__n">${e(h.host.name)}</span>
            <span class="unit__tail"><span class="chip">${e(t(TYPE_KEYS[h.host.type] ?? 'docker.host_type'))}</span></span></div>
            <div class="unit__sub">${h.host.url ? tech(h.host.url) : ''}</div>
            ${h.error ? `<div class="unit__off">${e(t(h.error))}</div>` : h.loaded
                ? `<div class="kpi__sub"><span>${e(fmt.num(up))}/${e(fmt.num(h.containers.length))} ${e(t('docker.state_running'))}</span><span>${use && use.cpu !== null && use.mem !== null ? `CPU ${e(fmt.pct(use.cpu))} · RAM ${e(fmt.pct(use.mem))}` : ''}</span></div>` : ''}</button>`;
    }).join('');
    const hosts = `<div class="cards">${hostCards}</div>`;

    return `<div class="kpis">${kpis}</div>
        <div class="grid g-main" style="margin-block-start:12px">${chart}${attn}</div>
        ${boxHtml(t('dockerpage.projects'), projects, fmt.num(o.projects.length))}
        ${boxHtml(t('docker.hosts'), hosts, fmt.num(o.hosts.length))}`;
}

// ── The inventory ──────────────────────────────────────────────────────────

/** One container as the inventory sees it. */
export interface UnitView {
    hostId: string;
    hostName: string;
    showHost: boolean;
    container: DockerContainer;
    stats?: ContainerStats;
    /** The label of the bookmark it serves, or ''. */
    link: string;
    /** The face's address, already resolved; '' for none. */
    face: string;
    selected: boolean;
}

function meterRow(label: string, percent: number, value: string): string {
    return `<div class="mrow"><span>${e(label)}</span>${barHtml(percent)}<b>${e(value)}</b></div>`;
}

function stoppedLine(c: DockerContainer, link: string, t: T, fmt: Fmt): string {
    const state = c.State || c.Status;
    return e(t(stateKey(state)))
        + (typeof c.ExitCode === 'number' && c.ExitCode !== 0 ? ` · ${e(t('dockerpage.exit_code'))} ${e(fmt.num(c.ExitCode))}` : '')
        + (link ? ` · ${e(t('proxmox.stopped_breaks'))} ${e(link)}` : '');
}

const dataAttrs = (v: UnitView): string => `data-host="${e(v.hostId)}" data-name="${e(containerName(v.container))}"`;

export function cardHtml(v: UnitView, t: T, fmt: Fmt): string {
    const c = v.container;
    const up = stateLevel(c.State || c.Status) === 'up';
    const s = v.stats;
    const meters = up
        ? `<div class="unit__m">${s
            ? meterRow('CPU', Math.min(100, s.CPUPercent), fmt.pct(s.CPUPercent)) + meterRow('RAM', s.MemPercent, fmt.bytes(s.MemUsed))
            : meterRow('CPU', 0, '—') + meterRow('RAM', 0, '—')}</div>`
        : `<div class="unit__off">${stoppedLine(c, v.link, t, fmt)}</div>`;
    return `<button type="button" class="card card--btn unit${up ? '' : ' is-off'}${v.selected ? ' is-sel' : ''}" ${dataAttrs(v)}>
        <div class="unit__h">${faceHtml(v.face)}<span class="unit__n">${e(containerName(c)) || '—'}</span><span class="unit__tail">${healthChip(c.Health, t)}${bookmarkChipHtml(v.link)}${dotHtml(c, !!v.link)}</span></div>
        <div class="unit__sub">${tech(c.Image || '—')}${v.showHost ? `<span>· ${e(v.hostName)}</span>` : ''}</div>
        ${meters}
    </button>`;
}

export function rowHtml(v: UnitView, t: T, fmt: Fmt): string {
    const c = v.container;
    const up = stateLevel(c.State || c.Status) === 'up';
    const s = v.stats;
    const state = healthChip(c.Health, t) || `<span class="cell">${e(t(stateKey(c.State || c.Status)))}</span>`;
    const cpu = up && s ? fmt.pct(s.CPUPercent) : '—';
    const mem = up && s ? fmt.bytes(s.MemUsed) : '—';
    return `<button type="button" class="tr${up ? '' : ' is-off'}${v.selected ? ' is-sel' : ''}" ${dataAttrs(v)}>
        ${dotHtml(c, !!v.link)}<span class="nm">${faceHtml(v.face)} ${e(containerName(c)) || '—'}${v.showHost ? ` <span class="dim">· ${e(v.hostName)}</span>` : ''}</span>
        <span class="cell tech" dir="ltr">${e(c.Image || '—')}</span>${state}<span class="cell">${e(cpu)}</span><span class="cell">${e(mem)}</span>
    </button>`;
}

export function listHeadHtml(t: T): string {
    return `<div class="tr tr--h" aria-hidden="true"><span></span><span>${e(t('infra.col_name'))}</span><span>${e(t('dockerpage.image'))}</span><span>${e(t('dockerpage.state'))}</span><span>CPU</span><span>RAM</span></div>`;
}

/** The inventory: groups of cards or rows. `viewOf` turns a unit id back into what it draws. */
export function inventoryHtml(groups: UnitGroup[], view: 'cards' | 'list', viewOf: (id: string) => UnitView | undefined, t: T, fmt: Fmt, withHeads: boolean): string {
    return groups.map(g => {
        const views = g.units.map(u => viewOf(u.id)).filter((x): x is UnitView => !!x);
        if (!views.length) return '';
        const head = withHeads
            ? `<div class="group__h"><span class="gpill">${e(g.name || t('dockerpage.no_project'))}</span><span class="rule"></span></div>`
            : '';
        const body = view === 'cards'
            ? `<div class="cards">${views.map(v => cardHtml(v, t, fmt)).join('')}</div>`
            : `<div class="tbl">${listHeadHtml(t)}${views.map(v => rowHtml(v, t, fmt)).join('')}</div>`;
        return `<section class="group">${head}${body}</section>`;
    }).join('');
}

/** A host that did not answer, in its own words. */
export function hostErrorHtml(key: string, hostName: string, t: T): string {
    return `<div class="err" role="alert">${icon('alert', 18)}<span><b>${e(hostName)}</b> ${e(t(key))}</span></div>`;
}

export const noMatchHtml = (t: T, filtered: boolean): string =>
    emptyHtml(t(filtered ? 'dockerpage.no_match' : 'docker.no_containers'));

// ── The drawer ─────────────────────────────────────────────────────────────

export interface DrawerHeadData {
    host: DockerHost;
    container: DockerContainer;
    showHost: boolean;
    link: string;
    face: string;
}

/** Name and the chips under it. */
export function drawerHeadHtml(d: DrawerHeadData, t: T): string {
    const c = d.container;
    const state = c.State || c.Status;
    const label = t(stateKey(state));
    const tone = dotTone(c, !!d.link);
    return `<div class="dr__t">
            <button type="button" class="face face--edit" data-icon="1" title="${e(t('proxmox.icon_set'))}" aria-label="${e(t('proxmox.icon_set'))}">${d.face ? `<img src="${e(d.face)}" alt="">` : FACE_NONE}<span class="face__pen">${icon('pen', 11)}</span></button>
            <h2 title="${e(containerName(c))}">${e(containerName(c)) || '—'}</h2>${bookmarkChipHtml(d.link)}
            <button type="button" class="ibtn" id="dr-close" aria-label="${e(t('general.close'))}" title="${e(t('general.close'))}">${icon('x', 16)}</button></div>
        <div class="dr__chips"><span class="dot state-dot${tone ? ' dot--' + tone : ''}" role="img" tabindex="0" title="${e(label)}" aria-label="${e(label)}"></span>${healthChip(c.Health, t)}${d.showHost ? `<span class="chip">${e(d.host.name)}</span>` : ''}${c.Project ? `<span class="chip">${tech(c.Project)}</span>` : ''}</div>`;
}

export interface FooterData {
    container: DockerContainer;
    canControl: boolean;
    busy: boolean;
    bookmarkUrl: string;
    hasChosenIcon: boolean;
}

/** The actions: start for what is stopped, restart and stop for what runs. Nothing without the permission. */
export function footerHtml(d: FooterData, t: T): string {
    const running = stateLevel(d.container.State || d.container.Status) !== 'off';
    // The agent that serves this very page must not be stopped from it.
    const isAgent = containerName(d.container) === 'lastboard-agent';
    const btn = (action: string, ic: 'play' | 'rotate' | 'stop', label: string, off = false, bad = false) =>
        `<button type="button" class="act${bad ? ' act--bad' : ''}" data-action="${action}" title="${e(label)}"${d.busy || off ? ' disabled' : ''}>${d.busy ? icon('refresh', 15, 'spin') : icon(ic, 15)}<span>${e(label)}</span></button>`;
    const side = (attr: string, label: string, ic: 'link' | 'x') =>
        `<button type="button" class="act" ${attr}>${icon(ic, 15)}<span>${e(label)}</span></button>`;
    const control = !d.canControl ? ''
        : running
            ? btn('restart', 'rotate', t('docker.action_restart')) + btn('stop', 'stop', isAgent ? t('docker.action_stop_disabled') : t('docker.action_stop'), isAgent, true)
            : btn('start', 'play', t('docker.action_start'));
    return control
        + (d.bookmarkUrl ? side(`data-open="${e(d.bookmarkUrl)}"`, t('proxmox.open_bookmark'), 'link') : '')
        + (d.hasChosenIcon ? side('data-icon-clear="1"', t('proxmox.icon_clear'), 'x') : '');
}

const fact = (k: string, v: string, wide = false): string =>
    `<div class="fact${wide ? ' fact--w' : ''}"><span class="lbl">${e(k)}</span><div>${v}</div></div>`;

/** `0.0.0.0:8080 → 80/tcp`; an IPv6 address is bracketed, an unpublished port is only the container's. */
export function portText(p: { container: string; host_ip: string; host_port: string }): string {
    if (!p.host_port) return p.container;
    const ip = p.host_ip.includes(':') ? `[${p.host_ip}]` : (p.host_ip || '0.0.0.0');
    return `${ip}:${p.host_port} → ${p.container}`;
}

const none = (t: T): string => `<div class="chart__empty">${e(t('dockerpage.none'))}</div>`;

/** The summary tab: live readings, the facts, then the ports. */
export function summaryTabHtml(d: DockerDetail, c: DockerContainer, stats: ContainerStats | undefined, link: string, t: T, fmt: Fmt): string {
    const running = stateLevel(d.state) !== 'off';
    const warn = !running && link
        ? `<div class="err" role="alert">${icon('alert', 18)}<span><b>${e(t('proxmox.stopped_title'))}</b> · ${e(t('proxmox.stopped_breaks'))} <em>${e(link)}</em></span></div>`
        : '';
    const date = (iso?: string) => (iso ? e(fmt.date(iso)) : '—');
    const live = running && stats
        ? `<div class="live3">
            <div class="card"><span class="lbl">CPU</span><b>${e(fmt.pct(stats.CPUPercent))}</b>${barHtml(Math.min(100, stats.CPUPercent))}</div>
            <div class="card"><span class="lbl">RAM</span><b>${e(fmt.bytes(stats.MemUsed))}</b>${barHtml(stats.MemPercent)}</div>
            <div class="card"><span class="lbl">${e(t('dockerpage.restarts'))}</span><b>${e(fmt.num(d.restart_count))}</b></div>
        </div>`
        : '';
    const facts = [
        fact(t('dockerpage.health'), d.health ? healthChip(d.health, t) : '—'),
        fact(t('dockerpage.started'), date(d.started_at)),
        // A stopped container is asked how it ended; a running one has not.
        !running || d.exit_code !== 0 ? fact(t('dockerpage.exit_code'), tech(String(d.exit_code))) : '',
        !running && d.finished_at ? fact(t('dockerpage.finished'), date(d.finished_at)) : '',
        fact(t('dockerpage.restart_policy'), tech(d.restart_policy || 'no')),
        running ? '' : fact(t('dockerpage.restarts'), e(fmt.num(d.restart_count))),
        fact(t('dockerpage.created'), date(d.created)),
        d.tty ? fact(t('dockerpage.terminal'), e(t('dockerpage.yes'))) : '',
        fact(t('dockerpage.image'), tech(d.image), true),
        c.Project ? fact(t('dockerpage.project'), tech(c.Project), true) : '',
        link ? fact(t('proxmox.bookmark'), e(link), true) : '',
    ].join('');
    const ports = d.ports.length
        ? `<ul class="list">${d.ports.map(p => `<li>${tech(portText(p))}</li>`).join('')}</ul>`
        : none(t);
    return `${warn}${live}<div class="facts">${facts}</div>${boxHtml(t('dockerpage.ports'), ports)}`;
}

/** The environment tab: the names, never the values. */
export function envTabHtml(d: DockerDetail, t: T): string {
    const names = d.env.length ? `<div class="names">${d.env.map(n => `<code dir="ltr">${e(n)}</code>`).join('')}</div>` : none(t);
    return `<div class="note">${e(t('dockerpage.env_note'))}</div>${boxHtml(t('dockerpage.env'), names)}`;
}

/** The mounts and networks tab. */
export function mountsTabHtml(d: DockerDetail, t: T): string {
    const mounts = d.mounts.length
        ? `<ul class="list">${d.mounts.map(m => `<li><span>${tech(m.destination)}<br><span class="dim">${m.type ? e(m.type) + ' · ' : ''}${tech(m.name || m.source)}</span></span>
            <span class="mode mode--${m.read_only ? 'ro' : 'rw'}">${e(t(m.read_only ? 'dockerpage.read_only' : 'dockerpage.read_write'))}</span></li>`).join('')}</ul>`
        : none(t);
    const nets = d.networks.length
        ? `<ul class="list">${d.networks.map(n => `<li><span>${e(n.name)}</span>${n.ipv4 ? tech(n.ipv4) : ''}</li>`).join('')}</ul>`
        : none(t);
    return `${boxHtml(t('dockerpage.mounts'), mounts)}${boxHtml(t('dockerpage.networks'), nets)}`;
}

// ── The log ────────────────────────────────────────────────────────────────

/** The log viewer, built once: it is moved between the Logs tab and the drawer, so its state is one. */
export function logViewerHtml(t: T, moreCount: string): string {
    return `<div class="logv">
        <div class="logv__bar">
            <button type="button" class="tg" id="lg-follow" aria-pressed="false">${icon('down', 12)}<span>${e(t('dockerpage.follow'))}</span></button>
            <button type="button" class="tg" id="lg-ts" aria-pressed="false">${icon('clock', 12)}<span>${e(t('dockerpage.timestamps'))}</span></button>
            <span class="logv__gap"></span>
            <button type="button" class="tg" id="lg-more"><span>${e(t('dockerpage.load_more', { count: moreCount }))}</span></button>
            <button type="button" class="tg" id="lg-copy">${icon('copy', 12)}<span>${e(t('dockerpage.copy'))}</span></button>
        </div>
        <div class="logv__note" id="lg-note" hidden>${e(t('dockerpage.logs_truncated'))}</div>
        <div class="logbox" id="lg-box" role="log" aria-live="off" tabindex="0"></div>
        <div class="logv__state" id="lg-state" hidden></div>
    </div>`;
}

/**
 * One log line. The text is the container's, so it is escaped; the stream says
 * whether it is an error line, and `stamp` is the time as the person reads it.
 */
export function logLineHtml(l: LogLine, stamp: string): string {
    const err = l.stream === 'err';
    return `<div class="ll${err ? ' ll--err' : ''}"><time class="ll__t" datetime="${e(l.t)}">${e(stamp)}</time><span class="ll__x">${e(l.text)}</span></div>`;
}

/** Re-exported so the page decides colours with the same steps the meters use. */
export { meterLevel };
