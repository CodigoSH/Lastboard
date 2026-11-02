import { adoptSharedStyles } from '../../../services/sharedStyles';
import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { escapeHtml } from '../../../services/escape';
import { isTypingTarget, opensSearch } from '../../../services/searchShortcut';
import { whenVisible } from '../../../services/whenVisible';
import { PageNav, type NavState } from '../../../services/pageNav';
import { resolveIconUrl } from '../../../services/iconUrl';
import {
    attentionCount, attentionList, bucketLatency, countByFilter, filterOutages, fleetTotals, groupRows, isOutageFilter, isRange, isSortKey, isStateFilter,
    HELD_MS, lowestAvailability, outagesDue, passes, rangeMs, rangeParam, RANGES, readRow, sortOutages, sortRows, statusSignature, trendSeries,
    type Check, type Outage, type OutageFilter, type RangeLabel, type ServiceRow, type SortKey, type StateFilter, type TrendPoint,
} from '../../../services/monitorPage';
import {
    chartHtml, chartIndexAt, CHART_WIDTH, icon, tabsHtml, toolbarHtml, type ChartSpec,
} from '../infra/infra.template';
import '../Select/Select';
import {
    attentionHtml, chartCardForFleet, checksTabHtml, drawerFooterHtml, drawerHeadHtml, inventoryHtml, kpisHtml, latestOutagesBoxHtml, lowestBoxHtml,
    noMatchHtml, outageTableHtml, outagesPanelHtml, outagesTabHtml, stateChips, summaryHtml, summaryTabHtml,
    type Fmt, type MonitoringSetup, type ServiceView, type T,
} from './MonitorPage.template';
import infraCss from '../infra/infra.css' with { type: 'text' };
import css from './MonitorPage.css' with { type: 'text' };

const REFRESH_MS = 30000;
/** How many boards get a button each beside "All" before the header switches to a selector. */
const MAX_BOARD_BUTTONS = 2;
const VIEW_KEY = 'monitor.view';
const SORT_KEY = 'monitor.sort';
const GROUP_KEY = 'monitor.group';

function readPref(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}
function writePref(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* a private window: it holds for this visit */ }
}

type SelectEl = HTMLElement & { options: { value: string; label: string }[]; value: string };
type Tab = 'overview' | 'services' | 'outages';
type DrawerTab = 'summary' | 'outages' | 'checks';

/** What one service's history answers, as far as the panel reads it. */
interface History { checks: Check[]; incidents: Outage[] }

interface Written { head: string; tabs: string; body: string; list: string; tools: string; dhead: string; dtabs: string; dbody: string; dfoot: string; mdl: string }
const blank = (): Written => ({ head: '', tabs: '', body: '', list: '', tools: '', dhead: '', dtabs: '', dbody: '', dfoot: '', mdl: '' });

/** The top of a response chart's axis: a round figure above the readings with some room, never below 100 ms. */
export function niceTop(highest: number): number {
    const target = Math.max(100, (Number.isFinite(highest) ? highest : 0) * 1.2);
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    for (const step of [1, 2, 5, 10]) if (step * pow >= target) return step * pow;
    return 10 * pow;
}

/**
 * The status page of the services you monitor, drawn from the same shell as the
 * Docker and Proxmox pages: a header, tabs, four indicators, an inventory with
 * its search, filters and two views, and a side panel for the service chosen.
 *
 * It reads the same answers the status widget and the history drawer read — one
 * service's history, the overview — plus the fleet's trend and the outages of
 * every service, so the three can never disagree about whether a service is up.
 */
class MonitorPage extends HTMLElement {
    private rows: ServiceRow[] = [];
    private setup: MonitoringSetup | null = null;
    private outages: Outage[] = [];
    /** Whether the outages, and the day's trend, have arrived: they come behind the services, so a box waiting for them says so. */
    private outagesLoaded = false;
    private trendLoaded = false;
    /** What the services said when the outages were last read, and when: the outages are asked for again when it changes. */
    private outagesSig: string | null = null;
    private outagesAt = 0;
    /** When the services were last read: what the page holds is shown at once on opening again while it is read anew. */
    private rowsAt = 0;
    private trends = new Map<RangeLabel, TrendPoint[]>();
    private histories = new Map<string, History>();
    private loaded = false;
    private failed = false;

    private tab: Tab = 'overview';
    private board = 'all';
    private query = '';
    private filter: StateFilter = 'all';
    private sort: SortKey = isSortKey(readPref(SORT_KEY)) ? readPref(SORT_KEY) as SortKey : 'state';
    private grouped = readPref(GROUP_KEY) !== '0';
    private viewMode: 'cards' | 'list' = readPref(VIEW_KEY) === 'list' ? 'list' : 'cards';
    private fleetRange: RangeLabel = '24 h';
    private outRange: RangeLabel = '30 d';
    private outFilter: OutageFilter = 'all';

    private sel: number | null = null;
    private drawerOpen = false;
    private drawerTab: DrawerTab = 'summary';
    private histRange: RangeLabel = '24 h';
    private histSeq = 0;

