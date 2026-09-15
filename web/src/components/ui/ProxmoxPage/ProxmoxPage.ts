import { adoptSharedStyles } from '../../../services/sharedStyles';
import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { escapeHtml } from '../../../services/escape';
import { loadProxmoxLinks, linkFor } from '../../../services/proxmoxLinks';
import { resolveIconUrl } from '../../../services/iconUrl';
import { loadProxmox, chosenIcon, type PxHost, type PxNode, type PxGuest, type PxStore } from '../../../services/proxmoxApi';
import { materializeIcon } from '../../../services/iconStore';
import { userStore } from '../../../store/userStore';
import '../IconSelectionModal/IconSelectionModal';
import css from './ProxmoxPage.css' with { type: 'text' };

/** What this page draws: one hypervisor at a time. */
type PxOverview = PxHost;

interface PxSeries { range: string; cpu: number[]; mem: number[]; points: number; raw: number }

/** A bookmark that says which machine backs it. */
interface Backed { label: string; url: string; icon: string }

const ICON_SERVER = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
const ICON_CHEVRON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
const ICON_BOOK = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
/* A chip and a memory stick, drawn in the same stroke as every other icon on
   this page. They label two bare numbers that otherwise read as "12.1%" and
   "52%" with nothing to say which is which. */
const ICON_CPU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3"/></svg>';
const ICON_RAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 17v3M12 17v3M17 17v3M8 11v2M12 11v2M16 11v2"/></svg>';

const ICON_PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>';
const ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const ICON_POWER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v9"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/></svg>';
const ICON_DISK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>';
const ICON_TAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9z"/><path d="M7.5 7.5h.01"/></svg>';
const ICON_NODE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>';

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
 * A percentage as a person reads it, in their own language.
 *
 * Spanish writes 1,2 and English 1.2, and the page was printing the raw number
 * either way. This is for TEXT only: an SVG coordinate that went through here
 * would be cut at the decimal comma and the browser would drop the rest of the
 * attribute without a word (*casa: i18n*).
 */
const pct = (v: number): string => i18n.formatNumber(Math.round(v * 10) / 10, { maximumFractionDigits: 1 });

/** Where the folded nodes are remembered. */
const COLLAPSED_KEY = 'proxmox.collapsedNodes';

function readCollapsed(): string[] {
    try {
        const raw = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]');
        return Array.isArray(raw) ? raw.filter(v => typeof v === 'string') : [];
    } catch {
        // A private window, or storage the browser refuses: folding still works
        // for this visit, it just will not be remembered.
        return [];
    }
}

function writeCollapsed(nodes: Set<string>): void {
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...nodes])); } catch { /* as above */ }
}

