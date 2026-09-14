import { adoptSharedStyles } from '../../../services/sharedStyles';
import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { escapeHtml } from '../../../services/escape';
import { loadProxmoxLinks, proxmoxLinks } from '../../../services/proxmoxLinks';
import { resolveIconUrl } from '../../../services/iconUrl';
import css from './ProxmoxPage.css' with { type: 'text' };

interface PxNode {
    name: string; status: string;
    cpu: number; mem: number; disk: number;
    threads: number; cores: number; mem_total: number;
    uptime: number; loadavg: string[] | null; guests: number;
}

interface PxGuest {
    vmid: number; name: string; kind: 'lxc' | 'qemu'; node: string;
    running: boolean; cpu: number; mem: number; mem_total: number; uptime: number;
}

interface PxStore {
    name: string; node: string; kind: string;
    used: number; total: number; percent: number; shared: boolean;
}

interface PxOverview {
    cluster: boolean;
    caps: { read: boolean; power: boolean };
    nodes: PxNode[];
    guests: PxGuest[];
    stores: PxStore[];
}

interface PxSeries { range: string; cpu: number[]; mem: number[]; points: number; raw: number }

/** A bookmark that says which machine backs it. */
interface Backed { label: string; url: string; icon: string }

const ICON_SERVER = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
const ICON_CHEVRON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
const ICON_BOOK = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
/** The board's own fallback for a bookmark with no icon. */
const ICON_FALLBACK = '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';