    /** History entries this page has put on the stack: the page, and a service on a phone. */
    /** The browser's history for this page: Back walks through its tabs and panel before it leaves. */
    private readonly nav = new PageNav('monitor');
    /** True while the page is being put where the history says, so that does not make a step of its own. */
    private applying = false;
    private loading = false;
    private timer: ReturnType<typeof setInterval> | null = null;
    private charts = new Map<string, { spec: ChartSpec; at: number[] }>();
    private last: Written = blank();
    private bodyTab: Tab | '' = '';

    private _unsubscribeI18n: (() => void) | undefined;
    private _listening = false;
    private readonly _keydown: (e: KeyboardEvent) => void;
    private readonly _popstate: (e: PopStateEvent) => void;
    private readonly _visibility: () => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);

        this._keydown = (e: KeyboardEvent) => {
            if (!this.hasAttribute('open')) return;
            // A confirmation answers its own Escape; closing the page under it would be a second effect of one key.
            if (document.querySelector('confirmation-modal')?.shadowRoot?.querySelector('dialog[open]')) return;
            // The list window answers its own Escape.
            if (this.modalKind) return;
            if (e.key === 'Escape') {
                if (this.drawerOpen) this.closeDrawer(); else this.close();
                return;
            }
            const typing = isTypingTarget(e.composedPath()[0] as Element | undefined, 'inv-q');
            if (!opensSearch(e, { locked: false, typing })) return;
            e.preventDefault();
            if (this.tab !== 'services') this.setTab('services');
            const input = this.$('inv-q') as HTMLInputElement | null;
            input?.focus();
            input?.select();
        };

        // Back and Forward: the page shows what the entry it landed on says; before its first entry, it leaves.
        this._popstate = (e: PopStateEvent) => {
            const effect = this.nav.pop(e.state);
            if (effect.kind === 'ignore' || !this.hasAttribute('open')) return;
            if (effect.kind === 'leave') { this.closeQuietly(); return; }
            this.applyNav(effect.state);
        };

        // A tab that was hidden asks again as soon as it is shown, instead of waiting out the timer.
        this._visibility = () => {
            if (document.visibilityState === 'visible' && this.hasAttribute('open')) void this.load();
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
        document.addEventListener('visibilitychange', this._visibility);
        this._unsubscribeI18n = i18n.subscribe(() => {
            this.build();
            if (this.hasAttribute('open')) this.paintAll(true);
        });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
        window.removeEventListener('popstate', this._popstate);
        document.removeEventListener('visibilitychange', this._visibility);
        this.stopTimer();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    // ── Opening and closing ──

    async open() {
        this.setAttribute('open', '');
        // A full-screen page is a place: each step in it is a step of the browser's Back.
        this.nav.open(this.navState());
        document.body.style.overflow = 'hidden';
        // The top bar locks its other actions while the status page is up, the same way it does in edit mode.
        eventBus.emit(EVENTS.MONITOR_OVERVIEW_CHANGED, { open: true });
        this.drawerOpen = false;
        // What the page held when it was last open is shown at once, if it is recent, while the new reading is on its way.
        this.loaded = this.rows.length > 0 && Date.now() - this.rowsAt < HELD_MS;
        this.paintAll(true);
        void this.load(false, true);
        this.stopTimer();
        this.timer = setInterval(whenVisible(() => this.load()), REFRESH_MS);
    }

    private closeQuietly() {
        this.removeAttribute('open');
        document.body.style.overflow = '';
        eventBus.emit(EVENTS.MONITOR_OVERVIEW_CHANGED, { open: false });
        this.stopTimer();
        // Nothing the page asked for is still wanted: a late answer must not paint a closed page.
        this.histSeq++;
    }

    close() {
        // Closing by the X or by Escape takes the page's entries off the history with it.
        this.nav.close();
        this.closeQuietly();
    }

    private stopTimer() {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    // ── Small helpers ──

    private $(id: string): HTMLElement | null {
        return this.shadowRoot?.getElementById(id) ?? null;
    }

    private readonly t: T = (key, params) => i18n.t(key, params);

    private readonly fmt: Fmt = {
        num: (n) => i18n.formatNumber(n),
        avail: (pct, digits = 1) => {
            if (pct < 0) return '—';
            // 99.996 is not "100": a service that failed once should not read as perfect, but 99.999 is not worth four decimals.
            const shown = pct >= 100 ? 100 : pct >= 99.995 ? 99.99 : pct;
            return i18n.formatNumber(shown / 100, { style: 'percent', maximumFractionDigits: shown === 100 ? 0 : digits });
        },
        ms: (n) => {
            if (n === null || !Number.isFinite(n)) return '—';
            if (n >= 1000) return i18n.formatNumber(n / 1000, { style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1 });
            return i18n.formatNumber(Math.round(n), { style: 'unit', unit: 'millisecond', unitDisplay: 'short', maximumFractionDigits: 0 });
        },
        span: (sec) => i18n.formatDuration(sec),
        one: (sec) => i18n.formatDuration(sec, 1),
        ago: (iso) => {
            const at = Date.parse(iso);
            return Number.isFinite(at) ? i18n.formatSpan(at) ?? '' : '';
        },
        date: (iso) => {
            const at = Date.parse(iso);
            return Number.isFinite(at) ? i18n.formatDateTime(new Date(at), { dateStyle: 'medium', timeStyle: 'medium' }) : '—';
        },
        clock: (iso) => {
            const at = Date.parse(iso);
            return Number.isFinite(at) ? i18n.formatDateTime(new Date(at), { timeStyle: 'medium' }) : '—';
        },
    };

    private byId(): Map<number, ServiceRow> {
        return new Map(this.rows.map(r => [r.item_id, r]));
    }

    private current(): ServiceRow | undefined {
        return this.sel === null ? undefined : this.rows.find(r => r.item_id === this.sel);
    }

    /** The services the page is looking at: all of them, or the ones on the board chosen in the header. */
    private scope(): ServiceRow[] {
        return this.board === 'all' ? this.rows : this.rows.filter(r => r.board === this.board);
    }

    private boards(): string[] {
        return [...new Set(this.rows.map(r => r.board).filter(b => b !== ''))];
    }

    private faceOf(r: ServiceRow): string {
        return r.icon ? resolveIconUrl(r.icon) : '';
    }

    private viewOf = (r: ServiceRow): ServiceView => ({
        row: r, face: this.faceOf(r), selected: this.sel === r.item_id, showBoard: !this.grouped,
    });

    // ── Shell ──

    private build() {
        const t = this.t;
        this.shadowRoot!.innerHTML = `
            <style>${infraCss}${css}</style>
            <div class="pg" id="pg">
                <header class="phead" id="phead"></header>
                <nav class="tabs" id="tabs" role="tablist" aria-label="${escapeHtml(t('monitor.overview_title'))}"></nav>
                <div class="pbody" id="body"></div>
            </div>
            <div class="scrim" id="scrim"></div>
            <aside class="drawer" id="drawer" aria-label="${escapeHtml(t('monitor.overview_title'))}">
                <div class="dr__h"><div id="dr-head"></div><div class="dr__tabs" id="dr-tabs" role="tablist"></div></div>
                <div class="dr__b" id="dr-body"></div>
                <div class="dr__f" id="dr-foot"></div>
            </aside>
            <dialog class="mdl" id="mdl" aria-labelledby="mdl-t">
                <div class="mdl__h"><h3 id="mdl-t"></h3><button type="button" class="ibtn" id="mdl-close" aria-label="${escapeHtml(t('general.close'))}" title="${escapeHtml(t('general.close'))}">${icon('x', 16)}</button></div>
                <div class="mdl__b" id="mdl-body"></div>
            </dialog>`;
        this.$('mdl')?.addEventListener('close', () => { this.modalKind = ''; this.last.mdl = ''; });
        this.last = blank();
        this.modalKind = '';
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
            if (el.id === 'hp-board') {
                this.board = value;
                this.paintAll();
            } else if (el.id === 'inv-sort') {
                if (isSortKey(value)) { this.sort = value; writePref(SORT_KEY, value); this.paintInventory(); }
            }
        });
    };

    /** A select that is open closes on any scroll, and a repaint scrolls: the refresh waits for the person to choose. */
    private selectOpen(): boolean {
        return !!this.shadowRoot?.querySelector('app-select[open]');
    }

    private readonly onClick = (e: Event) => {
        const el = e.target as HTMLElement;
        if (el.closest('#hp-close')) { this.close(); return; }
        if (el.closest('#hp-refresh')) { void this.load(true); return; }
        if (el.closest('#mdl-close') || el.id === 'mdl') { this.closeModal(); return; }
        if (el.closest('#dr-close') || el.closest('#scrim')) { this.closeDrawer(); return; }

        const tab = el.closest<HTMLElement>('#tabs [data-tab]');
        // Going to another page puts the side panel away: it belongs to what was in front of it.
        if (tab) { if (this.drawerOpen) this.hideDrawer(); this.setTab(tab.dataset.tab as Tab); return; }
        const dtab = el.closest<HTMLElement>('#dr-tabs [data-tab]');
        if (dtab) { this.setDrawerTab(dtab.dataset.tab as DrawerTab); return; }

        const boardBtn = el.closest<HTMLElement>('[data-board]');
        if (boardBtn) { this.board = boardBtn.dataset.board || 'all'; this.paintAll(); return; }

        const filter = el.closest<HTMLElement>('[data-filter]');
        if (filter && isStateFilter(filter.dataset.filter)) { this.filter = filter.dataset.filter; this.paintTools(); this.paintInventory(); return; }
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
            // The outages tab draws its own tools and list, from the same choice.
            if (this.tab === 'outages') { this.last.body = ''; this.paintBody(); return; }
            this.paintTools();
            this.paintInventory();
            return;
        }

        const fleet = el.closest<HTMLElement>('[data-fleet]');
        if (fleet && isRange(fleet.dataset.fleet)) { this.fleetRange = fleet.dataset.fleet; this.last.body = ''; void this.loadTrend(this.fleetRange); this.paintBody(); return; }
        const orange = el.closest<HTMLElement>('[data-orange]');
        if (orange && isRange(orange.dataset.orange)) { this.outRange = orange.dataset.orange; this.last.body = ''; this.paintBody(); return; }
        const ofilter = el.closest<HTMLElement>('[data-ofilter]');
        if (ofilter && isOutageFilter(ofilter.dataset.ofilter)) { this.outFilter = ofilter.dataset.ofilter; this.last.body = ''; this.paintBody(); return; }
        const range = el.closest<HTMLElement>('[data-range]');
        if (range && isRange(range.dataset.range)) { this.histRange = range.dataset.range; this.last.dbody = ''; void this.loadHistory(); this.paintDrawer(); return; }

        const act = el.closest<HTMLElement>('[data-act]')?.dataset.act;
        if (act === 'settings') { this.openSettings(); return; }
        if (act === 'visit') { const r = this.current(); if (r?.url) window.open(r.url, '_blank', 'noopener'); return; }
        if (act === 'clear') { this.confirmClear(); return; }
        if (act === 'all-outages' || act === 'all-panel-outages' || act === 'all-checks') { this.openModal(act); return; }

        // Outside the panel, on bare page: it closes, as it does on a narrow window by its scrim.
        if (this.drawerOpen && el.closest('#body') && !el.closest('button, input, select, app-select, a, label, .unit, .tr, .task, .attn__row')) { this.closeDrawer(); return; }

        // A service: a card, a row, a line of attention or of outages.
        const unit = el.closest<HTMLElement>('[data-id]');
        if (unit?.dataset.id && !unit.dataset.noopen) {
            this.closeModal();
            this.choose(Number(unit.dataset.id));
            // A service's card in the outages tab opens its panel on the outages, not on the summary.
            if (unit.dataset.openTab === 'outages') this.setDrawerTab('outages');
        }
    };

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
        const when = c.at[index] ? i18n.formatDateTime(new Date(c.at[index]), { dateStyle: 'short', timeStyle: 'short' }) : '';
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

    // ── Navigation ──

    private setTab(tab: Tab) {
        if (tab === this.tab) return;
        this.tab = tab;
        this.navPush();
        this.paintAll();
    }

    private choose(id: number) {
        const same = this.sel === id;
        this.sel = id;
        if (!same) this.histRange = '24 h';
        // Opening a service is a step; choosing another while one is open is not.
        const wasOpen = this.drawerOpen;
        this.showDrawer();
        if (wasOpen) this.navReplace(); else this.navPush();
        this.paintAll();
        void this.loadHistory();
    }

    private showDrawer() {
        if (this.drawerOpen) return;
        this.drawerOpen = true;
        this.drawerTab = 'summary';
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
        return { tab: this.tab, sel: this.drawerOpen && this.sel !== null ? String(this.sel) : null };
    }

    private navPush() { if (!this.applying) this.nav.push(this.navState()); }

    private navReplace() { if (!this.applying) this.nav.replace(this.navState()); }

    /** Puts the page where an entry of the history says: its tab, and the service open in the panel, if any. */
    private applyNav(s: NavState) {
        this.applying = true;
        try {
            this.closeModal();
            if (s.tab !== this.tab) this.setTab(s.tab as Tab);
            if (s.sel !== null && Number.isFinite(Number(s.sel))) this.choose(Number(s.sel));
            else if (this.drawerOpen) this.hideDrawer();
        } finally {
            this.applying = false;
        }
    }

    private hideDrawer() {
        this.drawerOpen = false;
        this.paintAll();
    }

    private setDrawerTab(tab: DrawerTab) {
        this.drawerTab = tab;
        this.last.dbody = '';
        this.paintDrawer();
    }

    /** Settings are in the drawer of the board: the page gets out of the way and the section opens. */
    private openSettings() {
        this.close();
        window.setTimeout(() => {
            const drawer = document.getElementById('right-drawer') as (HTMLElement & { open: () => void; selectSection: (s: string) => void }) | null;
            if (!drawer) return;
            drawer.open();
            drawer.selectSection('monitoring');
        }, 60);
    }

    private confirmClear() {
        const r = this.current();
        if (!r) return;
        eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
            title: this.t('monitor.clear_data'),
            message: this.t('monitor.clear_data_confirm'),
            onConfirm: async () => {
                try {
                    await apiService.delete(`/api/monitor/history?item_id=${r.item_id}`);
                    eventBus.emit(EVENTS.NOTIFY, { message: this.t('monitor.data_cleared'), type: 'success' });
                } catch {
                    eventBus.emit(EVENTS.NOTIFY, { message: this.t('settings.save_error'), type: 'error' });
                }
                this.histories.clear();
                await this.load(true);
            },
        });
    }

    // ── Loading ──

    /**
     * The services come first and the page is drawn from them; the outages and the
     * day's trend, which are the heavy ones, arrive behind and fill their boxes.
     * `fresh` asks for everything again; `opening` also reads the settings.
     */
    private async load(fresh = false, opening = false) {
        if (this.loading) return;
        this.loading = true;
        this.paintHead();
        try {
            const [rows, setup] = await Promise.all([
                apiService.get<(Partial<ServiceRow> & { item_id: number })[]>('/api/monitor/overview'),
                opening || fresh || !this.setup ? apiService.get<MonitoringSetup>('/api/monitor/settings').catch(() => null) : Promise.resolve(null),
            ]);
            this.rows = (Array.isArray(rows) ? rows : []).map(readRow);
            this.rowsAt = Date.now();
            if (setup) this.setup = { ...setup, retention_days: setup.retention_days || 30 };
            this.failed = false;
            if (this.board !== 'all' && !this.boards().includes(this.board)) this.board = 'all';
            if (fresh) this.histories.clear();
        } catch {
            this.failed = this.rows.length === 0;
        }
        this.loading = false;
        this.loaded = true;
        if (!this.hasAttribute('open')) return;
        // A service that is gone is gone.
        if (this.sel !== null && !this.current()) { this.sel = null; this.drawerOpen = false; }
        this.paintAll();
        if (!this.failed) {
            void this.loadDayTrend();
            const sig = statusSignature(this.rows);
            if (fresh || outagesDue({ held: this.outagesSig, now: sig, ageMs: Date.now() - this.outagesAt, anyDown: this.rows.some(r => r.status === 'down') })) void this.loadOutages(sig);
        }
        if (this.fleetRange !== '24 h' && !this.trends.has(this.fleetRange)) void this.loadTrend(this.fleetRange);
        if (this.drawerOpen) void this.loadHistory();
    }

    private async loadDayTrend() {
        try {
            const trend = await apiService.get<{ points: TrendPoint[] }>('/api/monitor/trend?range=24h');
            if (trend?.points) this.trends.set('24 h', trend.points);
        } catch { /* the chart says there is nothing to draw */ }
        this.trendLoaded = true;
        if (this.hasAttribute('open') && this.tab === 'overview') { this.last.body = ''; this.paintBody(); }
    }

    private async loadOutages(sig: string) {
        try {
            const out = await apiService.get<{ incidents: Outage[] }>('/api/monitor/incidents?range=30d');
            this.outages = Array.isArray(out?.incidents) ? sortOutages(out.incidents) : [];
            this.outagesSig = sig;
            this.outagesAt = Date.now();
        } catch { /* what the page held stays, or the boxes say there is none */ }
        this.outagesLoaded = true;
        if (!this.hasAttribute('open')) return;
        this.last.body = '';
        this.paintTabs();
        if (this.tab !== 'services') this.paintBody();
        this.paintModal();
    }

    private async loadTrend(range: RangeLabel) {
        try {
            const out = await apiService.get<{ points: TrendPoint[] }>(`/api/monitor/trend?range=${rangeParam(range)}`);
            if (out?.points) this.trends.set(range, out.points);
        } catch { /* the chart says there is nothing to draw */ }
        if (this.hasAttribute('open') && this.tab === 'overview') { this.last.body = ''; this.paintBody(); }
    }

    private async loadHistory() {
        const r = this.current();
        if (!r) return;
        const key = `${r.item_id}:${this.histRange}`;
        const seq = ++this.histSeq;
        try {
            const out = await apiService.get<{ checks: Check[]; incidents: Outage[] }>(`/api/monitor/history?item_id=${r.item_id}&range=${rangeParam(this.histRange)}`);
            this.histories.set(key, { checks: Array.isArray(out?.checks) ? out.checks : [], incidents: Array.isArray(out?.incidents) ? out.incidents : [] });
        } catch { /* the panel keeps what it had */ }
        if (seq !== this.histSeq || !this.hasAttribute('open')) return;
        this.last.dbody = '';
        this.paintDrawer();
    }

    // ── Painting ──

    private paintAll(force = false) {
        if (force) { this.last = blank(); this.bodyTab = ''; }
        this.paintHead();
        this.paintTabs();
        this.paintBody();
        this.paintDrawer();
        this.paintModal();
        this.$('pg')?.classList.toggle('has-drawer', this.drawerOpen);
        this.$('scrim')?.classList.toggle('on', this.drawerOpen);
        this.$('drawer')?.classList.toggle('on', this.drawerOpen);
    }

    private paintHead() {
        const head = this.$('phead');
        if (!head) return;
        const t = this.t;
        const ready = this.loaded && !this.failed;
        const summary = ready ? summaryHtml(fleetTotals(this.scope()), t, this.fmt) : '';
        const boards = this.boards();
        const few = boards.length > 1 && boards.length <= MAX_BOARD_BUTTONS;
        const pressed = (id: string) => `aria-pressed="${this.board === id}"`;
        const picker = few
            ? `<span class="seg seg--text" role="group" aria-label="${escapeHtml(t('monitorpage.board'))}">
                <button type="button" data-board="all" ${pressed('all')}>${escapeHtml(t('infra.filter_all'))}</button>
                ${boards.map(b => `<button type="button" data-board="${escapeHtml(b)}" ${pressed(b)}>${escapeHtml(b)}</button>`).join('')}
            </span>`
            : boards.length > 1 ? '<app-select id="hp-board"></app-select>' : '';
        const html = `<div class="ptitle">${icon('activity', 20)}<span>${escapeHtml(t('monitor.overview_title'))}</span></div>
            <div class="psum">${summary}</div>
            <span class="pspacer"></span>
            ${picker}
            <button type="button" class="ibtn" id="hp-refresh" aria-label="${escapeHtml(t('infra.refresh'))}" title="${escapeHtml(t('infra.refresh'))}">${icon('refresh', 16)}</button>
            <button type="button" class="ibtn" id="hp-close" aria-label="${escapeHtml(t('general.close'))}" title="${escapeHtml(t('general.close'))}">${icon('x', 16)}</button>`;
        if (html !== this.last.head) {
            this.last.head = html;
            head.innerHTML = html;
        }
        // The spinner is a class, not markup: rewriting the header every refresh would close an open selector.
        head.querySelector('#hp-refresh svg')?.classList.toggle('spin', this.loading);
        const sel = head.querySelector<SelectEl>('#hp-board');
        if (sel) {
            this.setSelect(sel, [{ value: 'all', label: t('infra.filter_all') }, ...boards.map(b => ({ value: b, label: b }))], this.board, t('monitorpage.board'));
        }
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

    private paintTabs() {
        const el = this.$('tabs');
        if (!el) return;
        const t = this.t;
        const ready = this.loaded && !this.failed;
        const warn = ready ? attentionCount(attentionList(this.scope(), this.setup?.mode ?? 'background')) : 0;
        const ongoing = this.outages.filter(o => o.end === null).length;
        const html = tabsHtml([
            { id: 'overview', label: t('infra.tab_overview'), count: warn > 0 ? warn : undefined, bad: true },
            { id: 'services', label: t('monitor.services'), count: ready ? this.scope().length : undefined },
            { id: 'outages', label: t('monitor.incidents'), count: ready && ongoing > 0 ? ongoing : undefined, bad: true },
        ], this.tab, n => this.fmt.num(n));
        if (html === this.last.tabs) return;
        this.last.tabs = html;
        el.innerHTML = html;
    }

    private setBody(body: HTMLElement, tab: Tab, html: string) {
        if (this.bodyTab === tab && this.last.body === html) return;
        body.innerHTML = html;
        this.bodyTab = tab;
        this.last.body = html;
        this.last.list = '';
    }

    /** The body: what the chosen tab shows. Each tab owns regions of its own, written only when they change. */
    private paintBody() {
        const body = this.$('body');
        if (!body || this.selectOpen()) return;
        const t = this.t;
        if (!this.loaded) { this.setBody(body, this.tab, `<div class="empty">${escapeHtml(t('general.loading'))}</div>`); return; }
        if (this.failed) { this.setBody(body, this.tab, `<div class="err" role="alert">${icon('alert', 18)}<span>${escapeHtml(t('docker.connection_error'))}</span></div>`); return; }
        if (!this.rows.length) { this.setBody(body, this.tab, `<div class="empty"><b>${escapeHtml(t('monitor.overview_empty'))}</b></div>`); return; }

        if (this.tab === 'overview') {
            this.charts.clear();
            const top = body.scrollTop;
            this.setBody(body, 'overview', this.overviewHtml());
            body.scrollTop = top;
        } else if (this.tab === 'services') {
            if (this.bodyTab !== 'services') {
                body.innerHTML = '<div id="inv-tools"></div><div id="inv-list"></div>';
                this.bodyTab = 'services';
                this.last.tools = this.last.list = this.last.body = '';
            }
            this.paintTools();
            this.paintInventory();
        } else {
            const top = body.scrollTop;
            this.setBody(body, 'outages', this.outagesHtml());
            body.scrollTop = top;
        }
    }

    private overviewHtml(): string {
        const t = this.t, fmt = this.fmt;
        const scope = this.scope();
        const totals = fleetTotals(scope);
        const day = this.trends.get('24 h');
        const daySeries = day ? trendSeries(day) : null;
        const avail = day ? day.map(p => p.uptime_pct).filter((v): v is number => v !== null) : [];
        const sparks = { avail, response: daySeries?.mean ?? [] };

        const points = this.trends.get(this.fleetRange);
        const s = points ? trendSeries(points) : null;
        let chart = '';
        if (s && s.mean.length > 1) {
            const spec: ChartSpec = {
                series: [{ name: t('monitorpage.mean'), color: 'var(--ok)', data: s.mean }, { name: t('monitorpage.slowest'), color: 'var(--warn)', data: s.max }],
                max: niceTop(Math.max(...s.max)), height: 230, fmt: v => fmt.ms(v),
                edges: [this.edge(s.at[0]), this.edge(s.at[s.at.length - 1])],
            };
            chart = chartHtml('fleet', spec);
            this.charts.set('fleet', { spec, at: s.at });
        }
        const items = attentionList(scope, this.setup?.mode ?? 'background');
        const attn = `<section class="box"><span class="pill">${escapeHtml(t('dockerpage.attention'))}<span class="pill__n">${escapeHtml(fmt.num(attentionCount(items)))}</span></span>${attentionHtml(items, this.byId(), t, fmt)}</section>`;
        const mine = new Set(scope.map(r => r.item_id));
        const recent = this.outages.filter(o => o.item_id !== undefined && mine.has(o.item_id));
        return `${kpisHtml(totals, this.setup, sparks, t, fmt)}
            <div class="grid g-main" style="margin-block-start:12px">${chartCardForFleet(chart, this.fleetRange, RANGES, t, this.fleetRange === '24 h' && !this.trendLoaded)}${attn}</div>
            <div class="grid g-2">${lowestBoxHtml(lowestAvailability(scope), t, fmt)}${latestOutagesBoxHtml(recent.slice(0, 6), t, fmt, recent.length, !this.outagesLoaded)}</div>`;
    }

    private edge(ms: number): string {
        return i18n.formatDateTime(new Date(ms), this.fleetRange === '24 h' ? { timeStyle: 'short' } : { month: 'short', day: 'numeric' });
    }

    private outagesHtml(): string {
        if (!this.outagesLoaded) return `<div class="empty">${escapeHtml(this.t('general.loading'))}</div>`;
        const mine = new Set(this.scope().map(r => r.item_id));
        const now = Date.now();
        const window = rangeMs(this.outRange);
        // An outage shows in a range when it was still going on, or ended, inside it.
        const inRange = this.outages.filter(o => o.item_id !== undefined && mine.has(o.item_id) && (o.end === null || Date.parse(o.end) >= now - window));
        return outagesTabHtml(inRange, filterOutages(inRange, this.outFilter), this.outRange, RANGES, this.outFilter, this.t, this.fmt, this.viewMode, (id) => { const r = id === undefined ? undefined : this.byId().get(id); return r ? this.faceOf(r) : ''; });
    }

    private paintTools() {
        const el = this.$('inv-tools');
        if (!el) return;
        const t = this.t;
        const counts = countByFilter(this.scope());
        const html = toolbarHtml({
            query: this.query, status: this.filter, counts, chips: stateChips(t), sort: this.sort,
            grouped: this.grouped, view: this.viewMode, searchLabel: t('monitor.search_placeholder'), groupLabel: t('monitorpage.group_board'),
            shortcut: /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K',
        }, t, n => this.fmt.num(n));
        // The counts are written in place, so that a refresh neither costs the search its caret nor closes the sort selector.
        if (html !== this.last.tools && !(this.shadowRoot?.activeElement?.id === 'inv-q' && el.firstChild)) {
            this.last.tools = html;
            el.innerHTML = html;
        }
        el.querySelectorAll<HTMLElement>('[data-filter] .n').forEach(n => {
            const text = this.fmt.num(counts[(n.parentElement as HTMLElement).dataset.filter as StateFilter]);
            if (n.textContent !== text) n.textContent = text;
        });
        const sort = el.querySelector<SelectEl>('#inv-sort');
        if (sort) {
            this.setSelect(sort, [
                { value: 'state', label: t('infra.sort_state') }, { value: 'name', label: t('infra.sort_name') },
                { value: 'uptime', label: t('monitorpage.sort_uptime') }, { value: 'response', label: t('monitor.response') },
            ], this.sort, t('infra.sort'));
        }
    }

    private paintInventory() {
        const el = this.$('inv-list');
        if (!el) return;
        const t = this.t;
        const all = this.scope();
        const shown = sortRows(all.filter(r => passes(r, this.query, this.filter)), this.sort);
        const html = shown.length
            ? inventoryHtml(groupRows(shown, this.grouped), this.viewMode, this.viewOf, t, this.fmt)
            : noMatchHtml(t, all.length > 0);
        if (html === this.last.list) return;
        this.last.list = html;
        // The card the keyboard is on must still be on it after the list is written again.
        const active = this.shadowRoot?.activeElement as HTMLElement | null;
        const focus = active && el.contains(active) ? active.dataset.id : null;
        const body = this.$('body');
        const top = body?.scrollTop ?? 0;
        el.innerHTML = html;
        if (body) body.scrollTop = top;
        if (focus) el.querySelector<HTMLElement>(`[data-id="${focus}"]`)?.focus({ preventScroll: true });
    }

    // ── The window with every line ──

    private modalKind: '' | 'all-outages' | 'all-panel-outages' | 'all-checks' = '';

    private openModal(kind: 'all-outages' | 'all-panel-outages' | 'all-checks') {
        this.modalKind = kind;
        this.last.mdl = '';
        this.paintModal();
        const dlg = this.$('mdl') as HTMLDialogElement | null;
        if (dlg && !dlg.open) dlg.showModal();
    }

    private closeModal() {
        if (!this.modalKind) return;
        this.modalKind = '';
        (this.$('mdl') as HTMLDialogElement | null)?.close();
    }

    /** Fills the window from what the page already holds, so a refresh behind it keeps it current. */
    private paintModal() {
        const title = this.$('mdl-t'), body = this.$('mdl-body');
        if (!title || !body || !this.modalKind) return;
        const t = this.t, fmt = this.fmt;
        let name = '', n = 0, html = '';
        if (this.modalKind === 'all-outages') {
            const mine = new Set(this.scope().map(r => r.item_id));
            const list = this.outages.filter(o => o.item_id !== undefined && mine.has(o.item_id));
            name = t('monitorpage.latest'); n = list.length;
            html = outageTableHtml(list, true, t, fmt);
        } else {
            const r = this.current();
            const hist = r ? this.histories.get(`${r.item_id}:${this.histRange}`) : undefined;
            const thirty = r ? this.histories.get(`${r.item_id}:30 d`) : undefined;
            if (this.modalKind === 'all-panel-outages') {
                const list = (thirty ?? hist)?.incidents ?? [];
                name = `${r?.name ?? ''} · ${t('monitor.incidents')}`; n = list.length;
                html = outagesPanelHtml(list, t, fmt, true);
            } else {
                const checks = hist?.checks ?? [];
                name = `${r?.name ?? ''} · ${t('monitorpage.tab_checks')}`; n = checks.length;
                html = checksTabHtml(checks, (this.setup?.retention_days ?? 30) * 86400, t, fmt, true);
            }
        }
        title.innerHTML = `${escapeHtml(name)}<span class="mdl__n">${escapeHtml(fmt.num(n))}</span>`;
        if (html !== this.last.mdl) { this.last.mdl = html; const top = body.scrollTop; body.innerHTML = html; body.scrollTop = top; }
    }

    // ── The drawer ──

    private paintDrawer() {
        const head = this.$('dr-head'), tabs = this.$('dr-tabs'), body = this.$('dr-body'), foot = this.$('dr-foot');
        if (!head || !tabs || !body || !foot) return;
        const r = this.current();
        if (!this.drawerOpen || !r) return;
        const t = this.t, fmt = this.fmt;

        const hHtml = drawerHeadHtml({ row: r, face: this.faceOf(r) }, t);
        if (hHtml !== this.last.dhead) { this.last.dhead = hHtml; head.innerHTML = hHtml; }

        const hist = this.histories.get(`${r.item_id}:${this.histRange}`);
        const thirty = this.histories.get(`${r.item_id}:30 d`);
        const tHtml = tabsHtml([
            { id: 'summary', label: t('dockerpage.tab_summary') },
            { id: 'outages', label: t('monitor.incidents'), count: (thirty ?? hist)?.incidents.length || undefined, bad: r.status === 'down' },
            { id: 'checks', label: t('monitorpage.tab_checks') },
        ], this.drawerTab, n => fmt.num(n));
        if (tHtml !== this.last.dtabs) { this.last.dtabs = tHtml; tabs.innerHTML = tHtml; }

        const fHtml = drawerFooterHtml(r, t);
        if (fHtml !== this.last.dfoot) { this.last.dfoot = fHtml; foot.innerHTML = fHtml; }

        let bHtml: string;
        if (this.drawerTab === 'summary') {
            this.charts.delete('service');
            let chart = '';
            if (hist) {
                const now = Date.now();
                const b = bucketLatency(hist.checks, now - rangeMs(this.histRange), now);
                if (b.values.length > 1) {
                    const spec: ChartSpec = {
                        series: [{ name: t('monitor.response'), color: 'var(--ok)', data: b.values }],
                        max: niceTop(Math.max(...b.values)), height: 170, fmt: v => fmt.ms(v),
                        edges: [this.edgeAt(b.at[0]), this.edgeAt(b.at[b.at.length - 1])],
                    };
                    chart = chartHtml('service', spec);
                    this.charts.set('service', { spec, at: b.at });
                }
            }
            bHtml = summaryTabHtml({ row: r, chart, range: this.histRange, ranges: RANGES, setup: this.setup }, t, fmt);
        } else if (this.drawerTab === 'outages') {
            bHtml = outagesPanelHtml((thirty ?? hist)?.incidents ?? [], t, fmt);
        } else {
            bHtml = checksTabHtml(hist?.checks ?? [], (this.setup?.retention_days ?? 30) * 86400, t, fmt);
        }
        if (bHtml !== this.last.dbody) {
            const top = body.scrollTop;
            this.last.dbody = bHtml;
            body.innerHTML = bHtml;
            body.scrollTop = top;
        }
        // The outages of the panel are asked for over the whole retention, once, when their tab is opened.
        if (this.drawerTab === 'outages' && !thirty) void this.loadThirty(r.item_id);
    }

    private edgeAt(ms: number): string {
        return i18n.formatDateTime(new Date(ms), this.histRange === '24 h' ? { timeStyle: 'short' } : { month: 'short', day: 'numeric' });
    }

    private async loadThirty(id: number) {
        const key = `${id}:30 d`;
        // A placeholder first, so painting the tab does not ask again while the answer is on its way.
        this.histories.set(key, { checks: [], incidents: [] });
        try {
            const out = await apiService.get<{ incidents: Outage[] }>(`/api/monitor/history?item_id=${id}&range=30d`);
            this.histories.set(key, { checks: [], incidents: Array.isArray(out?.incidents) ? out.incidents : [] });
        } catch { this.histories.delete(key); return; }
        if (this.hasAttribute('open') && this.sel === id) { this.last.dbody = ''; this.paintDrawer(); }
    }
}

if (!customElements.get('monitor-page')) {
    customElements.define('monitor-page', MonitorPage);
}

export { MonitorPage };