/** How far back each range reaches, for reading a time off a chart. */
const RANGE_MS: Record<string, number> = { '1h': 3600e3, '24h': 86400e3, '7d': 604800e3 };

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
    /**
     * Every chart on this page is drawn over the last day.
     *
     * It used to be a choice — three buttons on a bar of its own — and the bar
     * went with them: the state of the host belongs next to its name, and a
     * control that changes every line at once is a lot of furniture for a
     * question nobody was asking of the whole grid at once. A machine's own
     * sheet is where a range would earn its place, if it ever does.
     */
    private readonly range = '24h';
    private query = '';
    private onlyStopped = false;
    private timer: ReturnType<typeof setInterval> | null = null;
    private busy = new Set<number>();
    /**
     * Series behind each chart in the open sheet, for the pointer to read.
     *
     * Emptied when a sheet is opened, never when one is written: the markup is
     * composed before `sheet()` is called, so clearing it there threw away what
     * had just been put in and every chart came back inert under the pointer.
     */
    private _charts = new Map<string, { values: number[]; unit: string }>();
    private _chartSeq = 0;
    /**
     * Nodes whose machines are folded away, by name.
     *
     * Kept in the browser rather than in memory: a cluster is folded once and
     * expected to stay that way, and a page that forgets on every visit would
     * have to be folded again every time — which is the work it exists to save.
     */
    private collapsed = new Set<string>(readCollapsed());

    /**
     * The hypervisor on screen, and every one connected.
     *
     * With a single host — which is every instance until somebody adds a
     * second — the id stays empty and the server hands back the only one, so
     * nothing here has to know whether a choice was ever made.
     */
    private hostId = '';

    /**
     * Which of the two things this page is.
     *
     * With one hypervisor connected — every instance until somebody adds a
     * second — there is no summary and never was: the icon opens the cluster
     * and a landing page in front of it would be a toll gate charging a click
     * for nothing.
     */
    private view: 'summary' | 'cluster' = 'cluster';
    private hosts: PxHost[] = [];

    /** CPU history per machine, keyed `range|vmid`, for the tile sparklines. */
    private series = new Map<string, number[]>();
    /** Machines already asked about, so a repaint does not ask again. */
    private asked = new Set<string>();
    private _built = false;
    /** Whether the three sections exist; their labels change with the language. */
    private _shell = false;
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
        this._unsubscribeI18n = i18n.subscribe(() => {
            // The section labels and the placeholder live in the shell, which
            // is written once: a language change is one of the two things that
            // has to write it again.
            this._shell = false;
            if (this.hasAttribute('open')) this.paint();
        });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
        if (this.timer) clearInterval(this.timer);
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    open() {
        this.setAttribute('open', '');
        eventBus.emit(EVENTS.PROXMOX_PAGE_CHANGED, { open: true });
        // Which view this is cannot be known before asking: it depends on how
        // many hypervisors are connected. The summary is the safe first guess
        // because it collapses to the cluster below when there is only one.
        this.view = 'summary';
        this.hostId = '';
        this._shell = false;
        this.load();
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.load(), 15000);
    }

    close() {
        this.removeAttribute('open');
        this._shell = false;
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
            // The summary needs all of them; a cluster needs its own, which is
            // what it polls every fifteen seconds.
            const wanted = this.view === 'summary' ? undefined : (this.hostId || undefined);
            const hosts = await loadProxmox(wanted);
            if (this.view === 'summary') {
                this.hosts = hosts;
                this.error = hosts.length ? '' : 'proxmox.not_configured';
            } else {
                const shown = (this.hostId && hosts.find(h => h.id === this.hostId)) || hosts[0];
                if (!shown) throw new Error('proxmox.not_configured');
                this.hostId = shown.id;
                this.data = shown;
                // A host that answered with an error has no figures to draw, so
                // the page says what happened instead of an empty cluster.
                this.error = shown.error ? 'proxmox.connection_error' : '';
            }
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
     * migration: the association is either written in the bookmark's own
     * content or read off the names. See proxmoxLinks and proxmoxMatch — both
     * halves of that answer cost the page nothing here.
     */
    /**
     * The face of a machine: what its owner chose, then what its bookmark
     * wears, then the board's own fallback.
     *
     * The choice comes first because it is the only one that can speak for the
     * machines that will never have a bookmark — the runners, the tunnel, the
     * dashboard you are reading this on.
     */
    private iconOf(g: PxGuest): string {
        const own = this.data ? chosenIcon(this.data, g.node, g.vmid) : '';
        if (own) return own;
        return this.backing(g)?.icon || '';
    }

    private backing(g: PxGuest): Backed | null {
        const link = linkFor({ ...g, host: this.hostId });
        return link ? { label: link.label, url: link.url, icon: link.icon } : null;
    }

    // ── Markup ──

    private _build() {
        if (this._built) return;
        this._built = true;
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            <div class="pp">
                <header class="pp__header">
                    <!-- Only drawn once there is a summary to go back to. -->
                    <button class="pp__back" id="pp-back" hidden
                            aria-label="${escapeHtml(i18n.t('general.back'))}" title="${escapeHtml(i18n.t('general.back'))}">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <div class="pp__title">${ICON_SERVER}<span id="pp-title"></span></div>
                    <!-- The state of the host reads as part of the title, not as
                         a bar of its own: one line at the top instead of two. -->
                    <div class="pp__status" id="pp-status"></div>
                    <button class="pp__close" id="pp-close" aria-label="${escapeHtml(i18n.t('general.close'))}">${ICON_CLOSE}</button>
                </header>
                <div class="pp__body" id="pp-body"></div>
            </div>
            <dialog id="pp-sheet"><div class="sheet" id="pp-sheet-body"></div></dialog>`;

        this.shadowRoot!.addEventListener('click', this.onClick);
        this.shadowRoot!.addEventListener('input', this.onInput);
        this.shadowRoot!.addEventListener('pointermove', this.onSheetMove as EventListener);
        const dlg = this.shadowRoot!.querySelector('dialog') as HTMLDialogElement;
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
        this.paint();
    }

    /**
     * One bar: a label, the bar, the percentage.
     *
     * The figures behind those percentages live in the node's own sheet. On the
     * card they made three rows of numbers where a glance wants three lengths.
     */
    private meter(k: string, pct: number) {
        const l = level(pct);
        return `<span class="metric">
            <span class="metric__k">${escapeHtml(k)}</span>
            <span class="bar"><i class="${l}" style="width:${Math.min(100, Math.max(0, pct))}%"></i></span>
            <span class="metric__v ${l ? 'metric__v--' + l : ''}">
                <span class="metric__p">${Math.round(pct)} %</span></span>
        </span>`;
    }

    private nodeCard(n: PxNode) {
        const state = level(Math.max(n.cpu, n.mem, n.disk)) === 'bad' ? 'bad'
            : level(Math.max(n.cpu, n.mem, n.disk)) === 'warn' ? 'warn' : 'up';
        // Proxmox hands the load average over as a string, so it arrived here
        // reading "0.49" in every language while the rest of the page already
        // wrote 162,4 MiB in Spanish (*casa: i18n*).
        const raw = (n.loadavg && n.loadavg.length) ? Number(n.loadavg[0]) : NaN;
        const load = Number.isFinite(raw)
            ? i18n.formatNumber(raw, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—';
        return `<button class="card node" data-node="${escapeHtml(n.name)}">
            <span class="node__head">
                <span class="dot dot--${state}"></span>
                <span class="node__name">${escapeHtml(n.name)}</span>
                <span class="node__tail">${n.cores > 0
                    ? `${n.cores} ${escapeHtml(i18n.t('proxmox.cores').toLowerCase())} · `
                    : ''}${n.threads} ${escapeHtml(i18n.t('proxmox.threads'))}</span>
            </span>
            ${this.meter(i18n.t('widget.telemetry.cpu'), n.cpu)}
            ${this.meter(i18n.t('widget.telemetry.ram'), n.mem)}
            ${this.meter(i18n.t('widget.proxmox.disk'), n.disk)}
            <span class="node__foot">
                ${this.foot(i18n.t('proxmox.uptime'), fmtUptime(n.uptime))}
                ${this.foot(i18n.t('proxmox.load'), load)}
                <span class="node__go">${ICON_CHEVRON}</span>
            </span>
        </button>`;
    }

    /**
     * One labelled figure in a node's footer.
     *
     * The footer used to be three bare numbers in a row — "16 d · carga 0.49 ·
     * 29" — and two of them had nothing saying what they were. The machine
     * count is gone: the same node heads its own row of machines further down,
     * with the better version of that number (how many are containers and how
     * many are virtual machines), so the card was spending a slot repeating the
     * page instead of labelling what only it shows.
     */
    private foot(k: string, v: string) {
        return `<span class="node__f">
            <span class="node__fk">${escapeHtml(k)}</span>
            <span class="node__fv">${escapeHtml(v)}</span>
        </span>`;
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

        const face = this.iconOf(g);
        const icon = face
            ? `<span class="ico"><img src="${escapeHtml(resolveIconUrl(face))}" alt="" loading="lazy"></span>`
            : `<span class="ico ico--none">${ICON_FALLBACK}</span>`;

        // Two states, two colours, the same two the header counts: on or off.
        // The third thing worth knowing — that a bookmark of yours went down
        // with this machine — is no longer a third colour in a 9px dot: it is
        // the accent edge and the accent wash over the whole tile.
        const dot = g.running ? 'up' : 'bad';
        const line = this.series.get(`${this.range}|${g.vmid}`) ?? [];

        return `<button class="card tile${g.running ? '' : ' tile--off'}${flag ? ' tile--flag' : ''}" data-guest="${g.vmid}">
            <span class="tile__st tile__st--${dot}"></span>
            <span class="tile__t1">${icon}<span class="tile__name">${escapeHtml(g.name) || '—'}</span></span>
            <span class="tile__t2">
                ${g.running
                    ? `<span class="tile__num" aria-label="${escapeHtml(i18n.t('widget.telemetry.cpu'))} ${pct(g.cpu)}%">
                           <span class="tile__gi">${ICON_CPU}</span>${pct(g.cpu)}<small>%</small></span>`
                    : `<span class="tile__num">${escapeHtml(i18n.t('docker.state_stopped'))}</span>`}
                <span class="tile__spark">${this.spark(line, g.running ? 'var(--accent)' : 'var(--text-dim)', 62, 20)}</span>
            </span>
            <span class="tile__t3">
                <span class="ty ty--${g.kind === 'lxc' ? 'lxc' : 'vm'}">${g.kind === 'lxc' ? 'LXC' : 'VM'}</span>
                <span class="tile__meta">${g.vmid}${g.running
                    ? ` · <span class="tile__ram" aria-label="${escapeHtml(i18n.t('widget.telemetry.ram'))} ${mem}%"><span class="tile__gi">${ICON_RAM}</span>${mem}%${
                          g.mem > 0 ? `<span class="tile__amt">(${escapeHtml(fmtBytes(g.mem))})</span>` : ''}</span>`
                    : ''}</span>
            </span>
            ${book ? `<span class="tile__book" title="${escapeHtml(book.label)}">${ICON_BOOK}</span>` : ''}
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
        // The summary carries its own counts, per hypervisor, in its cards.
        if (this.view === 'summary') { el.innerHTML = ''; return; }
        const d = this.data;
        const guests = d?.guests ?? [];
        const running = guests.filter(g => g.running).length;
        // Every stopped machine, not only the ones with a bookmark on them.
        // The header is a headcount — how many are up, how many are down — and
        // it used to say "Services down: 0" with something plainly stopped on
        // screen, because it was quietly counting a different thing. The
        // bookmarked outage still has its own place: the summary says which
        // service stopped answering, and the tile wears the accent.
        const down = guests.length - running;

        // "Cluster" is what the host says, not what we assume: a standalone node
        // is the common case and must not be called one.
        const who = d?.cluster ? i18n.t('proxmox.cluster') : (d?.nodes[0]?.name ?? '');

        el.innerHTML = `
            <span class="stat"><span class="dot dot--up"></span> <b>${escapeHtml(who)}</b></span>
            <span class="stat stat--up"><b>${running}</b>/${guests.length} ${escapeHtml(i18n.t('widget.proxmox.running_label').toLowerCase())}</span>
            <span class="stat stat--down ${down ? 'stat--click' : ''} ${this.onlyStopped ? 'stat--on' : ''}" id="pp-down"
                  ${down ? 'role="button" tabindex="0"' : ''}>
                ${escapeHtml(i18n.t('proxmox.stopped_count'))}: <b>${down}</b>
            </span>`;
    }

    private paint() {
        if (!this._built) return;
        // One hypervisor is not a set worth summarising: the page opens on it.
        //
        // This decides which view we are in, so it has to run before anything
        // is painted. It used to live inside paintBody(), which paint() calls
        // AFTER paintStatus() — so on a single-hypervisor install the header
        // was painted while the page still called itself a summary, wrote
        // nothing at all, and stayed empty until the next poll fifteen seconds
        // later replaced it with the counts.
        if (this.loaded && !this.error && this.view === 'summary' && this.hosts.length === 1) {
            this.view = 'cluster';
            this.hostId = this.hosts[0].id;
            this.data = this.hosts[0];
        }
        const several = this.hosts.length > 1;
        const title = this.shadowRoot?.getElementById('pp-title');
        // Inside a cluster of several, the title is that cluster: the header
        // has to say which of them these figures belong to.
        if (title) {
            title.textContent = (this.view === 'cluster' && several && this.data)
                ? this.data.name
                : i18n.t('widget.proxmox.name');
        }
        const back = this.shadowRoot?.getElementById('pp-back') as HTMLElement | null;
        if (back) back.hidden = !(this.view === 'cluster' && several);
        this.paintStatus();
        this.paintBody();
    }

    /**
     * The three sections, written once.
     *
     * They used to be rewritten whole on every poll, and the search box lived
     * inside them: typing for longer than fifteen seconds meant losing the
     * caret mid-word. Now the shell holds the parts that do not change and the
     * data is poured into the containers below it.
     */
    private buildShell() {
        const body = this.shadowRoot?.getElementById('pp-body');
        if (!body) return;
        this._shell = true;
        body.innerHTML = `
            <section class="sec">
                <div class="sec__head">
                    <span class="sec__label">${escapeHtml(i18n.t('proxmox.nodes'))}</span>
                    <span class="sec__rule"></span>
                    <span class="sec__note" id="pp-nodes-note"></span>
                </div>
                <div class="nodes" id="pp-nodes"></div>
            </section>

            <section class="sec">
                <div class="sec__head">
                    <span class="sec__label">${escapeHtml(i18n.t('proxmox.storage'))}</span>
                    <span class="sec__rule"></span>
                    <span class="sec__note" id="pp-stores-note"></span>
                </div>
                <div class="stores" id="pp-stores"></div>
            </section>

            <section class="sec">
                <div class="sec__head">
                    <span class="sec__label">${escapeHtml(i18n.t('proxmox.machines'))}</span>
                    <span class="sec__rule"></span>
                    <!-- The search belongs to the machines, not to a bar of its
                         own: on a bar it sat directly under the board's own
                         search box and read as the same thing twice. -->
                    <span class="search">${ICON_SEARCH}
                        <input type="search" id="pp-search" value="${escapeHtml(this.query)}"
                               placeholder="${escapeHtml(i18n.t('proxmox.search'))}"
                               aria-label="${escapeHtml(i18n.t('proxmox.search'))}">
                    </span>
                    <span class="sec__note" id="pp-count"></span>
                </div>
                <div id="pp-machines"></div>
            </section>`;
    }

    /**
     * Every bookmarked service that is on a stopped machine, anywhere.
     *
     * This is the sentence the whole feature exists to write, and the summary
     * is the only place it can be written about everything at once: a cluster's
     * own page can only speak for its own machines.
     */
    private downEverywhere(): { name: string; host: string }[] {
        const out: { name: string; host: string }[] = [];
        for (const h of this.hosts) {
            for (const g of h.guests || []) {
                if (g.running) continue;
                const link = linkFor({ ...g, host: h.id });
                if (link) out.push({ name: link.label || g.name, host: h.name });
            }
        }
        return out;
    }

    /** One card per hypervisor, and the outages across all of them. */
    private paintSummary(body: HTMLElement) {
        const down = this.downEverywhere();
        const cards = this.hosts.map(h => {
            if (h.error) {
                return `<button class="card px-sum px-sum--bad" data-enter="${escapeHtml(h.id)}">
                    <span class="px-sum__r1"><span class="dot dot--bad"></span><span class="px-sum__name">${escapeHtml(h.name)}</span></span>
                    <span class="px-sum__err">${escapeHtml(i18n.t('proxmox.connection_error'))}</span>
                </button>`;
            }
            const running = (h.guests || []).filter(g => g.running).length;
            const worst = [...(h.nodes || [])].sort((a, b) =>
                Math.max(b.cpu, b.mem, b.disk) - Math.max(a.cpu, a.mem, a.disk))[0];
            const peak = worst ? Math.round(Math.max(worst.cpu, worst.mem, worst.disk)) : 0;
            const store = [...(h.stores || [])].sort((a, b) => b.percent - a.percent)[0];
            const mine = down.filter(d => d.host === h.name).length;
            return `<button class="card px-sum${mine ? ' px-sum--flag' : ''}" data-enter="${escapeHtml(h.id)}">
                <span class="px-sum__r1">
                    <span class="dot dot--${mine ? 'bad' : 'up'}"></span>
                    <span class="px-sum__name">${escapeHtml(h.name)}</span>
                    <span class="px-sum__go">${ICON_CHEVRON}</span>
                </span>
                <span class="px-sum__r2">
                    <b>${running}</b>/${(h.guests || []).length} ${escapeHtml(i18n.t('widget.proxmox.running_label').toLowerCase())}
                    · ${(h.nodes || []).length} ${escapeHtml(i18n.t('proxmox.nodes').toLowerCase())}
                </span>
                <span class="px-sum__r3">
                    <span class="${level(peak) ? 'px-sum__hot px-sum__hot--' + level(peak) : ''}">${escapeHtml(i18n.t('proxmox.peak'))} ${peak}%</span>
                    ${store ? `<span class="${level(store.percent) ? 'px-sum__hot px-sum__hot--' + level(store.percent) : ''}">${escapeHtml(store.name)} ${Math.round(store.percent)}%</span>` : ''}
                </span>
            </button>`;
        }).join('');

        body.innerHTML = `
            ${down.length ? `<section class="sec">
                <div class="sec__head">
                    <span class="sec__label sec__label--bad">${escapeHtml(i18n.t('proxmox.services_down'))}</span>
                    <span class="sec__rule"></span>
                    <span class="sec__note sec__note--bad">${down.length}</span>
                </div>
                <div class="px-down">${escapeHtml(i18n.t('proxmox.stopped_breaks'))}
                    <b>${down.map(d => escapeHtml(d.name)).join(', ')}</b></div>
            </section>` : ''}
            <section class="sec">
                <div class="sec__head">
                    <span class="sec__label">${escapeHtml(i18n.t('proxmox.hypervisors'))}</span>
                    <span class="sec__rule"></span>
                    <span class="sec__note">${this.hosts.length}</span>
                </div>
                <div class="px-sums">${cards}</div>
            </section>`;
    }

    private paintBody() {
        const body = this.shadowRoot?.getElementById('pp-body');
        if (!body) return;

        if (!this.loaded) { this._shell = false; body.innerHTML = `<div class="state">${escapeHtml(i18n.t('general.loading'))}</div>`; return; }
        if (this.error) { this._shell = false; body.innerHTML = `<div class="state">${escapeHtml(i18n.t(this.error))}</div>`; return; }
        if (this.view === 'summary') { this._shell = false; this.paintSummary(body); return; }
        if (!this._shell) this.buildShell();

        const d = this.data!;
        const stores = [...d.stores].sort((a, b) => b.percent - a.percent);
        const worstStore = stores[0];
        const worstNode = [...d.nodes].sort((a, b) =>
            Math.max(b.cpu, b.mem, b.disk) - Math.max(a.cpu, a.mem, a.disk))[0];
        const peak = worstNode ? Math.round(Math.max(worstNode.cpu, worstNode.mem, worstNode.disk)) : 0;

        const nodes = this.shadowRoot!.getElementById('pp-nodes');
        if (nodes) nodes.innerHTML = d.nodes.map(n => this.nodeCard(n)).join('');
        const nodesNote = this.shadowRoot!.getElementById('pp-nodes-note');
        if (nodesNote) {
            nodesNote.className = `sec__note ${level(peak) ? 'sec__note--' + level(peak) : ''}`;
            nodesNote.innerHTML = `${d.nodes.length} · ${escapeHtml(i18n.t('proxmox.peak'))} <b>${peak}%</b>`;
        }

        const storesEl = this.shadowRoot!.getElementById('pp-stores');
        if (storesEl) storesEl.innerHTML = stores.map(s => this.storeCard(s)).join('');
        const storesNote = this.shadowRoot!.getElementById('pp-stores-note');
        if (storesNote && worstStore) {
            storesNote.className = `sec__note ${level(worstStore.percent) ? 'sec__note--' + level(worstStore.percent) : ''}`;
            storesNote.innerHTML = `${stores.length} · <b>${escapeHtml(worstStore.name)} ${Math.round(worstStore.percent)}%</b>`;
        }

        this.paintMachines();
    }

    /** Just the machines: what a keystroke in the search box changes. */
    private paintMachines() {
        const host = this.shadowRoot?.getElementById('pp-machines');
        const d = this.data;
        if (!host || !d) return;
        const guests = this.visibleGuests();

        // Stable order — by kind, then by id. Never by state, which is how the
        // design has it: a machine you are looking for stays where you left it,
        // and a stopped one is found by how it looks, not by where the grid
        // decided to put it today. (The widget is the other way round, and for
        // a reason: it shows a handful of rows, so what needs attention has to
        // be among them or it is not shown at all.)
        const ordered = [...guests].sort((a, b) =>
            a.kind === b.kind ? a.vmid - b.vmid : (a.kind === 'lxc' ? -1 : 1));

        // While something is being looked for, a fold is not allowed to hide the
        // answer: searching a folded node and being told nothing matched would
        // be a lie the page told about its own contents.
        const filtering = !!this.query.trim() || this.onlyStopped;
        const shown: PxGuest[] = [];

        const rack = d.nodes.map(n => {
            const mine = ordered.filter(g => g.node === n.name);
            if (!mine.length) return '';
            const lxc = mine.filter(g => g.kind === 'lxc').length;
            const folded = !filtering && this.collapsed.has(n.name);
            if (!folded) shown.push(...mine);
            return `<div class="group${folded ? ' group--folded' : ''}">
                <button class="group__head" data-fold="${escapeHtml(n.name)}"
                        aria-expanded="${folded ? 'false' : 'true'}">
                    <span class="group__caret">${ICON_CHEVRON}</span>
                    <span class="dot dot--up"></span>
                    <span class="sec__label">${escapeHtml(n.name)}</span>
                    <span class="group__count">${lxc} LXC · ${mine.length - lxc} VM</span>
                </button>
                <div class="tiles">${folded ? '' : mine.map(g => this.tile(g)).join('')}</div>
            </div>`;
        }).join('');

        host.innerHTML = rack || `<div class="state">${escapeHtml(i18n.t('widget.proxmox.empty'))}</div>`;

        const count = this.shadowRoot!.getElementById('pp-count');
        if (count) count.textContent = `${guests.length}${this.query || this.onlyStopped ? ` / ${d.guests.length}` : ''}`;

        // Only what is on screen. A folded node's machines have no sparkline to
        // draw, and Proxmox has no endpoint that answers for more than one
        // machine at a time — so those are requests the host is spared entirely.
        this.loadSeries(shown);
    }

    /**
     * The little chart on every tile.
     *
     * Proxmox keeps the history and has no endpoint that returns it for more
     * than one machine, so this is one request each — measured at 20-76 ms
     * against a real host — and they are cached per range, so a poll costs
     * nothing and only changing the range asks again.
     *
     * Three at a time with a gap between them, which is not timidity: fired as
     * fast as they could go, twenty-nine machines and one change of range put
     * the page over Lastboard's own rate limit (20/s, burst 50) and half the
     * tiles came back empty with `error.rate_limited` in the console. A page
     * filling itself in over two seconds is invisible; a page that trips its
     * own server is not.
     */
    private async loadSeries(guests: PxGuest[]) {
        const pending = guests.filter(g => !this.asked.has(`${this.range}|${g.vmid}`));
        if (!pending.length) return;

        const range = this.range;
        let next = 0;
        const worker = async () => {
            while (next < pending.length && this.hasAttribute('open') && this.range === range) {
                const g = pending[next++];
                const key = `${range}|${g.vmid}`;
                this.asked.add(key);
                const url = `/api/proxmox/series?host=${encodeURIComponent(this.hostId)}&range=${range}&node=${encodeURIComponent(g.node)}&kind=${g.kind}&vmid=${g.vmid}`;
                try {
                    const s = await apiService.get<PxSeries>(url);
                    this.series.set(key, s?.cpu ?? []);
                    if (this.range === range) this.paintSpark(g);
                } catch {
                    // One retry, once the burst has drained. A machine whose
                    // history still cannot be read simply has no line.
                    await new Promise(r => setTimeout(r, 1200));
                    try {
                        const s = await apiService.get<PxSeries>(url);
                        this.series.set(key, s?.cpu ?? []);
                        if (this.range === range) this.paintSpark(g);
                    } catch { this.series.set(key, []); }
                }
                await new Promise(r => setTimeout(r, 120));
            }
        };
        await Promise.all([1, 2, 3].map(() => worker()));
    }

    /** Draws one tile's line without touching the rest of the grid. */
    private paintSpark(g: PxGuest) {
        const slot = this.shadowRoot?.querySelector(`.tile[data-guest="${g.vmid}"] .tile__spark`);
        if (!slot) return;
        const values = this.series.get(`${this.range}|${g.vmid}`) ?? [];
        slot.innerHTML = values.length
            ? this.spark(values, g.running ? 'var(--accent)' : 'var(--text-dim)', 62, 20)
            : '';
    }

    // ── The detail sheet ──

    private sheet(title: string, sub: string, inner: string, face = '') {
        const box = this.shadowRoot?.getElementById('pp-sheet-body');
        const dlg = this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null;
        if (!box || !dlg) return;
        box.innerHTML = `
            <div class="sheet__head">
                ${face}
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
    private spark(values: number[], colour: string, w = 300, h = 58): string {
        if (!values.length) return '';
        const W = w, H = h, top = Math.max(2, H * 0.1), bot = H - Math.max(2, H * 0.1);
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
        // One decimal, like the tooltip: a peak of 0.4 rounded to a flat "0%"
        // reads as a chart of nothing while the line clearly is not.
        const max = values.length ? pct(Math.max(...values)) : '0';
        // The values travel with the panel so the pointer can read them back:
        // the line is an SVG polyline, and asking a drawing what it was drawn
        // from is not a thing you can do.
        const id = `s${++this._chartSeq}`;
        this._charts.set(id, { values, unit });
        return `<div class="panel" data-chart="${id}">
            <div class="panel__top"><span class="panel__k">${escapeHtml(label)}</span>
                <span class="panel__now">${escapeHtml(now)}<small> ${escapeHtml(unit)}</small></span></div>
            ${this.spark(values, colour)}
            <div class="panel__cross" hidden></div>
            <div class="panel__tip" hidden></div>
            <div class="panel__ax"><span>${escapeHtml(this.range)}</span><span>${escapeHtml(i18n.t('proxmox.max'))} ${max}%</span><span>${escapeHtml(i18n.t('proxmox.now'))}</span></div>
        </div>`;
    }

    /**
     * The value under the pointer, and when it was taken.
     *
     * The series has no timestamps — it is sixty averaged buckets of a known
     * span — so the time is worked back from the range: the last bucket is now
     * and each step back is one sixtieth of it.
     */
    private onSheetMove = (e: PointerEvent) => {
        const panel = (e.target as HTMLElement)?.closest?.('.panel[data-chart]') as HTMLElement | null;
        if (!panel) { this.hideTips(); return; }
        const svg = panel.querySelector('svg');
        const tip = panel.querySelector('.panel__tip') as HTMLElement | null;
        const cross = panel.querySelector('.panel__cross') as HTMLElement | null;
        const data = this._charts.get(panel.dataset.chart || '');
        if (!svg || !tip || !cross || !data || !data.values.length) return;

        const box = svg.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / Math.max(1, box.width)));
        const i = Math.round(ratio * (data.values.length - 1));
        const value = data.values[i];

        const span = RANGE_MS[this.range] ?? RANGE_MS['24h'];
        const at = new Date(Date.now() - (data.values.length - 1 - i) * (span / (data.values.length - 1)));

        // One decimal, like the tiles: the host answers with the raw average of
        // the bucket, and 0.14166666666666672 % is not a thing to read.
        // Hour and minute only — the bucket is minutes wide and the date is in
        // the axis underneath.
        const shown = pct(value);
        const when = i18n.formatDateTime(at, { hour: '2-digit', minute: '2-digit' });
        tip.textContent = `${shown}${data.unit ? ' ' + data.unit : ''} · ${when}`;
        tip.hidden = false;
        cross.hidden = false;
        // Physical pixels inside the panel: this is geometry the script works
        // out, so it does not flip with the reading direction.
        const x = box.left - panel.getBoundingClientRect().left + (i / (data.values.length - 1)) * box.width;
        cross.style.left = `${Math.round(x)}px`;
        cross.style.top = `${Math.round(box.top - panel.getBoundingClientRect().top)}px`;
        cross.style.height = `${Math.round(box.height)}px`;
        const half = tip.offsetWidth / 2;
        const limit = panel.clientWidth - tip.offsetWidth - 4;
        tip.style.left = `${Math.round(Math.min(Math.max(4, x - half), Math.max(4, limit)))}px`;
        tip.style.top = `${Math.round(box.top - panel.getBoundingClientRect().top - 26)}px`;
    };

    /**
     * Hides every crosshair. Called from the move handler itself rather than
     * from a `pointerleave`: with a listener on the shadow root, leaving any
     * child inside the panel counts as a leave, so the tooltip was hidden in
     * the same breath it was shown and the chart looked inert.
     */
    private hideTips() {
        this.shadowRoot?.querySelectorAll('.panel__tip, .panel__cross')
            .forEach(el => el.setAttribute('hidden', ''));
    }

    /** One fact in a sheet: a glyph, its name, and the figure. */
    private kv(icon: string, k: string, v: string): string {
        return `<div>
            <div class="kv__k"><span class="kv__i">${icon}</span>${escapeHtml(k)}</div>
            <div class="kv__v">${v}</div>
        </div>`;
    }

    private async openNode(name: string) {
        const n = this.data?.nodes.find(x => x.name === name);
        if (!n) return;
        this._charts.clear();
        this.sheet(escapeHtml(n.name), escapeHtml(`${i18n.t('widget.api.extra_node')} · ${n.guests}`), `<div class="state">${escapeHtml(i18n.t('general.loading'))}</div>`);
        let s: PxSeries | null = null;
        try { s = await apiService.get<PxSeries>(`/api/proxmox/series?host=${encodeURIComponent(this.hostId)}&range=${this.range}&node=${encodeURIComponent(name)}`); } catch { /* charts are optional */ }

        const accent = n.cpu >= 60 ? 'var(--warning-color)' : 'var(--accent)';
        this.sheet(escapeHtml(n.name), escapeHtml(`${i18n.t('widget.api.extra_node')} · ${n.guests}`), `
            ${s ? this.chart(i18n.t('widget.telemetry.cpu'), String(Math.round(n.cpu)), '%', s.cpu, accent) : ''}
            ${s ? this.chart(i18n.t('widget.telemetry.ram'), String(Math.round(n.mem)), '%', s.mem, n.mem >= 80 ? 'var(--warning-color)' : 'var(--accent)') : ''}
            <div class="kv">
                ${this.kv(ICON_CPU, i18n.t('proxmox.threads'), String(n.threads))}
                ${n.cores > 0 ? this.kv(ICON_CPU, i18n.t('proxmox.cores'), String(n.cores)) : ''}
                ${this.kv(ICON_RAM, i18n.t('widget.telemetry.ram'), escapeHtml(`${fmtBytes(n.mem_used)} / ${fmtBytes(n.mem_total)}`))}
                ${n.disk_total > 0
                    ? this.kv(ICON_DISK, i18n.t('widget.proxmox.disk'), escapeHtml(`${fmtBytes(n.disk_used)} / ${fmtBytes(n.disk_total)}`))
                    : ''}
                ${this.kv(ICON_CLOCK, i18n.t('proxmox.uptime'), escapeHtml(fmtUptime(n.uptime)))}
            </div>`);
    }

    private openStore(name: string) {
        const s = this.data?.stores.find(x => x.name === name);
        if (!s) return;
        this._charts.clear();
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
                ${this.kv(ICON_DISK, i18n.t('proxmox.used'), escapeHtml(fmtBytes(s.used)))}
                ${this.kv(ICON_DISK, i18n.t('widget.api.label.freespace'), escapeHtml(fmtBytes(free)))}
                ${this.kv(ICON_TAG, i18n.t('docker.host_type'), escapeHtml(s.kind))}
                ${this.kv(ICON_NODE, i18n.t('widget.api.extra_node'), escapeHtml(s.node))}
            </div>`);
    }

    /** Is this account allowed to choose what a machine looks like? */
    private isAdmin(): boolean {
        const role = (userStore.getUser()?.role || '').toLowerCase();
        return role === 'admin' || role === 'administrator';
    }

    /**
     * The machine's face in its sheet, and the way to change it.
     *
     * Only an administrator is offered the picker: the choice is server-wide,
     * like the connection it belongs to.
     */
    private sheetFace(g: PxGuest): string {
        const face = this.iconOf(g);
        const inner = face
            ? `<img src="${escapeHtml(resolveIconUrl(face))}" alt="" loading="lazy">`
            : ICON_FALLBACK;
        if (!this.isAdmin()) return `<span class="sheet__ico">${inner}</span>`;
        return `<button class="sheet__ico sheet__ico--edit" data-icon="${g.vmid}"
                    title="${escapeHtml(i18n.t('proxmox.icon_set'))}"
                    aria-label="${escapeHtml(i18n.t('proxmox.icon_set'))}">${inner}<span class="sheet__ico-pen">${ICON_PEN}</span></button>`;
    }

    /**
     * Picks an icon for a machine and stores it on this instance.
     *
     * The icon is downloaded once, here, exactly as a bookmark's is: the board
     * never asks a CDN what it is drawing, and this must not become the one
     * place that does.
     */
    private async chooseIcon(vmid: number) {
        const g = this.data?.guests.find(x => x.vmid === vmid);
        if (!g || !this.isAdmin()) return;

        let modal = document.querySelector('icon-selection-modal') as (HTMLElement & { open: () => Promise<string | null> }) | null;
        if (!modal) {
            modal = document.createElement('icon-selection-modal') as any;
            document.body.appendChild(modal!);
        }
        const picked = await modal!.open();
        if (picked === null) return;

        // Downloaded once, here, exactly as a bookmark's is.
        await this.setIcon(vmid, picked ? await materializeIcon(resolveIconUrl(picked)) : '');
    }

    /** Writes the choice, or clears it, and redraws what shows it. */
    private async setIcon(vmid: number, icon: string) {
        const g = this.data?.guests.find(x => x.vmid === vmid);
        if (!g || !this.isAdmin()) return;
        try {
            await apiService.post('/api/proxmox/icon', { host: this.hostId, node: g.node, vmid: g.vmid, icon });
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
            return;
        }
        if (this.data) {
            this.data.icons = { ...(this.data.icons || {}) };
            if (icon) this.data.icons[`${g.node}|${g.vmid}`] = icon;
            else delete this.data.icons[`${g.node}|${g.vmid}`];
        }
        this.paintMachines();
        this.openGuest(vmid);
    }

    private async openGuest(vmid: number) {
        const g = this.data?.guests.find(x => x.vmid === vmid);
        if (!g) return;
        this._charts.clear();
        const book = this.backing(g);
        const kind = i18n.t(g.kind === 'lxc' ? 'proxmox.container' : 'proxmox.vm');
        const sub = escapeHtml(`${kind} ${g.vmid} · ${g.node}`);
        const power = this.data?.caps.power === true;

        this.sheet(escapeHtml(g.name), sub, `<div class="state">${escapeHtml(i18n.t('general.loading'))}</div>`, this.sheetFace(g));
        let s: PxSeries | null = null;
        try {
            s = await apiService.get<PxSeries>(
                `/api/proxmox/series?host=${encodeURIComponent(this.hostId)}&range=${this.range}&node=${encodeURIComponent(g.node)}&kind=${g.kind}&vmid=${g.vmid}`);
        } catch { /* charts are optional */ }

        // The sentence only this product can write, and the reason the page
        // exists: the machine is down, so a service of yours is down with it.
        const warn = !g.running && book
            ? `<div class="warnbox"><div class="warnbox__h">${escapeHtml(i18n.t('proxmox.stopped_title'))}</div>
                 <div class="warnbox__s">${escapeHtml(i18n.t('proxmox.stopped_breaks'))} <em>${escapeHtml(book.label || book.url)}</em></div></div>`
            : '';

        const chosen = !!this.data?.icons?.[`${g.node}|${g.vmid}`];
        const actions = `<div class="acts">
            ${power ? `<app-button variant="${g.running ? 'ghost' : 'primary'}" data-power="${g.vmid}">
                ${escapeHtml(i18n.t(g.running ? 'docker.action_stop' : 'docker.action_start'))}</app-button>` : ''}
            ${book?.url ? `<app-button variant="ghost" data-open="${escapeHtml(book.url)}">${escapeHtml(i18n.t('proxmox.open_bookmark'))}</app-button>` : ''}
            ${chosen && this.isAdmin() ? `<app-button variant="ghost" data-icon-clear="${g.vmid}">${escapeHtml(i18n.t('proxmox.icon_clear'))}</app-button>` : ''}
        </div>`;

        this.sheet(escapeHtml(g.name), sub, `
            ${warn}
            ${s ? this.chart(i18n.t('widget.telemetry.cpu'), g.running ? pct(g.cpu) : '—', g.running ? '%' : '',
                s.cpu, g.running ? (g.cpu >= 60 ? 'var(--warning-color)' : 'var(--accent)') : 'var(--text-dim)') : ''}
            <div class="kv">
                ${this.kv(ICON_POWER, i18n.t('proxmox.state'), escapeHtml(i18n.t(g.running ? 'docker.state_running' : 'docker.state_stopped')))}
                ${this.kv(ICON_RAM, i18n.t('widget.telemetry.ram'), g.running ? escapeHtml(`${fmtBytes(g.mem)} / ${fmtBytes(g.mem_total)}`) : '—')}
                ${this.kv(ICON_CLOCK, i18n.t('proxmox.uptime'), g.running ? escapeHtml(fmtUptime(g.uptime)) : '—')}
                ${this.kv(ICON_BOOK, i18n.t('proxmox.bookmark'), book ? escapeHtml(book.label || book.url) : '—')}
            </div>
            ${actions}`, this.sheetFace(g));
    }

    // ── Events ──

    private onInput = (e: Event) => {
        const t = e.target as HTMLInputElement;
        if (t?.id !== 'pp-search') return;
        this.query = t.value;
        // ONLY the machines. The input now lives in that section's own header,
        // so repainting anything above it would replace the element the
        // browser holds the caret and the composition in — and restoring focus
        // afterwards is not the same thing.
        this.paintMachines();
    };

    private onClick = async (e: Event) => {
        const t = e.target as HTMLElement;

        if (t.closest('#pp-close')) { this.close(); return; }

        const enter = t.closest('[data-enter]') as HTMLElement | null;
        if (enter) {
            this.hostId = enter.dataset.enter || '';
            this.view = 'cluster';
            this._shell = false;
            this.series.clear();
            this.asked.clear();
            this.loaded = false;
            this.paint();
            this.load();
            return;
        }

        if (t.closest('#pp-back')) {
            this.view = 'summary';
            this.hostId = '';
            this._shell = false;
            this.loaded = false;
            this.paint();
            this.load();
            return;
        }

        const fold = t.closest('[data-fold]') as HTMLElement | null;
        if (fold) {
            const node = fold.dataset.fold || '';
            if (this.collapsed.has(node)) this.collapsed.delete(node);
            else this.collapsed.add(node);
            writeCollapsed(this.collapsed);
            this.paintMachines();
            return;
        }
        if (t.closest('[data-close]')) {
            (this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null)?.close();
            return;
        }

        const clearBtn = t.closest('[data-icon-clear]') as HTMLElement | null;
        if (clearBtn) {
            this.setIcon(Number(clearBtn.dataset.iconClear), '');
            return;
        }

        const iconBtn = t.closest('[data-icon]') as HTMLElement | null;
        if (iconBtn) {
            this.chooseIcon(Number(iconBtn.dataset.icon));
            return;
        }

        if (t.closest('#pp-down')) {
            this.onlyStopped = !this.onlyStopped;
            this.paintStatus();
            this.paintMachines();
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
                host: this.hostId, node: g.node, kind: g.kind, vmid, action: starting ? 'start' : 'shutdown',
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
