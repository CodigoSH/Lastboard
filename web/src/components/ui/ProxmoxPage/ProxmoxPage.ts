import { adoptSharedStyles } from '../../../services/sharedStyles';
import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { escapeHtml } from '../../../services/escape';
import { loadProxmoxLinks, linkFor } from '../../../services/proxmoxLinks';
import { resolveIconUrl } from '../../../services/iconUrl';
import { loadProxmox, loadProxmoxHostList, chosenIcon, withIcon, type PxGuest, type PxHost } from '../../../services/proxmoxApi';
import { curveQuery, hostError, mergeHosts, type PxHostRef } from '../../../services/proxmoxHosts';
import { materializeIcon } from '../../../services/iconStore';
import '../IconSelectionModal/IconSelectionModal';
import '../Select/Select';
import { isTypingTarget, opensSearch } from '../../../services/searchShortcut';
import { PauseNotice, whenRefreshing } from '../../../services/refreshClock';
import { targetTab, type PageTarget } from '../../../services/pageTarget';
import { heldReading, holdReading } from '../../../services/infraReadings';
import { PageNav, type NavState } from '../../../services/pageNav';
import { userStore } from '../../../store/userStore';
import { accessAllows } from '../../../services/access';
import { byteUnit } from '../../../services/dockerOverview';
import { fetchTasks } from '../../../services/proxmoxTasksApi';
import type { PxTask } from '../../../services/proxmoxTasks';
import {
    countUnits, groupUnits, isSortKey, isStatusFilter, passes, sortUnits, type SortKey, type StatusFilter,
} from '../../../services/infraUnits';
import {
    attentionList, fleetNodes, fleetStores, fleetTotals, guestUnits, liveHosts, unitId, uptimeParts, weightedSeries,
    type FleetNode, type FleetStore, type LinkOf,
} from '../../../services/proxmoxOverview';
import {
    chartCardHtml, chartHtml, chartIndexAt, CHART_WIDTH, icon, sortOptions, tabsHtml, toolbarHtml, viewSegHtml, type ChartSpec,
} from '../infra/infra.template';
import {
    guestFooterHtml, guestHeadHtml, guestSummaryHtml, hostErrorHtml, inventoryHtml, noMatchHtml, nodeHeadHtml, nodeSummaryHtml,
    overviewHtml, storageTabHtml, storeHeadHtml, storeSummaryHtml, summaryHtml, type Fmt, type GuestDrawer, type GuestView, type T,
} from './ProxmoxPage.template';
import type { Fmt as TaskFmt } from './ProxmoxTasks.template';
import { JournalPanel, TaskGroups, TaskPanel, type TaskMachine } from './ProxmoxPanels';
import infraCss from '../infra/infra.css' with { type: 'text' };
import css from './ProxmoxPage.css' with { type: 'text' };

const POLL_MS = 15000;
/** How many hosts get a button each beside "All" before the header switches to a selector. */
const MAX_HOST_BUTTONS = 2;
const VIEW_KEY = 'proxmox.view';
const SORT_KEY = 'proxmox.sort';
const GROUP_KEY = 'proxmox.group';
/** The ranges a history can be read over, as the endpoint names them. */
const RANGES = [{ id: '1h', sec: 3600 }, { id: '24h', sec: 86400 }, { id: '7d', sec: 604800 }] as const;
type Range = typeof RANGES[number]['id'];
/** How long a fleet curve is believed before it is asked again. */
const CURVE_TTL_MS = 5 * 60e3;
/** How long the overview's box of the latest tasks is kept before it is asked again. */
const LATEST_TTL_MS = 60e3;

function readPref(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}
function writePref(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* a private window: it holds for this visit */ }
}

interface PxSeries { range: string; cpu: number[]; mem: number[]; points: number; raw: number }

/** The product's select, as the page drives it. */
type SelectEl = HTMLElement & { options: { value: string; label: string }[]; value: string };

type Tab = 'overview' | 'machines' | 'storage' | 'tasks' | 'syslog';
const TABS: readonly Tab[] = ['overview', 'machines', 'storage', 'tasks', 'syslog'];
type DrawerTab = 'summary' | 'tasks' | 'syslog';
type Sel = { kind: 'guest' | 'node' | 'store'; hostId: string; ref: string };
type Current =
    | { kind: 'guest'; host: PxHost; guest: PxGuest }
    | { kind: 'node'; host: PxHost; node: FleetNode }
    | { kind: 'store'; host: PxHost; store: FleetStore };

interface Written {
    head: string; tabs: string; body: string; list: string; tools: string; pick: string;
    dhead: string; dtabs: string; dbody: string; dfoot: string;
}
const blank = (): Written => ({ head: '', tabs: '', body: '', list: '', tools: '', pick: '', dhead: '', dtabs: '', dbody: '', dfoot: '' });

/**
 * The hypervisors, as a page of the board.
 *
 * The constraint that shaped it: what does this do that the Proxmox console at
 * :8006 does not? Not administration — that console is one click away and does
 * it better. What only this can do is show the machines beside the bookmarks
 * they serve, and say that a service stopped answering because the container
 * under it is down.
 *
 * Drawn from the same shell as the Docker page: a header, tabs, four
 * indicators, an inventory and a drawer for whatever is chosen.
 */
class ProxmoxPage extends HTMLElement {
    private hosts: PxHost[] = [];
    private loaded = false;
    private error = '';
    private loading = false;
    private timer: ReturnType<typeof setInterval> | null = null;

    private tab: Tab = 'overview';
    private hostFilter = 'all';
    private query = '';
    private status: StatusFilter = 'all';
    private sort: SortKey = isSortKey(readPref(SORT_KEY)) ? readPref(SORT_KEY) as SortKey : 'name';
    private grouped = readPref(GROUP_KEY) === '1';
    private viewMode: 'cards' | 'list' = readPref(VIEW_KEY) === 'list' ? 'list' : 'cards';

    private sel: Sel | null = null;
    private drawerOpen = false;
    /** Open for its side panel alone, over the board: the page itself is not shown and the top bar stays free. */
    private panelOnly = false;
    private drawerTab: DrawerTab = 'summary';
    private busy = new Set<string>();

    /** The node whose tasks, or system log, the page tabs show: "host/node". */
    private nodePick = '';

    /** History of the open machine or node, asked when the drawer opens. */
    private detailSeries: PxSeries | null = null;
    private detailSeq = 0;

    private range: Range = '24h';
    private curve: number[] = [];
    private curveMem: number[] = [];
    private curveKey = '';
    private curveAt = 0;
    private curveBusy = false;

    private latest: { tasks: PxTask[]; where: string } | null = null;
    private latestBusy = false;
    private latestAt = 0;

    /** The browser's history for this page: Back walks through its tabs and panel before it leaves. */
    private readonly nav = new PageNav('proxmox');
    /** True while the page is being put where the history says, so that does not make a step of its own. */
    private applying = false;
    private charts = new Map<string, { spec: ChartSpec; at: number[] }>();
    private last: Written = blank();
    private bodyTab: Tab | '' = '';
    private _listening = false;

    private _unsubscribeI18n: (() => void) | undefined;
    private readonly _keydown: (e: KeyboardEvent) => void;
    private readonly _popstate: (e: PopStateEvent) => void;
    private readonly _resize = () => { if (this.hasAttribute('open')) this.fitUptimes(); };