const fmtBytes = (n: number): string => {
    if (!n || n < 0) return '—';
    const u = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${i18n.formatNumber ? i18n.formatNumber(Math.round(v * 10) / 10) : (Math.round(v * 10) / 10)} ${u[i]}`;
};

const fmtUptime = (sec: number): string => {
    if (!sec || sec < 0) return '—';
    const d = Math.floor(sec / 86400);
    if (d >= 1) return `${d} d`;
    const h = Math.floor(sec / 3600);
    if (h >= 1) return `${h} h`;
    return `${Math.max(1, Math.floor(sec / 60))} min`;
};

const level = (p: number) => (p >= 90 ? 'bad' : p >= 60 ? 'warn' : '');

/**
 * The hypervisor, as a page of the board.
 *
 * The constraint that shaped it: what does this do that the Proxmox console at
 * :8006 does not? Not administration — that console is one click away and does
 * it better. What only this can do is show the machines beside the bookmarks
 * they serve, and say that a service stopped answering because the container
 * under it is down.
 */
class ProxmoxPage extends HTMLElement {
    private data: PxOverview | null = null;
    private error = '';
    private loaded = false;
    private range: '1h' | '24h' | '7d' = '24h';
    private query = '';
    private onlyStopped = false;
    private timer: ReturnType<typeof setInterval> | null = null;
    private busy = new Set<number>();
    private _built = false;
    private _keydown: (e: KeyboardEvent) => void;
    private _unsubscribeI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
        this._keydown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || !this.hasAttribute('open')) return;
            const dlg = this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null;
            if (dlg?.open) return;   // the sheet closes itself first
            this.close();
        };
    }

    connectedCallback() {
        this._build();
        window.addEventListener('keydown', this._keydown);
        this._unsubscribeI18n = i18n.subscribe(() => { if (this.hasAttribute('open')) this.paint(); });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
        if (this.timer) clearInterval(this.timer);
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    open() {
        this.setAttribute('open', '');
        eventBus.emit(EVENTS.PROXMOX_PAGE_CHANGED, { open: true });
        this.load();
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.load(), 15000);
    }

    close() {
        this.removeAttribute('open');
        eventBus.emit(EVENTS.PROXMOX_PAGE_CHANGED, { open: false });
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        const dlg = this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null;
        if (dlg?.open) dlg.close();
    }

    // ── Data ──

    private async load() {
        // The links come from every board, not the one behind this page, so a
        // machine is flagged the same wherever the visitor happened to be.
        loadProxmoxLinks().then(() => { if (this.hasAttribute('open')) this.paint(); }).catch(() => { });
        try {
            this.data = await apiService.get<PxOverview>('/api/proxmox/overview');
            this.error = '';
        } catch (e: any) {
            const key = typeof e?.message === 'string' ? e.message.trim() : '';
            this.error = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(key) ? key : 'proxmox.connection_error';
        }
        this.loaded = true;
        this.paint();
    }

    /**
     * The bookmark a machine backs, if its owner said so.
     *
     * This is the whole point of the page, and it needed no column and no
     * migration: the association lives in the bookmark's own content. The index
     * spans every board — see proxmoxLinks for why that is not a detail.
     */
    private backing(g: PxGuest): Backed | null {
        const link = proxmoxLinks().get(g.vmid);
        if (!link) return null;
        if (link.node && link.node !== g.node) return null;
        return { label: link.label, url: link.url, icon: link.icon };
    }

    // ── Markup ──

    private _build() {
        if (this._built) return;
        this._built = true;
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            <div class="pp">
                <header class="pp__header">
                    <div class="pp__title">${ICON_SERVER}<span id="pp-title"></span></div>
                    <button class="pp__close" id="pp-close" aria-label="${escapeHtml(i18n.t('general.close'))}">${ICON_CLOSE}</button>
                </header>
                <div class="pp__status" id="pp-status"></div>
                <div class="pp__body" id="pp-body"></div>
            </div>
            <dialog id="pp-sheet"><div class="sheet" id="pp-sheet-body"></div></dialog>`;

        this.shadowRoot!.addEventListener('click', this.onClick);
        this.shadowRoot!.addEventListener('input', this.onInput);
        const dlg = this.shadowRoot!.querySelector('dialog') as HTMLDialogElement;
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
        this.paint();
    }

    private meter(k: string, pct: number) {
        const l = level(pct);
        return `<span class="metric">
            <span class="metric__k">${escapeHtml(k)}</span>
            <span class="bar"><i class="${l}" style="width:${Math.min(100, Math.max(0, pct))}%"></i></span>
            <span class="metric__v ${l ? 'metric__v--' + l : ''}">${Math.round(pct)} %</span>
        </span>`;
    }

    private nodeCard(n: PxNode) {
        const state = level(Math.max(n.cpu, n.mem, n.disk)) === 'bad' ? 'bad'
            : level(Math.max(n.cpu, n.mem, n.disk)) === 'warn' ? 'warn' : 'up';
        const load = (n.loadavg && n.loadavg.length) ? n.loadavg[0] : '—';
        return `<button class="card node" data-node="${escapeHtml(n.name)}">
            <span class="node__head">
                <span class="dot dot--${state}"></span>
                <span class="node__name">${escapeHtml(n.name)}</span>
                <span class="node__tail">${n.threads} ${escapeHtml(i18n.t('proxmox.threads'))}</span>
            </span>
            ${this.meter(i18n.t('widget.telemetry.cpu'), n.cpu)}
            ${this.meter(i18n.t('widget.telemetry.ram'), n.mem)}
            ${this.meter(i18n.t('widget.proxmox.disk'), n.disk)}
            <span class="node__foot">
                <span>${escapeHtml(fmtUptime(n.uptime))} · ${escapeHtml(i18n.t('proxmox.load'))} ${escapeHtml(load)} · ${n.guests}</span>
                <span class="node__go">${ICON_CHEVRON}</span>
            </span>
        </button>`;
    }

    private storeCard(s: PxStore) {
        const l = level(s.percent);
        return `<button class="card store" data-store="${escapeHtml(s.name)}">
            <span class="store__r1">
                <span class="store__name">${escapeHtml(s.name)}</span>
                <span class="store__kind">${escapeHtml(s.kind)}</span>
                <span class="store__pct ${l ? 'store__pct--' + l : ''}">${Math.round(s.percent)}%</span>
            </span>
            <span class="bar" style="height:5px"><i class="${l || 'ok'}" style="width:${s.percent}%"></i></span>
            <span class="store__r3"><span>${escapeHtml(fmtBytes(s.used))} / ${escapeHtml(fmtBytes(s.total))}</span><span>${escapeHtml(s.node)}</span></span>
        </button>`;
    }

    private tile(g: PxGuest) {
        const book = this.backing(g);
        // A machine that is off on purpose, with nothing behind it, has no
        // reason to shout. One that takes a bookmark down with it does.
        const flag = !g.running && !!book;
        const mem = g.mem_total > 0 ? Math.round((g.mem / g.mem_total) * 100) : 0;

        const icon = book?.icon
            ? `<span class="ico"><img src="${escapeHtml(resolveIconUrl(book.icon))}" alt="" loading="lazy"></span>`
            : `<span class="ico ico--none">${ICON_FALLBACK}</span>`;

        return `<button class="card tile${g.running ? '' : ' tile--off'}${flag ? ' tile--flag' : ''}" data-guest="${g.vmid}">
            <span class="tile__st tile__st--${g.running ? 'up' : (flag ? 'bad' : 'off')}"></span>
            <span class="tile__t1">${icon}<span class="tile__name">${escapeHtml(g.name) || '—'}</span></span>
            <span class="tile__t2">
                ${g.running
                    ? `<span class="tile__num">${g.cpu}<small>%</small></span>`
                    : `<span class="tile__num">${escapeHtml(i18n.t('docker.state_stopped'))}</span>`}
            </span>
            <span class="tile__t3">
                <span class="ty ty--${g.kind === 'lxc' ? 'lxc' : 'vm'}">${g.kind === 'lxc' ? 'LXC' : 'VM'}</span>
                <span class="tile__meta">${g.vmid}${g.running ? ` · ${mem}%` : ''}</span>
                ${book ? `<span class="tile__book" title="${escapeHtml(book.label)}">${ICON_BOOK}</span>` : ''}
            </span>
        </button>`;
    }

    private visibleGuests(): PxGuest[] {
        const all = this.data?.guests ?? [];
        const q = this.query.trim().toLowerCase();
        return all.filter(g => {
            if (this.onlyStopped && g.running) return false;
            if (!q) return true;
            return g.name.toLowerCase().includes(q) || String(g.vmid).includes(q);
        });
    }

    private paintStatus() {
        const el = this.shadowRoot?.getElementById('pp-status');
        if (!el) return;
        const d = this.data;
        const guests = d?.guests ?? [];
        const running = guests.filter(g => g.running).length;
        const down = guests.filter(g => !g.running && !!this.backing(g)).length;

        // "Cluster" is what the host says, not what we assume: a standalone node
        // is the common case and must not be called one.
        const who = d?.cluster ? i18n.t('proxmox.cluster') : (d?.nodes[0]?.name ?? '');

        el.innerHTML = `
            <span class="stat"><span class="dot dot--up"></span> <b>${escapeHtml(who)}</b></span>
            <span class="stat"><b>${running}</b>/${guests.length} ${escapeHtml(i18n.t('widget.proxmox.running_label').toLowerCase())}</span>
            <span class="stat stat--hot ${down ? 'stat--click' : ''} ${this.onlyStopped ? 'stat--on' : ''}" id="pp-down"
                  ${down ? 'role="button" tabindex="0"' : ''}>
                ${escapeHtml(i18n.t('proxmox.services_down'))}: <b>${down}</b>
            </span>
            <span class="pp__right">
                <span class="search">${ICON_SEARCH}
                    <input type="search" id="pp-search" value="${escapeHtml(this.query)}"
                           placeholder="${escapeHtml(i18n.t('proxmox.search'))}"
                           aria-label="${escapeHtml(i18n.t('proxmox.search'))}">
                </span>
                <span class="ranges" role="group">
                    ${(['1h', '24h', '7d'] as const).map(r =>
                        `<button data-range="${r}" aria-pressed="${this.range === r}">${r}</button>`).join('')}
                </span>
            </span>`;
    }

    private paint() {
        if (!this._built) return;
        const title = this.shadowRoot?.getElementById('pp-title');
        if (title) title.textContent = i18n.t('widget.proxmox.name');
        this.paintStatus();
        this.paintBody();
    }

    private paintBody() {
        const body = this.shadowRoot?.getElementById('pp-body');
        if (!body) return;

        if (!this.loaded) { body.innerHTML = `<div class="state">${escapeHtml(i18n.t('general.loading'))}</div>`; return; }
        if (this.error) { body.innerHTML = `<div class="state">${escapeHtml(i18n.t(this.error))}</div>`; return; }

        const d = this.data!;
        const stores = [...d.stores].sort((a, b) => b.percent - a.percent);
        const worstStore = stores[0];
        const guests = this.visibleGuests();

        // Stable order — by kind, then by id. Never by state: this page polls,
        // and a grid that reorders itself moves tiles out from under the
        // pointer every time a machine changes.
        const ordered = [...guests].sort((a, b) =>
            a.kind === b.kind ? a.vmid - b.vmid : (a.kind === 'lxc' ? -1 : 1));

        const rack = d.nodes.map(n => {
            const mine = ordered.filter(g => g.node === n.name);
            if (!mine.length) return '';
            const lxc = mine.filter(g => g.kind === 'lxc').length;
            return `<div class="group">
                <div class="group__head">
                    <span class="dot dot--up"></span>
                    <span class="sec__label">${escapeHtml(n.name)}</span>
                    <span class="group__count">${lxc} LXC · ${mine.length - lxc} VM</span>
                </div>
                <div class="tiles">${mine.map(g => this.tile(g)).join('')}</div>
            </div>`;
        }).join('');

        const worstNode = [...d.nodes].sort((a, b) =>
            Math.max(b.cpu, b.mem, b.disk) - Math.max(a.cpu, a.mem, a.disk))[0];
        const peak = worstNode ? Math.round(Math.max(worstNode.cpu, worstNode.mem, worstNode.disk)) : 0;

        body.innerHTML = `
            <section class="sec">
                <div class="sec__head">
                    <span class="sec__label">${escapeHtml(i18n.t('proxmox.nodes'))}</span>
                    <span class="sec__rule"></span>
                    <span class="sec__note ${level(peak) ? 'sec__note--' + level(peak) : ''}">
                        ${d.nodes.length} · ${escapeHtml(i18n.t('proxmox.peak'))} <b>${peak}%</b></span>
                </div>
                <div class="nodes">${d.nodes.map(n => this.nodeCard(n)).join('')}</div>
            </section>

            <section class="sec">
                <div class="sec__head">
                    <span class="sec__label">${escapeHtml(i18n.t('proxmox.storage'))}</span>
                    <span class="sec__rule"></span>
                    ${worstStore ? `<span class="sec__note ${level(worstStore.percent) ? 'sec__note--' + level(worstStore.percent) : ''}">
                        ${stores.length} · <b>${escapeHtml(worstStore.name)} ${Math.round(worstStore.percent)}%</b></span>` : ''}
                </div>
                <div class="stores">${stores.map(s => this.storeCard(s)).join('')}</div>
            </section>

            <section class="sec">
                <div class="sec__head">
                    <span class="sec__label">${escapeHtml(i18n.t('proxmox.machines'))}</span>
                    <span class="sec__rule"></span>
                    <span class="sec__note">${guests.length}${this.query || this.onlyStopped ? ` / ${d.guests.length}` : ''}</span>
                </div>
                ${rack || `<div class="state">${escapeHtml(i18n.t('widget.proxmox.empty'))}</div>`}
            </section>`;
    }

    // ── The detail sheet ──

    private sheet(title: string, sub: string, inner: string) {
        const box = this.shadowRoot?.getElementById('pp-sheet-body');
        const dlg = this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null;
        if (!box || !dlg) return;
        box.innerHTML = `
            <div class="sheet__head">
                <div><h3>${title}</h3><div class="sheet__sub">${sub}</div></div>
                <button class="pp__close" data-close aria-label="${escapeHtml(i18n.t('general.close'))}">${ICON_CLOSE}</button>
            </div>${inner}`;
        if (!dlg.open) dlg.showModal();
    }

    /**
     * A sparkline drawn by hand, like every other chart in this product.
     *
     * The numbers are built with String() and never through the locale
     * formatter: a decimal comma truncates an SVG attribute and the browser
     * discards the rest without a word, so the chart would come out blank in
     * Spanish and perfect in English.
     */
    private spark(values: number[], colour: string): string {
        if (!values.length) return '';
        const W = 300, H = 58, top = 6, bot = H - 6;
        const max = Math.max(10, ...values);
        const pts = values.map((v, i) => {
            const x = (i / Math.max(1, values.length - 1)) * W;
            const y = bot - (v / max) * (bot - top);
            return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
        });
        const last = pts[pts.length - 1].split(',');
        return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
                     aria-label="${escapeHtml(i18n.t('proxmox.chart_alt'))}">
            <path fill="${colour}22" stroke="none" d="M${pts.join(' L')} L${W},${H} L0,${H} Z"/>
            <polyline fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.join(' ')}"/>
            <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${colour}"/>
        </svg>`;
    }

    private chart(label: string, now: string, unit: string, values: number[], colour: string) {
        const max = values.length ? Math.round(Math.max(...values)) : 0;
        return `<div class="panel">
            <div class="panel__top"><span class="panel__k">${escapeHtml(label)}</span>
                <span class="panel__now">${escapeHtml(now)}<small> ${escapeHtml(unit)}</small></span></div>
            ${this.spark(values, colour)}
            <div class="panel__ax"><span>${escapeHtml(this.range)}</span><span>${escapeHtml(i18n.t('proxmox.max'))} ${max}%</span><span>${escapeHtml(i18n.t('proxmox.now'))}</span></div>
        </div>`;
    }

    private async openNode(name: string) {
        const n = this.data?.nodes.find(x => x.name === name);
        if (!n) return;
        this.sheet(escapeHtml(n.name), escapeHtml(`${i18n.t('widget.api.extra_node')} · ${n.guests}`), `<div class="state">${escapeHtml(i18n.t('general.loading'))}</div>`);
        let s: PxSeries | null = null;
        try { s = await apiService.get<PxSeries>(`/api/proxmox/series?range=${this.range}&node=${encodeURIComponent(name)}`); } catch { /* charts are optional */ }

        const accent = n.cpu >= 60 ? 'var(--warning-color)' : 'var(--accent)';
        this.sheet(escapeHtml(n.name), escapeHtml(`${i18n.t('widget.api.extra_node')} · ${n.guests}`), `
            ${s ? this.chart(i18n.t('widget.telemetry.cpu'), String(Math.round(n.cpu)), '%', s.cpu, accent) : ''}
            ${s ? this.chart(i18n.t('widget.telemetry.ram'), String(Math.round(n.mem)), '%', s.mem, n.mem >= 80 ? 'var(--warning-color)' : 'var(--accent)') : ''}
            <div class="kv">
                <div><div class="kv__k">${escapeHtml(i18n.t('proxmox.threads'))}</div><div class="kv__v">${n.threads}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('proxmox.cores'))}</div><div class="kv__v">${n.cores || '—'}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('widget.telemetry.ram'))}</div><div class="kv__v">${escapeHtml(fmtBytes(n.mem_total))}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('monitor.uptime'))}</div><div class="kv__v">${escapeHtml(fmtUptime(n.uptime))}</div></div>
            </div>`);
    }

    private openStore(name: string) {
        const s = this.data?.stores.find(x => x.name === name);
        if (!s) return;
        const l = level(s.percent);
        const free = s.total - s.used;
        this.sheet(escapeHtml(s.name), escapeHtml(`${i18n.t('proxmox.storage')} · ${s.node}`), `
            ${s.percent >= 90 ? `<div class="warnbox"><div class="warnbox__h">${escapeHtml(i18n.t('proxmox.almost_full'))}</div>
                <div class="warnbox__s">${escapeHtml(i18n.t('widget.api.label.freespace'))}: <em>${escapeHtml(fmtBytes(free))}</em></div></div>` : ''}
            <div class="panel">
                <div class="panel__top"><span class="panel__k">${escapeHtml(i18n.t('proxmox.used'))}</span>
                    <span class="panel__now">${Math.round(s.percent)}<small> %</small></span></div>
                <div class="bar" style="height:8px;border-radius:4px"><i class="${l || 'ok'}" style="width:${s.percent}%"></i></div>
                <div class="panel__ax"><span>0</span><span>${escapeHtml(fmtBytes(s.total))}</span></div>
            </div>
            <div class="kv">
                <div><div class="kv__k">${escapeHtml(i18n.t('proxmox.used'))}</div><div class="kv__v">${escapeHtml(fmtBytes(s.used))}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('widget.api.label.freespace'))}</div><div class="kv__v">${escapeHtml(fmtBytes(free))}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('docker.host_type'))}</div><div class="kv__v">${escapeHtml(s.kind)}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('widget.api.extra_node'))}</div><div class="kv__v">${escapeHtml(s.node)}</div></div>
            </div>`);
    }

    private async openGuest(vmid: number) {
        const g = this.data?.guests.find(x => x.vmid === vmid);
        if (!g) return;
        const book = this.backing(g);
        const kind = i18n.t(g.kind === 'lxc' ? 'proxmox.container' : 'proxmox.vm');
        const sub = escapeHtml(`${kind} ${g.vmid} · ${g.node}`);
        const power = this.data?.caps.power === true;

        this.sheet(escapeHtml(g.name), sub, `<div class="state">${escapeHtml(i18n.t('general.loading'))}</div>`);
        let s: PxSeries | null = null;
        try {
            s = await apiService.get<PxSeries>(
                `/api/proxmox/series?range=${this.range}&node=${encodeURIComponent(g.node)}&kind=${g.kind}&vmid=${g.vmid}`);
        } catch { /* charts are optional */ }

        // The sentence only this product can write, and the reason the page
        // exists: the machine is down, so a service of yours is down with it.
        const warn = !g.running && book
            ? `<div class="warnbox"><div class="warnbox__h">${escapeHtml(i18n.t('proxmox.stopped_title'))}</div>
                 <div class="warnbox__s">${escapeHtml(i18n.t('proxmox.stopped_breaks'))} <em>${escapeHtml(book.label || book.url)}</em></div></div>`
            : '';

        const actions = `<div class="acts">
            ${power ? `<app-button variant="${g.running ? 'ghost' : 'primary'}" data-power="${g.vmid}">
                ${escapeHtml(i18n.t(g.running ? 'docker.action_stop' : 'docker.action_start'))}</app-button>` : ''}
            ${book?.url ? `<app-button variant="ghost" data-open="${escapeHtml(book.url)}">${escapeHtml(i18n.t('proxmox.open_bookmark'))}</app-button>` : ''}
        </div>`;

        this.sheet(escapeHtml(g.name), sub, `
            ${warn}
            ${s ? this.chart(i18n.t('widget.telemetry.cpu'), g.running ? String(g.cpu) : '—', g.running ? '%' : '',
                s.cpu, g.running ? (g.cpu >= 60 ? 'var(--warning-color)' : 'var(--accent)') : 'var(--text-dim)') : ''}
            <div class="kv">
                <div><div class="kv__k">${escapeHtml(i18n.t('proxmox.state'))}</div><div class="kv__v">${escapeHtml(i18n.t(g.running ? 'docker.state_running' : 'docker.state_stopped'))}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('widget.telemetry.ram'))}</div><div class="kv__v">${g.running ? escapeHtml(`${fmtBytes(g.mem)} / ${fmtBytes(g.mem_total)}`) : '—'}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('monitor.uptime'))}</div><div class="kv__v">${g.running ? escapeHtml(fmtUptime(g.uptime)) : '—'}</div></div>
                <div><div class="kv__k">${escapeHtml(i18n.t('proxmox.bookmark'))}</div><div class="kv__v">${book ? escapeHtml(book.label || book.url) : '—'}</div></div>
            </div>
            ${actions}`);
    }

    // ── Events ──

    private onInput = (e: Event) => {
        const t = e.target as HTMLInputElement;
        if (t?.id !== 'pp-search') return;
        this.query = t.value;
        // ONLY the body. Repainting the status line would replace the very
        // input being typed into: the element the browser holds the caret and
        // the composition in would be swapped out from under it on every
        // keystroke, and restoring focus afterwards is not the same thing.
        this.paintBody();
    };

    private onClick = async (e: Event) => {
        const t = e.target as HTMLElement;

        if (t.closest('#pp-close')) { this.close(); return; }
        if (t.closest('[data-close]')) {
            (this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null)?.close();
            return;
        }

        const range = t.closest('[data-range]') as HTMLElement | null;
        if (range) {
            this.range = (range.dataset.range as any) || '24h';
            this.paint();
            return;
        }

        if (t.closest('#pp-down')) {
            this.onlyStopped = !this.onlyStopped;
            this.paint();
            return;
        }

        const open = t.closest('[data-open]') as HTMLElement | null;
        if (open?.dataset.open) { window.open(open.dataset.open, '_blank', 'noopener'); return; }

        const power = t.closest('[data-power]') as HTMLElement | null;
        if (power) { await this.power(Number(power.dataset.power)); return; }

        const node = t.closest('[data-node]') as HTMLElement | null;
        if (node?.dataset.node) { this.openNode(node.dataset.node); return; }

        const store = t.closest('[data-store]') as HTMLElement | null;
        if (store?.dataset.store) { this.openStore(store.dataset.store); return; }

        const guest = t.closest('[data-guest]') as HTMLElement | null;
        if (guest?.dataset.guest) { this.openGuest(Number(guest.dataset.guest)); return; }
    };

    private async power(vmid: number) {
        const g = this.data?.guests.find(x => x.vmid === vmid);
        if (!g || this.busy.has(vmid)) return;
        const starting = !g.running;
        const book = this.backing(g);

        const modal = document.querySelector('confirmation-modal') as any;
        if (modal?.confirm) {
            // The consequence, not just the question. A button label cannot say
            // "and your photo library goes with it"; this can.
            const message = starting
                ? i18n.t('widget.proxmox.confirm_start')
                : (book
                    ? `${i18n.t('proxmox.stopped_breaks')} ${book.label || book.url}`
                    : i18n.t('widget.proxmox.confirm_stop'));
            const ok = await modal.confirm(
                `${i18n.t(starting ? 'docker.action_start' : 'docker.action_stop')} ${g.name}`, message);
            if (!ok) return;
        }

        this.busy.add(vmid);
        try {
            await apiService.post('/api/proxmox/power', {
                node: g.node, kind: g.kind, vmid, action: starting ? 'start' : 'shutdown',
            });
        } catch { /* the next poll tells the truth either way */ }
        this.busy.delete(vmid);
        (this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null)?.close();
        this.load();
    }
}

if (!customElements.get('proxmox-page')) {
    customElements.define('proxmox-page', ProxmoxPage);
}