    private readonly t: T = (key, params) => i18n.t(key, params);
    /** When the last reading arrived, said under the header; and the refresh's pause while the browser asks to save data. */
    private readonly pauseNotice = new PauseNotice(() => this.$('upd'), (key, params) => i18n.t(key, params));

    private readonly tfmt: TaskFmt = {
        time: (sec) => i18n.formatDateTime(new Date(sec * 1000), { dateStyle: 'medium', timeStyle: 'short' }),
        span: (sec) => i18n.formatDuration(sec),
    };

    private readonly fmt: Fmt = {
        num: (n) => i18n.formatNumber(n),
        pct: (n) => i18n.formatNumber(n / 100, { style: 'percent', maximumFractionDigits: 1 }),
        dec: (n) => i18n.formatNumber(n, { maximumFractionDigits: 2 }),
        bytes: (n) => {
            if (!n || n < 0) return '—';
            const { value, unit } = byteUnit(n);
            return i18n.formatNumber(value, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: value < 10 && unit !== 'byte' ? 1 : 0 });
        },
        // An uptime counts in years, months and days, and nothing smaller.
        uptime: (sec) => {
            const p = uptimeParts(sec);
            const lang = i18n.getLocale().code;
            const part = (value: number, unit: string, display: 'long' | 'narrow') =>
                i18n.formatNumber(value, { style: 'unit', unit, unitDisplay: display, maximumFractionDigits: 0 });
            const list = (display: 'long' | 'narrow') => {
                const parts = [
                    p.years ? part(p.years, 'year', display) : '',
                    p.months ? part(p.months, 'month', display) : '',
                    p.days ? part(p.days, 'day', display) : '',
                ].filter(Boolean);
                // Not a whole day yet: said as a limit rather than as hours, which a card has no room to be exact about.
                if (!parts.length) return `< ${part(1, 'day', display)}`;
                return display === 'long'
                    ? new Intl.ListFormat(lang, { style: 'long', type: 'unit' }).format(parts)
                    : parts.join(' ');
            };
            return { long: list('long'), short: list('narrow') };
        },
    };

    /** The page's Tasks tab: the node's tasks gathered by machine, each a card that opens the machine's panel on its tasks. */
    private readonly pageTasks = new TaskGroups(this.t, this.tfmt, n => this.fmt.num(n), (host, node, id) => this.taskMachine(host, node, id), (host, node, id) => this.openTasksOf(host, node, id));
    private readonly drawerTasks = new TaskPanel(this.t, this.tfmt);
    private readonly pageJournal = new JournalPanel(this.t);
    private readonly drawerJournal = new JournalPanel(this.t);

    /** The bookmark that backs a machine, if its owner said so: written in the bookmark itself or read off the names. */
    private readonly linkOf: LinkOf = (hostId, g) => {
        const l = linkFor({ ...g, host: hostId });
        return l ? (l.label || l.url || g.name) : '';
    };

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);

        this._keydown = (e: KeyboardEvent) => {
            if (!this.hasAttribute('open')) return;
            // A confirmation answers its own Escape; closing the page under it would be a second effect of one key.
            if (document.querySelector('confirmation-modal')?.shadowRoot?.querySelector('dialog[open]')) return;
            if (document.querySelector('icon-selection-modal')?.shadowRoot?.querySelector('dialog[open]')) return;
            // The window with every task answers its own Escape.
            if (this.shadowRoot?.querySelector('dialog[open]')) return;
            if (e.key === 'Escape') {
                if (this.drawerOpen) this.closeDrawer(); else this.close();
                return;
            }
            const typing = isTypingTarget(e.composedPath()[0] as Element | undefined, 'inv-q');
            if (!opensSearch(e, { locked: false, typing })) return;
            e.preventDefault();
            if (this.tab !== 'machines') this.setTab('machines');
            const input = this.$('inv-q') as HTMLInputElement | null;
            input?.focus();
            input?.select();
        };

        // Back and Forward — the browser's buttons, the mouse's, a swipe from the edge of a phone: the page shows
        // what the entry it landed on says; before its first entry, it leaves.
        this._popstate = (e: PopStateEvent) => {
            const effect = this.nav.pop(e.state);
            if (effect.kind === 'ignore' || !this.hasAttribute('open')) return;
            if (effect.kind === 'leave') { this.closeQuietly(); return; }
            this.applyNav(effect.state);
        };
    }

    connectedCallback() {
        if (!this._listening) {
            this._listening = true;
            const root = this.shadowRoot!;
            root.addEventListener('click', this.onClick);
            root.addEventListener('input', this.onInput);
            root.addEventListener('change', this.onChange);
            root.addEventListener('mousemove', this.onChartMove as EventListener);
            root.addEventListener('mouseout', this.onChartLeave);
        }
        this.build();
        window.addEventListener('keydown', this._keydown);
        window.addEventListener('popstate', this._popstate);
        window.addEventListener('resize', this._resize);
        this._unsubscribeI18n = i18n.subscribe(() => {
            // Every label is written into the shell, so a language change is one of the two moments it is written again.
            this.build();
            for (const p of [this.pageTasks, this.drawerTasks]) p.relabel();
            for (const p of [this.pageJournal, this.drawerJournal]) p.relabel();
            if (this.hasAttribute('open')) this.paintAll(true);
        });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
        window.removeEventListener('popstate', this._popstate);
        window.removeEventListener('resize', this._resize);
        this.stopTimers();
        this.stopPanels();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    // ── Opening and closing ──

    /** Opens the page, at a tab and with an item in the panel when the caller says so; `sel` is written as the history writes it. */
    open(target?: PageTarget) {
        this.setAttribute('open', '');
        this.panelOnly = !!target?.panel && !!target.sel;
        this.toggleAttribute('panel-only', this.panelOnly);
        if (!this.panelOnly) eventBus.emit(EVENTS.PROXMOX_PAGE_CHANGED, { open: true });
        this.drawerOpen = false;
        const asked = targetTab(target, TABS);
        if (asked && !this.panelOnly) this.tab = asked;
        // A full-screen page is a place: each step in it is a step of the browser's Back. Once per opening, never stacked.
        this.nav.open(this.navState());
        // What a tile of the board last read is what the page opens on, until its own answer arrives.
        const fromTile = heldReading<PxHost[]>('proxmox');
        if (fromTile) this.hosts = fromTile.value;
        this.loaded = !!fromTile;
        this.curveAt = 0;
        this.latestAt = 0;
        this.paintAll(true);
        void this.load();
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(whenRefreshing(() => { void this.load(); }), POLL_MS);
        this.pauseNotice.start();
        const parts = target?.sel?.split('|') ?? [];
        if (parts.length >= 3 && (parts[0] === 'guest' || parts[0] === 'node' || parts[0] === 'store')) {
            this.choose({ kind: parts[0], hostId: parts[1], ref: parts.slice(2).join('|') });
        }
    }

    private closeQuietly() {
        this.removeAttribute('open');
        if (!this.panelOnly) eventBus.emit(EVENTS.PROXMOX_PAGE_CHANGED, { open: false });
        this.panelOnly = false;
        this.removeAttribute('panel-only');
        this.stopTimers();
        this.stopPanels();
        this.detailSeq++;
    }

    close() {
        // Closing by the X or by Escape takes the page's entries off the history with it.
        this.nav.close();
        this.closeQuietly();
    }

    private stopTimers() {
        this.pauseNotice.stop();
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    private stopPanels() {
        this.pageTasks.stop();
        this.drawerTasks.stop();
        this.pageJournal.stop();
        this.drawerJournal.stop();
    }

    // ── Small helpers ──

    private $(id: string): HTMLElement | null {
        return this.shadowRoot?.getElementById(id) ?? null;
    }

    private scope(): PxHost[] {
        return this.hostFilter === 'all' ? this.hosts : this.hosts.filter(h => h.id === this.hostFilter);
    }

    /** What a card of the tasks tab calls a machine: its name and face, or the node itself for what the node did on its own. */
    private taskMachine(hostId: string, node: string, id: string): TaskMachine {
        const host = this.hostOf(hostId);
        const g = host && id ? this.guestOf(hostId, Number(id)) : undefined;
        if (host && g) return { name: g.name || id, face: this.faceOf(host, g) };
        return { name: id || node, face: '' };
    }

    /** A card of the tasks tab was chosen: the machine's (or the node's) panel opens on its Tasks tab. */
    private openTasksOf(hostId: string, node: string, id: string) {
        if (id) { if (!this.guestOf(hostId, Number(id))) return; this.choose({ kind: 'guest', hostId, ref: id }); }
        else this.choose({ kind: 'node', hostId, ref: node });
        this.setDrawerTab('tasks');
    }

    private hostOf(id: string): PxHost | undefined {
        return this.hosts.find(h => h.id === id);
    }

    private guestOf(hostId: string, vmid: number): PxGuest | undefined {
        return this.hostOf(hostId)?.guests?.find(g => g.vmid === vmid);
    }

    /** The face of a machine: what its owner chose, then what its bookmark wears. */
    private faceOf(h: PxHost, g: PxGuest): string {
        const own = chosenIcon(h, g.node, g.vmid);
        const face = own || linkFor({ ...g, host: h.id })?.icon || '';
        return face ? resolveIconUrl(face) : '';
    }

    private viewOfGuest(h: PxHost, g: PxGuest): GuestView {
        return {
            hostId: h.id, hostName: h.name, showHost: this.hosts.length > 1, guest: g, link: this.linkOf(h.id, g), face: this.faceOf(h, g),
            selected: !!this.sel && this.sel.kind === 'guest' && this.sel.hostId === h.id && this.sel.ref === String(g.vmid),
        };
    }

    private mayPower(h: PxHost): boolean {
        return h.caps?.power === true && accessAllows(userStore.getUser(), 'proxmox_control');
    }

    /** What the drawer is showing, resolved against the latest reading, or null when it is gone. */
    private current(): Current | null {
        const s = this.sel;
        if (!s) return null;
        const host = this.hostOf(s.hostId);
        if (!host || host.error) return null;
        if (s.kind === 'guest') {
            const guest = this.guestOf(s.hostId, Number(s.ref));
            return guest ? { kind: 'guest', host, guest } : null;
        }
        if (s.kind === 'node') {
            const node = fleetNodes([host]).find(n => n.name === s.ref);
            return node ? { kind: 'node', host, node } : null;
        }
        const store = fleetStores([host]).find(x => x.name === s.ref);
        return store ? { kind: 'store', host, store } : null;
    }

    // ── Shell ──

    private build() {
        const t = this.t;
        this.shadowRoot!.innerHTML = `
            <style>${infraCss}${css}</style>
            <div class="pg" id="pg">
                <header class="phead" id="phead"></header>
                <div class="tabsbar"><nav class="tabs" id="tabs" role="tablist" aria-label="${escapeHtml(t('widget.proxmox.name'))}"></nav><span class="upd" id="upd" role="status"></span></div>
                <div class="pbody" id="body"></div>
            </div>
            <div class="scrim" id="scrim"></div>
            <aside class="drawer" id="drawer" aria-label="${escapeHtml(t('proxmoxpage.details'))}">
                <div class="dr__h"><div id="dr-head"></div><div class="dr__tabs" id="dr-tabs" role="tablist"></div></div>
                <div class="dr__b" id="dr-body"></div>
                <div class="dr__f" id="dr-foot"></div>
            </aside>`;
        // The regions are new and empty: nothing written before is still there.
        this.last = blank();
        this.bodyTab = '';
        this.charts.clear();
    }

    // ── Events ──

    private readonly onInput = (e: Event) => {
        const el = e.target as HTMLElement;
        if (el.id !== 'inv-q') return;
        this.query = (el as HTMLInputElement).value;
        this.paintInventory();
    };

    private readonly onChange = (e: Event) => {
        const el = e.target as HTMLElement & { value: string };
        const value = el.value;
        // The select closes itself right after it says it changed; painting waits for that.
        queueMicrotask(() => {
            if (el.id === 'hp-host') { this.hostFilter = value; this.paintAll(); }
            else if (el.id === 'inv-sort') {
                if (isSortKey(value)) { this.sort = value; writePref(SORT_KEY, value); this.paintInventory(); }
            } else if (el.id === 'node-pick') { this.nodePick = value; this.paintBody(); }
        });
    };

    /** A select that is open closes on any scroll, and a repaint scrolls: the refresh waits for the person to choose. */
    private selectOpen(): boolean {
        return !!this.shadowRoot?.querySelector('app-select[open]');
    }

    private readonly onClick = (e: Event) => {
        const el = e.target as HTMLElement;
        if (el.closest('#hp-close')) { this.close(); return; }
        if (el.closest('#hp-refresh')) { void this.load(); return; }
        if (el.closest('#dr-close') || el.closest('#scrim')) { this.closeDrawer(); return; }

        const tab = el.closest<HTMLElement>('#tabs [data-tab]');
        // Going to another page puts the side panel away: it belongs to what was in front of it.
        if (tab) { if (this.drawerOpen) this.hideDrawer(); this.setTab(tab.dataset.tab as Tab); return; }
        const dtab = el.closest<HTMLElement>('#dr-tabs [data-tab]');
        if (dtab) { this.setDrawerTab(dtab.dataset.tab as DrawerTab); return; }

        const range = el.closest<HTMLElement>('[data-range]');
        if (range) { this.setRange(range.dataset.range as Range); return; }

        const hostf = el.closest<HTMLElement>('[data-hostf]');
        if (hostf) { this.hostFilter = hostf.dataset.hostf || 'all'; this.paintAll(); return; }

        const filter = el.closest<HTMLElement>('[data-filter]');
        if (filter && isStatusFilter(filter.dataset.filter)) { this.status = filter.dataset.filter; this.paintTools(); this.paintInventory(); return; }
        if (el.closest('#inv-group')) {
            this.grouped = !this.grouped;
            writePref(GROUP_KEY, this.grouped ? '1' : '0');
            this.paintTools();
            this.paintInventory();
            return;
        }
        const view = el.closest<HTMLElement>('[data-view]');
        if (view) {
            this.viewMode = view.dataset.view === 'list' ? 'list' : 'cards';
            writePref(VIEW_KEY, this.viewMode);
            // The storage tab draws its own switch and list, from the same choice.
            if (this.tab === 'storage') { this.last.body = ''; this.paintBody(); return; }
            if (this.tab === 'tasks') { this.paintBody(); return; }
            this.paintTools();
            this.paintInventory();
            return;
        }

        // Something the attention list, a node or a store points at.
        const go = el.closest<HTMLElement>('[data-go]');
        if (go) { this.go(go.dataset.go || '', go.dataset.host || '', go.dataset.ref || ''); return; }

        // Outside the panel, on bare page: it closes, as it does on a narrow window by its scrim.
        if (this.drawerOpen && el.closest('#body') && !el.closest('button, input, select, app-select, a, label, .unit, .tr')) { this.closeDrawer(); return; }

        // A machine: a card or a row.
        const unit = el.closest<HTMLElement>('.unit, .tr:not(.tr--h)');
        if (unit?.dataset.vmid) { this.choose({ kind: 'guest', hostId: unit.dataset.host || '', ref: unit.dataset.vmid }); return; }

        if (el.closest('[data-power]')) { void this.power(); return; }
        const open = el.closest<HTMLElement>('[data-open]');
        if (open?.dataset.open) { window.open(open.dataset.open, '_blank', 'noopener'); return; }
        if (el.closest('[data-icon-clear]')) { void this.setIcon(''); return; }
        if (el.closest('[data-icon]')) { void this.chooseIcon(); return; }
    };

    private go(kind: string, hostId: string, ref: string) {
        if (kind === 'host') { this.hostFilter = hostId; this.paintAll(); return; }
        if (kind === 'guest' || kind === 'node' || kind === 'store') this.choose({ kind, hostId, ref });
    }

    // ── The chart's cursor ──

    private readonly onChartMove = (e: MouseEvent) => {
        const wrap = (e.target as HTMLElement).closest<HTMLElement>('.chart__wrap');
        if (!wrap) return;
        const c = this.charts.get(wrap.dataset.chart || '');
        const svg = wrap.querySelector('svg');
        const tip = wrap.querySelector<HTMLElement>('.tip');
        const cur = wrap.querySelector('.cur');
        if (!c || !svg || !tip || !cur) return;
        const box = svg.getBoundingClientRect();
        if (!box.width) return;
        const n = c.spec.series[0].data.length;
        const { index, x } = chartIndexAt(n, (e.clientX - box.left) / box.width);
        cur.setAttribute('x1', String(x));
        cur.setAttribute('x2', String(x));
        cur.setAttribute('opacity', '.7');
        const when = c.at[index] ? i18n.formatDateTime(new Date(c.at[index]), { hour: '2-digit', minute: '2-digit' }) : '';
        tip.innerHTML = `<div class="dim">${escapeHtml(when)}</div>` + c.spec.series.map(s =>
            `<div><span style="color:${s.color}">●</span> ${escapeHtml(s.name)} <b>${escapeHtml(s.labels?.[index] ?? c.spec.fmt(s.data[index]))}</b></div>`).join('');
        // The drawing is left-to-right in every language, so the tip is placed in screen terms.
        const px = (x / CHART_WIDTH) * box.width;
        tip.style.left = `${Math.min(Math.max(px + 12, 0), Math.max(0, box.width - tip.offsetWidth - 4))}px`;
        tip.style.top = '6px';
        tip.classList.add('on');
    };

    private readonly onChartLeave = (e: Event) => {
        const wrap = (e.target as HTMLElement).closest<HTMLElement>('.chart__wrap');
        if (!wrap) return;
        wrap.querySelector('.tip')?.classList.remove('on');
        wrap.querySelector('.cur')?.setAttribute('opacity', '0');
    };

    private rangeSec(): number {
        return RANGES.find(r => r.id === this.range)!.sec;
    }

    /** The points of a series as the moments they were taken: the last is now, each step back is one bucket. */
    private timesOf(n: number): number[] {
        const step = n > 1 ? (this.rangeSec() * 1000) / (n - 1) : 0;
        const now = Date.now();
        return Array.from({ length: n }, (_, i) => now - (n - 1 - i) * step);
    }

    private rangeLabel(sec = this.rangeSec()): string {
        return i18n.formatDuration(sec, 1);
    }

    /** CPU in green and memory in amber, the two lines every history of the page draws. */
    private historySeries(cpu: number[], mem: number[]): ChartSpec['series'] {
        const out: ChartSpec['series'] = [{ name: this.t('widget.telemetry.cpu'), color: 'var(--ok)', data: cpu }];
        if (mem.length >= 2) out.push({ name: this.t('widget.telemetry.ram'), color: 'var(--warn)', data: mem });
        return out;
    }

    private chartSpec(series: ChartSpec['series'], height?: number): ChartSpec {
        return { series, max: 100, height, edges: [`-${this.rangeLabel()}`, this.t('proxmox.now')], fmt: v => this.fmt.pct(v) };
    }

    /** A history in its own card, named, with its legend and the range chooser. */
    private historyCard(id: string, title: string, cpu: number[], mem: number[], height?: number): string {
        if (cpu.length < 2) return '';
        const spec = this.chartSpec(this.historySeries(cpu, mem), height);
        this.charts.set(id, { spec, at: this.timesOf(cpu.length) });
        return chartCardHtml(title, spec.series.map(x => ({ name: x.name, color: x.color })), this.rangeChooser(), chartHtml(id, spec), this.t('dockerpage.collecting'));
    }

    private rangeChooser(): string {
        return `<div class="seg seg--text" role="group">${RANGES.map(r =>
            `<button type="button" data-range="${r.id}" aria-pressed="${r.id === this.range}">${escapeHtml(this.rangeLabel(r.sec))}</button>`).join('')}</div>`;
    }

    // ── Selection ──

    private choose(sel: Sel) {
        const same = !!this.sel && this.sel.kind === sel.kind && this.sel.hostId === sel.hostId && this.sel.ref === sel.ref;
        if (!same) {
            this.sel = sel;
            this.detailSeries = null;
            this.detailSeq++;
            this.drawerTab = 'summary';
            this.last.dbody = this.last.dhead = this.last.dfoot = this.last.dtabs = '';
            this.drawerTasks.stop();
            this.drawerJournal.stop();
        }
        // Opening an item is a step; choosing another while one is open is not.
        const wasOpen = this.drawerOpen;
        this.showDrawer();
        if (wasOpen) this.navReplace(); else this.navPush();
        this.paintAll();
        if (!same) void this.loadDetail();
    }

    private showDrawer() {
        if (this.drawerOpen) return;
        this.drawerOpen = true;
    }

    /** Closes the drawer by the X, the scrim or Escape: it takes back the step that opened it, when there was one. */
    private closeDrawer() {
        if (!this.drawerOpen) return;
        if (this.nav.closePanel()) return;
        this.hideDrawer();
    }

    // ── The browser's history ──

    /** What is on screen, as the history remembers it. */
    private navState(): NavState {
        const s = this.drawerOpen ? this.sel : null;
        return { tab: this.tab, sel: s ? `${s.kind}|${s.hostId}|${s.ref}` : null };
    }

    // Over the board there is one entry, the panel's: choosing replaces it instead of adding a step.
    private navPush() { if (this.applying) return; if (this.panelOnly) this.nav.replace(this.navState()); else this.nav.push(this.navState()); }

    private navReplace() { if (!this.applying) this.nav.replace(this.navState()); }

    /** Puts the page where an entry of the history says: its tab, and the machine, node or store open in the panel. */
    private applyNav(s: NavState) {
        this.applying = true;
        try {
            if (s.tab !== this.tab) this.setTab(s.tab as Tab);
            const parts = s.sel?.split('|') ?? [];
            if (parts.length >= 3 && (parts[0] === 'guest' || parts[0] === 'node' || parts[0] === 'store')) {
                this.choose({ kind: parts[0], hostId: parts[1], ref: parts.slice(2).join('|') });
            } else if (this.drawerOpen) {
                this.hideDrawer();
            }
        } finally {
            this.applying = false;
        }
    }

    private hideDrawer() {
        // The panel was all there was: closing it closes what it was opened over.
        if (this.panelOnly) { this.close(); return; }
        this.drawerOpen = false;
        this.drawerTasks.stop();
        this.drawerJournal.stop();
        this.paintAll();
    }

    /** A different range: what was drawn over the old one is asked again over the new. */
    private setRange(range: Range) {
        if (range === this.range || !RANGES.some(r => r.id === range)) return;
        this.range = range;
        this.curve = []; this.curveMem = []; this.curveKey = '';
        this.detailSeries = null;
        this.last.list = ''; this.last.dbody = '';
        this.paintAll();
        void this.loadCurve();
        void this.loadDetail();
    }

    private setTab(tab: Tab) {
        if (tab === this.tab) return;
        this.tab = tab;
        this.navPush();
        this.paintAll();
    }

    private setDrawerTab(tab: DrawerTab) {
        if (tab === this.drawerTab) return;
        this.drawerTab = tab;
        this.paintDrawer();
    }

    // ── Data ──

    /** The key a failed request is explained with. */
    private static errorKey(e: unknown): string {
        const key = typeof (e as { message?: unknown })?.message === 'string' ? (e as { message: string }).message.trim() : '';
        return /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(key) ? key : 'proxmox.connection_error';
    }

    /**
     * Each hypervisor is asked for on its own and all of them together, and drawn as it
     * answers: one that is slow, or down, shows as not answering when its time is up and
     * does not keep the others from showing. What a host said last round stays on screen
     * until it says something new.
     */
    private async load() {
        if (this.loading) return;
        this.loading = true;
        this.paintHead();
        // The links come from every board, not the one behind this page, so a machine is flagged the same wherever the visitor was.
        loadProxmoxLinks().then(() => { if (this.hasAttribute('open')) this.paintAll(); }).catch(() => { });
        let refs: PxHostRef[] = [];
        try {
            refs = await loadProxmoxHostList();
            this.error = refs.length ? '' : 'proxmox.not_configured';
        } catch (e: unknown) {
            this.error = ProxmoxPage.errorKey(e);
        }
        if (this.error) {
            if (this.error === 'proxmox.not_configured') this.hosts = [];
        } else {
            const held = this.hosts;
            const fresh = new Map<string, PxHost>();
            await Promise.all(refs.map(async ref => {
                let host: PxHost;
                try {
                    host = (await loadProxmox(ref.id))[0] ?? hostError(ref, 'proxmox.connection_error');
                } catch (e: unknown) {
                    host = hostError(ref, ProxmoxPage.errorKey(e));
                }
                fresh.set(ref.id, host);
                this.hosts = mergeHosts(refs, held, fresh);
                this.loaded = true;
                if (this.hasAttribute('open')) { this.paintAll(); void this.loadCurve(); void this.loadLatest(); }
            }));
            this.hosts = mergeHosts(refs, [], fresh);
            holdReading('proxmox', this.hosts);
            if (this.hostFilter !== 'all' && !this.hosts.some(h => h.id === this.hostFilter)) this.hostFilter = 'all';
        }
        this.loading = false;
        this.loaded = true;
        if (!this.hasAttribute('open')) return;

        // A machine that is gone is gone; one whose hypervisor did not answer is only out of sight.
        if (this.sel && !this.current()) {
            const h = this.hostOf(this.sel.hostId);
            if (!h || !h.error) { this.sel = null; this.hideDrawer(); this.navReplace(); }
        }
        this.paintAll();
        void this.loadCurve();
        void this.loadLatest();
    }

    /**
     * The fleet's CPU over the last day, in one request that names every node: the server
     * reads them together and leaves out the ones that do not answer.
     * Kept for a few minutes: the curve is a day long and does not move in fifteen seconds.
     */
    private async loadCurve() {
        const scopeKey = `${this.hostFilter}|${this.range}`;
        const nodes = fleetNodes(this.scope());
        if (!nodes.length) return;
        // The nodes are part of the key: a host that answers late adds its own, and the curve is read again to include them.
        const key = `${scopeKey}|${nodes.map(n => `${n.hostId}/${n.name}`).join(',')}`;
        if (this.curveBusy || (this.curveKey === key && Date.now() - this.curveAt < CURVE_TTL_MS)) return;
        this.curveBusy = true;
        const cpu: { weight: number; values: number[] }[] = [];
        const mem: { weight: number; values: number[] }[] = [];
        try {
            const out = await apiService.get<{ nodes?: { host: string; node: string; cpu: number[]; mem: number[] }[] }>(`/api/proxmox/curve?${curveQuery(this.range, nodes)}`);
            for (const o of out?.nodes ?? []) {
                const n = nodes.find(x => x.hostId === o.host && x.name === o.node);
                if (!n) continue;
                if (o.cpu?.length) cpu.push({ weight: n.cores, values: o.cpu });
                if (o.mem?.length) mem.push({ weight: n.mem_total, values: o.mem });
            }
        } catch { /* a curve that will not come leaves the rest of the page alone */ }
        this.curveBusy = false;
        if (`${this.hostFilter}|${this.range}` !== scopeKey || !this.hasAttribute('open')) return;
        this.curve = weightedSeries(cpu);
        this.curveMem = weightedSeries(mem);
        this.curveKey = key;
        this.curveAt = Date.now();
        if (this.tab === 'overview') { this.paintBody(); this.fitUptimes(); }
    }

    /** The latest tasks of the first node in view: one request, for the overview's box. */
    private async loadLatest() {
        const n = fleetNodes(this.scope())[0];
        if (!n || this.latestBusy) return;
        // The box is a glance at what was done lately: once a minute is as fresh as it needs to be, not every refresh.
        if (this.latest?.where === n.name && Date.now() - this.latestAt < LATEST_TTL_MS) return;
        this.latestBusy = true;
        try {
            const tasks = await fetchTasks({ host: n.hostId, node: n.name });
            this.latest = { tasks, where: n.name };
            this.latestAt = Date.now();
        } catch {
            // Tasks are optional: a token without the privilege simply has no box.
            this.latest = null;
        }
        this.latestBusy = false;
        if (this.tab === 'overview' && this.hasAttribute('open')) this.paintBody();
    }

    /** The history of the open machine or node, for the drawer's charts. */
    private async loadDetail() {
        const c = this.current();
        if (!c || c.kind === 'store') return;
        const seq = ++this.detailSeq;
        const base = `/api/proxmox/series?host=${encodeURIComponent(c.host.id)}&range=${this.range}`;
        const url = c.kind === 'guest'
            ? `${base}&node=${encodeURIComponent(c.guest.node)}&kind=${c.guest.kind}&vmid=${c.guest.vmid}`
            : `${base}&node=${encodeURIComponent(c.node.name)}`;
        try {
            const s = await apiService.get<PxSeries>(url);
            if (seq !== this.detailSeq) return;
            this.detailSeries = s;
        } catch {
            if (seq !== this.detailSeq) return;
            this.detailSeries = null;
        }
        this.last.dbody = '';
        this.paintDrawer();
    }

    // ── Actions ──

    private async power() {
        const c = this.current();
        if (!c || c.kind !== 'guest' || !this.mayPower(c.host)) return;
        const { host, guest: g } = c;
        const key = unitId(host.id, g.vmid);
        if (this.busy.has(key)) return;
        const starting = !g.running;
        const link = this.linkOf(host.id, g);

        const modal = document.querySelector('confirmation-modal') as { confirm?: (t: string, m: string) => Promise<boolean> } | null;
        if (modal?.confirm) {
            // The consequence, not just the question. A button label cannot say "and your photo library goes with it"; this can.
            const message = starting
                ? this.t('widget.proxmox.confirm_start')
                : (link ? `${this.t('proxmox.stopped_breaks')} ${link}` : this.t('widget.proxmox.confirm_stop'));
            const ok = await modal.confirm(`${this.t(starting ? 'docker.action_start' : 'docker.action_stop')} ${g.name}`, message);
            if (!ok) return;
        }

        this.busy.add(key);
        this.paintDrawer();
        try {
            await apiService.post('/api/proxmox/power', { host: host.id, node: g.node, kind: g.kind, vmid: g.vmid, action: starting ? 'start' : 'shutdown' });
        } catch { /* the next poll tells the truth either way */ }
        this.busy.delete(key);
        await this.load();
        this.paintDrawer();
    }

    /**
     * Picks an icon for the open machine and stores it on this instance.
     *
     * The icon is downloaded once, here, exactly as a bookmark's is: the board
     * never asks a CDN what it is drawing, and this must not become the one
     * place that does.
     */
    private async chooseIcon() {
        if (this.current()?.kind !== 'guest') return;
        let modal = document.querySelector('icon-selection-modal') as (HTMLElement & { open: () => Promise<string | null> }) | null;
        if (!modal) {
            modal = document.createElement('icon-selection-modal') as HTMLElement & { open: () => Promise<string | null> };
            document.body.appendChild(modal);
        }
        const picked = await modal.open();
        if (picked === null) return;
        await this.setIcon(picked ? await materializeIcon(resolveIconUrl(picked)) : '');
    }

    /** Writes the choice, or clears it, and redraws what shows it. */
    private async setIcon(iconName: string) {
        const c = this.current();
        if (!c || c.kind !== 'guest') return;
        try {
            await apiService.post('/api/proxmox/icon', { host: c.host.id, node: c.guest.node, vmid: c.guest.vmid, icon: iconName });
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
            return;
        }
        c.host.icons = withIcon(c.host.icons, c.host.id, c.guest.node, c.guest.vmid, iconName);
        this.last.dhead = this.last.dfoot = this.last.dbody = '';
        this.last.list = '';
        this.paintAll();
    }

    // ── Painting ──

    /** Every uptime is written in full where it fits its line and in short where it does not. */
    private fitUptimes() {
        for (const line of this.shadowRoot?.querySelectorAll<HTMLElement>('.fit') ?? []) {
            const spans = line.querySelectorAll<HTMLElement>('[data-uptime-long]');
            if (!spans.length) continue;
            spans.forEach(s => { s.textContent = s.dataset.uptimeLong ?? ''; });
            if (line.scrollWidth > line.clientWidth + 1) spans.forEach(s => { s.textContent = s.dataset.uptimeShort ?? ''; });
        }
    }

    private paintAll(force = false) {
        if (force) { this.last = blank(); this.bodyTab = ''; }
        // Opened for its panel alone, the page behind it is not shown: it is not drawn, which also keeps its repaints from
        // undoing what the panel registered (the cursor of its chart).
        if (!this.panelOnly) {
            this.paintHead();
            this.paintTabs();
            this.paintBody();
        }
        this.paintDrawer();
        this.fitUptimes();
        this.$('pg')?.classList.toggle('has-drawer', this.drawerOpen);
        this.$('scrim')?.classList.toggle('on', this.drawerOpen);
        this.$('drawer')?.classList.toggle('on', this.drawerOpen);
    }

    private ready(): boolean {
        return this.loaded && !this.error;
    }

    /** Gives the product's select its options and its value. It keeps its own state while open, so only a change is written. */
    private setSelect(el: SelectEl, options: { value: string; label: string }[], value: string, label: string) {
        const key = JSON.stringify([options, value]);
        if (el.dataset.key === key) return;
        el.dataset.key = key;
        el.options = options;
        el.value = value;
        el.setAttribute('aria-label', label);
    }

    private paintHead() {
        const head = this.$('phead');
        if (!head) return;
        const t = this.t;
        const summary = this.ready() ? summaryHtml(fleetTotals(this.scope(), this.linkOf), t, this.fmt) : '';
        // Up to two hosts are buttons beside "All", as in the design; more than that would not fit a header, so it is a selector.
        const few = this.hosts.length > 1 && this.hosts.length <= MAX_HOST_BUTTONS;
        const pressed = (id: string) => `aria-pressed="${this.hostFilter === id}"`;
        const hosts = few
            ? `<span class="seg seg--text" role="group" aria-label="${escapeHtml(t('proxmox.hypervisors'))}">
                <button type="button" data-hostf="all" ${pressed('all')}>${escapeHtml(t('infra.filter_all'))}</button>
                ${this.hosts.map(h => `<button type="button" data-hostf="${escapeHtml(h.id)}" ${pressed(h.id)}>${escapeHtml(h.name)}</button>`).join('')}
            </span>`
            : this.hosts.length > 1 ? '<app-select id="hp-host"></app-select>' : '';
        const html = `<div class="ptitle">${icon('server', 20)}<span>${escapeHtml(t('widget.proxmox.name'))}</span></div>
            <div class="psum">${summary}</div>
            <span class="pspacer"></span>
            ${hosts}
            <button type="button" class="ibtn" id="hp-refresh" aria-label="${escapeHtml(t('infra.refresh'))}" title="${escapeHtml(t('infra.refresh'))}">${icon('refresh', 16)}</button>
            <button type="button" class="ibtn" id="hp-close" aria-label="${escapeHtml(t('general.close'))}" title="${escapeHtml(t('general.close'))}">${icon('x', 16)}</button>`;
        if (html !== this.last.head) {
            this.last.head = html;
            head.innerHTML = html;
        }
        // The spinner is a class, not markup: rewriting the header every refresh would close an open selector.
        head.querySelector('#hp-refresh svg')?.classList.toggle('spin', this.loading);
        const host = head.querySelector<SelectEl>('#hp-host');
        if (host) {
            this.setSelect(host, [
                { value: 'all', label: t('infra.filter_all') },
                ...this.hosts.map(h => ({ value: h.id, label: h.name })),
            ], this.hostFilter, t('proxmox.hypervisors'));
        }
    }

    private paintTabs() {
        const el = this.$('tabs');
        if (!el) return;
        const t = this.t;
        const tt = this.ready() ? fleetTotals(this.scope(), this.linkOf) : null;
        const html = tabsHtml([
            { id: 'overview', label: t('infra.tab_overview') },
            { id: 'machines', label: t('proxmox.machines'), count: tt?.guests },
            { id: 'storage', label: t('proxmox.storage'), count: tt?.storeCount },
            { id: 'tasks', label: t('proxmox.tasks') },
            { id: 'syslog', label: t('proxmox.syslog') },
        ], this.tab, n => this.fmt.num(n));
        if (html === this.last.tabs) return;
        this.last.tabs = html;
        el.innerHTML = html;
    }

    /** Takes the panels out of whatever is about to be rewritten; they are put back where they belong. */
    private detachPanels() {
        for (const p of [this.pageTasks, this.pageJournal]) p.el.remove();
    }

    private setBody(body: HTMLElement, tab: Tab, html: string) {
        if (this.bodyTab === tab && this.last.body === html) return;
        this.detachPanels();
        body.innerHTML = html;
        this.bodyTab = tab;
        this.last.body = html;
        this.last.list = '';
    }

    /** The body: what the chosen tab shows. */
    private paintBody() {
        if (this.panelOnly) return;
        const body = this.$('body');
        if (!body || this.selectOpen()) return;
        const t = this.t;

        if (!this.loaded) { this.setBody(body, 'overview', `<div class="empty">${escapeHtml(t('general.loading'))}</div>`); return; }
        if (this.error) {
            this.setBody(body, 'overview', `<div class="empty"><b>${escapeHtml(t(this.error))}</b></div>`);
            return;
        }

        // Nothing is asked for a tab nobody is looking at.
        if (this.tab !== 'tasks') this.pageTasks.stop();
        if (this.tab !== 'syslog') this.pageJournal.stop();

        if (this.tab === 'overview') {
            this.setBody(body, 'overview', '<div id="ov"></div>');
            this.paintOverview();
        } else if (this.tab === 'machines') {
            if (this.bodyTab !== 'machines') {
                this.detachPanels();
                body.innerHTML = '<div id="inv-tools"></div><div id="inv-errors"></div><div id="inv-list"></div>';
                this.bodyTab = 'machines';
                this.last.tools = this.last.list = this.last.body = '';
            }
            this.paintTools();
            this.paintInventory();
        } else if (this.tab === 'storage') {
            this.setBody(body, 'storage', storageTabHtml(fleetStores(this.scope()), this.hosts.length > 1, t, this.fmt, this.viewMode));
        } else {
            const kind = this.tab;
            if (this.bodyTab !== kind) {
                this.detachPanels();
                body.innerHTML = '<div id="np-wrap"></div><div id="np-slot"></div>';
                this.bodyTab = kind;
                this.last.pick = this.last.body = '';
            }
            this.paintNodePicker(kind);
        }
    }

    private paintOverview() {
        const ov = this.$('ov');
        if (!ov) return;
        const scope = this.scope();
        this.charts.delete('fleet');
        const haveCurve = this.curve.length >= 2 && this.curveKey.startsWith(`${this.hostFilter}|${this.range}|`);
        let chart = '';
        if (haveCurve) {
            const spec = this.chartSpec(this.historySeries(this.curve, this.curveMem), 190);
            chart = chartHtml('fleet', spec);
            this.charts.set('fleet', { spec, at: this.timesOf(this.curve.length) });
        }
        const html = overviewHtml({
            totals: fleetTotals(scope, this.linkOf),
            attention: attentionList(scope, this.linkOf),
            nodes: fleetNodes(scope),
            stores: fleetStores(scope),
            hosts: scope,
            cpuSpark: haveCurve ? this.curve : [],
            memSpark: haveCurve ? this.curveMem : [],
            chart,
            latest: this.latest,
            ranges: RANGES.map(r => ({ id: r.id, label: this.rangeLabel(r.sec) })),
            range: this.range,
        }, this.t, this.fmt, this.tfmt);
        if (html === this.last.list) return;
        this.last.list = html;
        const body = this.$('body');
        const top = body?.scrollTop ?? 0;
        ov.innerHTML = html;
        if (body) body.scrollTop = top;
    }

    private paintTools() {
        const el = this.$('inv-tools');
        if (!el) return;
        const counts = countUnits(guestUnits(this.scope(), this.linkOf));
        const html = toolbarHtml({
            query: this.query, status: this.status, counts: { all: 0, up: 0, off: 0, warn: 0 }, sort: this.sort,
            grouped: this.grouped, view: this.viewMode, searchLabel: this.t('proxmox.search'), groupLabel: this.t('proxmoxpage.group_node'),
            shortcut: /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K',
        }, this.t, n => this.fmt.num(n));
        // The counts are written in place, so that a refresh neither costs the search its caret nor closes the sort selector.
        if (html !== this.last.tools && !(this.shadowRoot?.activeElement?.id === 'inv-q' && el.firstChild)) {
            this.last.tools = html;
            el.innerHTML = html;
        }
        el.querySelectorAll<HTMLElement>('[data-filter] .n').forEach(n => {
            const text = this.fmt.num(counts[(n.parentElement as HTMLElement).dataset.filter as StatusFilter]);
            if (n.textContent !== text) n.textContent = text;
        });
        const sort = el.querySelector<SelectEl>('#inv-sort');
        if (sort) this.setSelect(sort, sortOptions(this.t), this.sort, this.t('infra.sort'));
    }

    private paintInventory() {
        const el = this.$('inv-list');
        const errs = this.$('inv-errors');
        if (!el || !errs) return;
        const t = this.t;
        const scope = this.scope();

        errs.innerHTML = scope.filter(h => h.error).map(h => hostErrorHtml('proxmox.connection_error', h.name, t)).join('');

        const all = guestUnits(scope, this.linkOf);
        const views = new Map<string, GuestView>();
        for (const h of liveHosts(scope)) {
            for (const g of h.guests || []) views.set(unitId(h.id, g.vmid), this.viewOfGuest(h, g));
        }
        const shown = sortUnits(all.filter(u => passes(u, this.query, this.status)), this.sort);
        const html = shown.length
            ? inventoryHtml(groupUnits(shown, this.grouped), this.viewMode, id => views.get(id), t, this.fmt, this.grouped)
            : noMatchHtml(t, all.length > 0);
        if (html === this.last.list) return;
        this.last.list = html;
        // The card the keyboard is on must still be on it after the list is written again.
        const active = this.shadowRoot?.activeElement as HTMLElement | null;
        const focus = active && el.contains(active) ? { host: active.dataset.host, vmid: active.dataset.vmid } : null;
        const body = this.$('body');
        const top = body?.scrollTop ?? 0;
        el.innerHTML = html;
        if (body) body.scrollTop = top;
        if (focus?.host) {
            for (const n of el.querySelectorAll<HTMLElement>('[data-host]')) {
                if (n.dataset.host === focus.host && n.dataset.vmid === focus.vmid) { n.focus({ preventScroll: true }); break; }
            }
        }
    }

    /** The node a Tasks or System log tab reads: the one chosen, or the first in view. */
    private pickedNode(): { host: PxHost; node: FleetNode } | null {
        const nodes = fleetNodes(this.scope());
        if (!nodes.length) return null;
        const found = nodes.find(n => `${n.hostId}/${n.name}` === this.nodePick) ?? nodes[0];
        const host = this.hostOf(found.hostId);
        return host ? { host, node: found } : null;
    }

    private paintNodePicker(kind: 'tasks' | 'syslog') {
        const wrap = this.$('np-wrap');
        const slot = this.$('np-slot');
        if (!wrap || !slot) return;
        const picked = this.pickedNode();
        const several = this.hosts.length > 1;
        const options = fleetNodes(this.scope()).map(n => ({ value: `${n.hostId}/${n.name}`, label: several ? `${n.hostName} · ${n.name}` : n.name }));
        const html = options.length
            ? `<div class="tools"><app-select id="node-pick"></app-select>${kind === 'tasks' ? `<span class="pspacer"></span>${viewSegHtml(this.viewMode, this.t)}` : ''}</div>`
            : `<div class="empty">${escapeHtml(this.t('proxmoxpage.pick_node'))}</div>`;
        if (html !== this.last.pick) { this.last.pick = html; wrap.innerHTML = html; }
        const sel = wrap.querySelector<SelectEl>('#node-pick');
        if (sel && picked) this.setSelect(sel, options, `${picked.node.hostId}/${picked.node.name}`, this.t('widget.api.extra_node'));

        const panel = kind === 'tasks' ? this.pageTasks : this.pageJournal;
        if (!picked) { panel.stop(); return; }
        const target = { host: picked.host.id, node: picked.node.name };
        // Another node was picked: show() sees a different scope and asks for the new one.
        if (kind === 'tasks') { this.pageTasks.setView(this.viewMode); this.pageTasks.show(target); } else this.pageJournal.show(target);
        if (panel.el.parentElement !== slot) slot.appendChild(panel.el);
    }

    // ── The drawer ──

    private drawerTabs(kind: Current['kind']): { id: DrawerTab; label: string }[] {
        const t = this.t;
        const summary = { id: 'summary' as const, label: t('infra.tab_summary') };
        if (kind === 'guest') return [summary, { id: 'tasks', label: t('proxmox.tasks') }];
        if (kind === 'node') return [summary, { id: 'tasks', label: t('proxmox.tasks') }, { id: 'syslog', label: t('proxmox.syslog') }];
        return [summary];
    }

    private paintDrawer() {
        const head = this.$('dr-head');
        const tabs = this.$('dr-tabs');
        const body = this.$('dr-body');
        const foot = this.$('dr-foot');
        if (!head || !tabs || !body || !foot) return;
        const c = this.current();
        if (!this.drawerOpen || !c) return;
        const t = this.t;
        const showHost = this.hosts.length > 1;

        let hHtml = '';
        let bHtml = '';
        let fHtml = '';
        const tabList = this.drawerTabs(c.kind);
        if (!tabList.some(x => x.id === this.drawerTab)) this.drawerTab = 'summary';
        const slot = '<div class="panel-slot" id="dr-slot"></div>';

        if (c.kind === 'guest') {
            const d = this.guestDrawer(c.host, c.guest);
            hHtml = guestHeadHtml(d, t);
            fHtml = guestFooterHtml(d, t);
            bHtml = this.drawerTab === 'summary' ? guestSummaryHtml(d, t, this.fmt) : slot;
        } else if (c.kind === 'node') {
            hHtml = nodeHeadHtml(c.node, showHost, t);
            const s = this.detailSeries;
            const chart = s ? this.historyCard('d-cpu', t('proxmoxpage.history'), s.cpu, s.mem, 150) : '';
            const raw = c.node.loadavg && c.node.loadavg.length ? Number(c.node.loadavg[0]) : NaN;
            const load = Number.isFinite(raw) ? i18n.formatNumber(raw, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
            bHtml = this.drawerTab === 'summary'
                ? nodeSummaryHtml({ node: c.node, chart, uptime: c.node.uptime, load }, t, this.fmt)
                : slot;
        } else {
            hHtml = storeHeadHtml(c.store, showHost, t);
            bHtml = storeSummaryHtml(c.store, t, this.fmt);
        }

        if (hHtml !== this.last.dhead) { this.last.dhead = hHtml; head.innerHTML = hHtml; }
        const tHtml = tabList.length > 1 ? tabsHtml(tabList, this.drawerTab, n => this.fmt.num(n)) : '';
        if (tHtml !== this.last.dtabs) { this.last.dtabs = tHtml; tabs.innerHTML = tHtml; }
        tabs.hidden = !tHtml;
        if (fHtml !== this.last.dfoot) { this.last.dfoot = fHtml; foot.innerHTML = fHtml; }
        foot.hidden = !fHtml;

        if (bHtml !== this.last.dbody) {
            const top = body.scrollTop;
            this.drawerTasks.el.remove();
            this.drawerJournal.el.remove();
            this.last.dbody = bHtml;
            body.innerHTML = bHtml;
            body.scrollTop = top;
        }
        this.placeDrawerPanels(c);
    }

    /** The panel of the drawer's tab goes into its slot, asking for what this machine or node is. */
    private placeDrawerPanels(c: Current) {
        const slot = this.$('dr-slot');
        const wantTasks = this.drawerTab === 'tasks' && c.kind !== 'store';
        const wantJournal = this.drawerTab === 'syslog' && c.kind === 'node';
        if (!wantTasks) this.drawerTasks.stop();
        if (!wantJournal) this.drawerJournal.stop();
        if (!slot) return;
        if (wantTasks) {
            const scope = c.kind === 'guest'
                ? { host: c.host.id, node: c.guest.node, vmid: c.guest.vmid }
                : { host: c.host.id, node: c.node.name };
            this.drawerTasks.show(scope);
            if (this.drawerTasks.el.parentElement !== slot) slot.appendChild(this.drawerTasks.el);
        }
        if (wantJournal) {
            this.drawerJournal.show({ host: c.host.id, node: c.node.name });
            if (this.drawerJournal.el.parentElement !== slot) slot.appendChild(this.drawerJournal.el);
        }
    }

    private guestDrawer(host: PxHost, g: PxGuest): GuestDrawer {
        const view = this.viewOfGuest(host, g);
        const link = linkFor({ ...g, host: host.id });
        const s = this.detailSeries;
        return {
            view, hostName: host.name,
            chart: s ? this.historyCard('d-cpu', this.t('proxmoxpage.history'), s.cpu, g.running ? s.mem : [], 150) : '',
            canPower: this.mayPower(host), busy: this.busy.has(unitId(host.id, g.vmid)),
            bookmarkUrl: link?.url ?? '', hasChosenIcon: !!chosenIcon(host, g.node, g.vmid),
            uptime: g.uptime,
        };
    }
}

if (!customElements.get('proxmox-page')) {
    customElements.define('proxmox-page', ProxmoxPage);
}

export { ProxmoxPage };
