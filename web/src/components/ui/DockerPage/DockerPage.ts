import { adoptSharedStyles } from '../../../services/sharedStyles';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { escapeHtml } from '../../../services/escape';
import { isTypingTarget, opensSearch } from '../../../services/searchShortcut';
import { whenVisible } from '../../../services/whenVisible';
import { savingData, whenRefreshing } from '../../../services/refreshClock';
import { targetTab, type PageTarget } from '../../../services/pageTarget';
import { heldReading } from '../../../services/infraReadings';
import { PageNav, type NavState } from '../../../services/pageNav';
import { dashboardStore } from '../../../store/dashboardStore';
import { userStore } from '../../../store/userStore';
import { accessAllows } from '../../../services/access';
import { fetchDockerSettings, hostsForWidget, saveDockerIcon } from '../../../services/dockerHosts';
import { chosenDockerIcon, withDockerIcon } from '../../../services/dockerIcons';
import { dockerLinkFor, loadDockerLinks } from '../../../services/dockerLinks';
import { resolveIconUrl } from '../../../services/iconUrl';
import { materializeIcon } from '../../../services/iconStore';
import { fetchContainers, hostErrorKey, containerName, defaultContainerUrl } from '../../../services/dockerShared';
import {
    fetchDetail, fetchDiskUsage, fetchHostSize, fetchLogs, fetchStats, runAction, pageErrorKey, findSelected,
    mergeLogLines, overflow, atBottom, logsToText, logDate, stateLevel, MAX_LOG_LINES,
    type DiskUsage, type DockerDetail, type HostRows, type HostSize, type LogLine, type ContainerStats, type ContainerAction,
} from '../../../services/dockerPage';
import {
    attentionList, byteUnit, diskTotals, dockerTotals, dockerUnits, niceMax, projectRows, pushHistory, type HistoryPoint, type LinkOf,
} from '../../../services/dockerOverview';
import {
    countUnits, groupUnits, isSortKey, isStatusFilter, passes, sortUnits, type SortKey, type StatusFilter,
} from '../../../services/infraUnits';
import {
    chartHtml, chartIndexAt, CHART_WIDTH, icon, sortOptions, tabsHtml, toolbarHtml, type ChartSpec,
} from '../infra/infra.template';
import '../Select/Select';
import {
    drawerHeadHtml, envTabHtml, footerHtml, hostErrorHtml, inventoryHtml, logLineHtml, logViewerHtml,
    diskModalHtml, mountsTabHtml, noMatchHtml, overviewHtml, summaryHtml, summaryTabHtml, type Fmt, type T, type UnitView,
} from './DockerPage.template';
import infraCss from '../infra/infra.css' with { type: 'text' };
import css from './DockerPage.css' with { type: 'text' };

/** How many hosts get a button each beside "All" before the header switches to a selector. */
const MAX_HOST_BUTTONS = 2;
const LIST_MS = 10000;
/** How long what Docker holds on disk is trusted. */
const DISK_MS = 300000;
const LOG_MS = 3000;
const FIRST_TAIL = 100;
const MORE_TAIL = 1000;
const FOLLOW_KEY = 'docker.logFollow';
const STAMPS_KEY = 'docker.logTimestamps';
const VIEW_KEY = 'docker.view';
const SORT_KEY = 'docker.sort';
const GROUP_KEY = 'docker.group';

function readPref(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}
function writePref(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* a private window: it holds for this visit */ }
}
function readFlag(key: string, fallback: boolean): boolean {
    const v = readPref(key);
    return v === null ? fallback : v === '1';
}
function writeFlag(key: string, on: boolean): void {
    writePref(key, on ? '1' : '0');
}

/** What a host that could not say what it holds on disk is read as. */
const blankDisk = (): DiskUsage => ({
    available: false, total: 0, reclaimable: 0,
    images: { count: 0, size: 0, reclaimable: 0 }, containers: { count: 0, size: 0, reclaimable: 0 },
    volumes: { count: 0, size: 0, reclaimable: 0 }, cache: { count: 0, size: 0, reclaimable: 0 },
});

/** The product's select, as the page drives it. */
type SelectEl = HTMLElement & { options: { value: string; label: string }[]; value: string };

type Tab = 'overview' | 'containers' | 'logs';
const TABS: readonly Tab[] = ['overview', 'containers', 'logs'];
type DrawerTab = 'summary' | 'logs' | 'env' | 'mounts';

interface Written {
    head: string; tabs: string; body: string; list: string; tools: string;
    dhead: string; dtabs: string; dbody: string; dfoot: string; pick: string;
}
const blank = (): Written => ({ head: '', tabs: '', body: '', list: '', tools: '', dhead: '', dtabs: '', dbody: '', dfoot: '', pick: '' });

/** What the page remembers of the session. It outlives closing the page, not the browser tab. */
let sessionHistory: HistoryPoint[] = [];

/**
 * The Docker containers of the account, as a page of the board.
 *
 * Drawn from the same shell as the Proxmox page: a header, tabs, four
 * indicators, an inventory and a drawer for whatever is chosen. It reads
 * through the same hosts and the same permissions as the widget, so a member
 * only sees what the account may.
 */
class DockerPage extends HTMLElement {
    private groups: HostRows[] = [];
    private stats = new Map<string, ContainerStats>();
    /** How big each host is, once it has said. Not kept for one that could not: it is asked again on the next opening. */
    private sizes = new Map<string, HostSize>();
    /** What each host holds on disk, and when it was asked: the daemon takes a while to measure it, so it is not asked at every refresh. */
    private disks = new Map<string, { at: number; usage: DiskUsage }>();
    private diskAsking = false;
    /** The faces the account chose for containers, keyed host id + "/" + name. */
    private icons: Record<string, string> = {};
    private loaded = false;
    private fatal = '';
    private noHosts = false;

    private tab: Tab = 'overview';
    private hostFilter = 'all';
    private query = '';
    private status: StatusFilter = 'all';
    private sort: SortKey = isSortKey(readPref(SORT_KEY)) ? readPref(SORT_KEY) as SortKey : 'name';
    private grouped = readFlag(GROUP_KEY, false);
    private viewMode: 'cards' | 'list' = readPref(VIEW_KEY) === 'list' ? 'list' : 'cards';

    private sel: { hostId: string; name: string } | null = null;
    private drawerOpen = false;
    /** Open for its side panel alone, over the board: the page itself is not shown and the top bar stays free. */
    private panelOnly = false;
    private drawerTab: DrawerTab = 'summary';
    private detail: DockerDetail | null = null;
    private detailErr = '';

    private lines: LogLine[] = [];
    private logsErr = '';
    private logsLoaded = false;
    private truncated = false;
    private loadedTail = FIRST_TAIL;
    private follow = readFlag(FOLLOW_KEY, true);
    private stamps = readFlag(STAMPS_KEY, true);
    private busy = new Set<string>();

    /** History entries this page has put on the stack: the page, and a container on a phone. */
    /** The browser's history for this page: Back walks through its tabs and panel before it leaves. */
    private readonly nav = new PageNav('docker');
    /** True while the page is being put where the history says, so that does not make a step of its own. */
    private applying = false;
    private loading = false;
    private polling = false;
    private detailSeq = 0;
    private logSeq = 0;
    private listTimer: ReturnType<typeof setInterval> | null = null;
    private logTimer: ReturnType<typeof setInterval> | null = null;

    /** The chart on screen, by id, so the cursor can read it out. */
    private charts = new Map<string, { spec: ChartSpec; at: number[] }>();
    /** The log viewer is built once and moved between its two places, so its state is one. */
    private viewer: HTMLElement | null = null;

    // What was last written into each region, so a refresh that changes nothing writes nothing.
    private last: Written = blank();
    private bodyTab: Tab | '' = '';

    private _listening = false;
    private _unsubscribeI18n: (() => void) | undefined;
    private readonly _keydown: (e: KeyboardEvent) => void;
    private readonly _popstate: (e: PopStateEvent) => void;
    private readonly _visibility: () => void;

    /** The bookmark a container serves, as its label: declared in the bookmark itself, across every board. */
    private readonly linkOf: LinkOf = (hostId, name) => {
        const l = dockerLinkFor(hostId, name);
        return l ? (l.label || l.url || name) : '';
    };

    /** The face of a container: what its owner chose, then what its bookmark wears. */
    private faceOf(hostId: string, name: string): string {
        const face = chosenDockerIcon(this.icons, hostId, name) || dockerLinkFor(hostId, name)?.icon || '';
        return face ? resolveIconUrl(face) : '';
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);

        this._keydown = (e: KeyboardEvent) => {
            if (!this.hasAttribute('open')) return;
            // A confirmation answers its own Escape; closing the page under it would be a second effect of one key.
            if (document.querySelector('confirmation-modal')?.shadowRoot?.querySelector('dialog[open]')) return;
            if (document.querySelector('icon-selection-modal')?.shadowRoot?.querySelector('dialog[open]')) return;
            // The window answers its own Escape.
            if ((this.$('mdl') as HTMLDialogElement | null)?.open) return;
            if (e.key === 'Escape') {
                if (this.drawerOpen) this.closeDrawer(); else this.close();
                return;
            }
            const typing = isTypingTarget(e.composedPath()[0] as Element | undefined, 'inv-q');
            if (!opensSearch(e, { locked: false, typing })) return;
            e.preventDefault();
            if (this.tab !== 'containers') this.setTab('containers');
            const input = this.$('inv-q') as HTMLInputElement | null;
            input?.focus();
            input?.select();
        };

        // Back and Forward: the page shows what the entry it landed on says; before its first entry, it leaves.
        this._popstate = (e: PopStateEvent) => {
            const effect = this.nav.pop(e.state);
            if (effect.kind === 'ignore') return;
            if (!this.hasAttribute('open')) {
                // Forward onto an entry of this page, which is closed: it comes back at that step. While the board is
                // being edited nothing takes the screen from it, and the entry is let go.
                if (effect.kind !== 'show') return;
                if (dashboardStore.getState().isEditing) { this.nav.forget(); return; }
                void this.open({ tab: effect.state.tab, sel: effect.state.sel ?? undefined });
                return;
            }
            if (effect.kind === 'leave') { this.closeQuietly(); return; }
            this.applyNav(effect.state);
        };

        // A tab that was hidden asks again as soon as it is shown, instead of waiting out the timer.
        this._visibility = () => {
            if (document.visibilityState !== 'visible' || !this.hasAttribute('open')) return;
            if (!savingData()) void this.load();
            void this.pollLogs();
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
            // Every label is written into the shell, so a language change is one of the two moments it is written again.
            this.build();
            if (this.hasAttribute('open')) this.paintAll(true);
        });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
        window.removeEventListener('popstate', this._popstate);
        document.removeEventListener('visibilitychange', this._visibility);
        this.stopTimers();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    // ── Opening and closing ──

    /**
     * Opens the page, at a tab and with a container in the panel when the caller says so (a tile of the board
     * pointing at one). `sel` is written the way the history writes it, "host/name".
     */
    open(target?: PageTarget) {
        this.setAttribute('open', '');
        this.panelOnly = !!target?.panel && !!target.sel;
        this.toggleAttribute('panel-only', this.panelOnly);
        if (!this.panelOnly) eventBus.emit(EVENTS.DOCKER_PAGE_CHANGED, { open: true });
        this.drawerOpen = false;
        // The first entry of the page already says which tab it opened on, so Back from the panel lands there.
        const asked = targetTab(target, TABS);
        if (asked && !this.panelOnly) this.tab = asked;
        // A full-screen page is a place: each step in it is a step of the browser's Back.
        this.nav.open(this.navState());
        this.loaded = false;
        this.paintAll(true);
        void this.load(true);
        this.seedFromTile();
        if (this.listTimer) clearInterval(this.listTimer);
        this.listTimer = setInterval(whenRefreshing(() => this.load()), LIST_MS);
        this.syncPolling();
        // The panel opens at once, before the reading: it names the container and fills in when the answer comes.
        const at = target?.sel ? target.sel.indexOf('/') : -1;
        if (target?.sel && at > 0) this.choose(target.sel.slice(0, at), target.sel.slice(at + 1), true);
    }

    /**
     * What a tile of the board last read is what the page opens on, until its own answer arrives. Only when the tile
     * read every host the page will show: a page that began with some of its hosts would look as if the others were gone.
     */
    private seedFromTile() {
        const held = heldReading<HostRows[]>('docker');
        if (!held) return;
        void fetchDockerSettings().then(settings => {
            if (this.loaded || !this.hasAttribute('open')) return;
            const hosts = hostsForWidget(settings.hosts);
            const byId = new Map(held.value.map(g => [g.host.id, g]));
            if (!hosts.length || !hosts.every(h => byId.has(h.id))) return;
            this.groups = hosts.map(h => byId.get(h.id)!);
            this.icons = settings.icons ?? {};
            this.loaded = true;
            this.paintAll();
        }).catch(() => { });
    }

    private closeQuietly() {
        this.removeAttribute('open');
        if (!this.panelOnly) eventBus.emit(EVENTS.DOCKER_PAGE_CHANGED, { open: false });
        this.panelOnly = false;
        this.removeAttribute('panel-only');
        this.stopTimers();
        // Nothing the page asked for is still wanted: a late answer must not paint a closed page.
        this.detailSeq++;
        this.logSeq++;
    }

    close(): number {
        // Closing by the X or by Escape takes the page's entries off the history with it; how many is handed back.
        const steps = this.nav.close();
        this.closeQuietly();
        return steps;
    }

    private stopTimers() {
        if (this.listTimer) { clearInterval(this.listTimer); this.listTimer = null; }
        if (this.logTimer) { clearInterval(this.logTimer); this.logTimer = null; }
    }

    // ── Small helpers ──

    private $(id: string): HTMLElement | null {
        return this.shadowRoot?.getElementById(id) ?? null;
    }

    private readonly t: T = (key, params) => i18n.t(key, params);
    /** When the last reading arrived, said under the header; and the refresh's pause while the browser asks to save data. */

    private readonly fmt: Fmt = {
        date: (iso) => {
            const d = logDate(iso);
            return d ? i18n.formatDateTime(d, { dateStyle: 'medium', timeStyle: 'medium' }) : '—';
        },
        num: (n) => i18n.formatNumber(n),
        pct: (n) => i18n.formatNumber(n / 100, { style: 'percent', maximumFractionDigits: 1 }),
        dec: (n) => i18n.formatNumber(n, { maximumFractionDigits: 2 }),
        bytes: (n) => {
            const { value, unit } = byteUnit(n);
            return i18n.formatNumber(value, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: value < 10 && unit !== 'byte' ? 1 : 0 });
        },
    };

    private stamp = (t: string): string => {
        const d = logDate(t);
        return d ? i18n.formatDateTime(d, {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
        }) : '';
    };

    private mayControl(): boolean {
        const user = userStore.getUser();
        return !!user && accessAllows(user, 'docker_control');
    }

    private current() {
        return findSelected(this.groups, this.sel);
    }

    /** The hosts the page is looking at: all of them, or the one chosen in the header. */
    private scope(): HostRows[] {
        return this.hostFilter === 'all' ? this.groups : this.groups.filter(g => g.host.id === this.hostFilter);
    }

    /** Where the log viewer is on screen right now, if it is. */
    private viewerPlace(): 'drawer' | 'page' | null {
        if (this.drawerOpen && this.drawerTab === 'logs' && this.sel) return 'drawer';
        if (this.tab === 'logs' && this.sel) return 'page';
        return null;
    }

    private statsObject(): Record<string, ContainerStats> {
        return Object.fromEntries(this.stats);
    }

    // ── Shell ──

    private build() {
        const t = this.t;
        this.shadowRoot!.innerHTML = `
            <style>${infraCss}${css}</style>
            <div class="pg" id="pg">
                <header class="phead" id="phead"></header>
                <div class="tabsbar"><nav class="tabs" id="tabs" role="tablist" aria-label="${escapeHtml(t('widget.docker.name'))}"></nav></div>
                <div class="pbody" id="body"></div>
            </div>
            <div class="scrim" id="scrim"></div>
            <aside class="drawer" id="drawer" aria-label="${escapeHtml(t('dockerpage.details'))}">
                <div class="dr__h"><div id="dr-head"></div><div class="dr__tabs" id="dr-tabs" role="tablist"></div></div>
                <div class="dr__b" id="dr-body"></div>
                <div class="dr__f" id="dr-foot"></div>
            </aside>
            <dialog class="mdl mdl--sm" id="mdl" aria-labelledby="mdl-t">
                <div class="mdl__h"><h3 id="mdl-t">${escapeHtml(t('proxmox.storage'))}</h3><button type="button" class="ibtn" id="mdl-close" aria-label="${escapeHtml(t('general.close'))}" title="${escapeHtml(t('general.close'))}">${icon('x', 16)}</button></div>
                <div class="mdl__b" id="mdl-body"></div>
            </dialog>`;
        const tmp = document.createElement('div');
        tmp.innerHTML = logViewerHtml(t, i18n.formatNumber(MORE_TAIL));
        this.viewer = tmp.firstElementChild as HTMLElement;
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
            if (el.id === 'hp-host') {
                this.hostFilter = value;
                this.paintAll();
            } else if (el.id === 'inv-sort') {
                if (isSortKey(value)) { this.sort = value; writePref(SORT_KEY, value); this.paintInventory(); }
            } else if (el.id === 'lg-pick') {
                const i = value.indexOf('/');
                if (i > 0) this.choose(value.slice(0, i), value.slice(i + 1), false);
            }
        });
    };

    /** A select that is open closes on any scroll, and a repaint scrolls: the refresh waits for the person to choose. */
    private selectOpen(): boolean {
        return !!this.shadowRoot?.querySelector('app-select[open]');
    }

    /** The rest of what Docker holds on disk, from the same reading the tile is drawn from. */
    private openDisk() {
        const disk = this.diskState(this.scope());
        const body = this.$('mdl-body'), dlg = this.$('mdl') as HTMLDialogElement | null;
        if (!body || !dlg || disk.state !== 'ready') return;
        body.innerHTML = diskModalHtml(disk.totals, this.t, this.fmt);
        if (!dlg.open) dlg.showModal();
    }

    private readonly onClick = (e: Event) => {
        const el = e.target as HTMLElement;
        if (el.closest('#hp-close')) { this.close(); return; }
        if (el.closest('#hp-refresh')) { void this.load(true); return; }
        if (el.closest('#mdl-close') || el.id === 'mdl') { (this.$('mdl') as HTMLDialogElement | null)?.close(); return; }
        if (el.closest('[data-act="disk-more"]')) { this.openDisk(); return; }
        if (el.closest('#dr-close') || el.closest('#scrim')) { this.closeDrawer(); return; }

        const tab = el.closest<HTMLElement>('#tabs [data-tab]');
        // Going to another page puts the side panel away: it belongs to what was in front of it.
        if (tab) { if (this.drawerOpen) this.hideDrawer(); this.setTab(tab.dataset.tab as Tab); return; }
        const dtab = el.closest<HTMLElement>('#dr-tabs [data-tab]');
        if (dtab) { this.setDrawerTab(dtab.dataset.tab as DrawerTab); return; }

        const hostf = el.closest<HTMLElement>('[data-hostf]');
        if (hostf) { this.hostFilter = hostf.dataset.hostf || 'all'; this.paintAll(); return; }

        const filter = el.closest<HTMLElement>('[data-filter]');
        if (filter && isStatusFilter(filter.dataset.filter)) { this.status = filter.dataset.filter; this.paintTools(); this.paintInventory(); return; }
        if (el.closest('#inv-group')) {
            this.grouped = !this.grouped;
            writeFlag(GROUP_KEY, this.grouped);
            this.paintTools();
            this.paintInventory();
            return;
        }
        const view = el.closest<HTMLElement>('[data-view]');
        if (view) {
            this.viewMode = view.dataset.view === 'list' ? 'list' : 'cards';
            writePref(VIEW_KEY, this.viewMode);
            this.paintTools();
            this.paintInventory();
            return;
        }

        // A project: the containers tab, narrowed to it. A host: everything is read for that host.
        const project = el.closest<HTMLElement>('[data-project]');
        if (project) { this.query = project.dataset.project || ''; this.status = 'all'; this.tab = 'containers'; this.navPush(); this.last.tools = ''; this.paintAll(); return; }
        const hostcard = el.closest<HTMLElement>('[data-hostcard]');
        if (hostcard) { this.hostFilter = hostcard.dataset.hostcard || 'all'; this.paintAll(); return; }

        // Outside the panel, on bare page: it closes, as it does on a narrow window by its scrim.
        if (this.drawerOpen && el.closest('#body') && !el.closest('button, input, select, app-select, a, label, .unit, .tr')) { this.closeDrawer(); return; }

        // A container: a card, a row, or an item of the attention list.
        const unit = el.closest<HTMLElement>('.unit, .tr:not(.tr--h), .attn__row');
        if (unit?.dataset.name) { this.choose(unit.dataset.host || '', unit.dataset.name || '', true); return; }

        const open = el.closest<HTMLElement>('[data-open]');
        if (open?.dataset.open) { window.open(open.dataset.open, '_blank', 'noopener'); return; }
        if (el.closest('[data-icon-clear]')) { void this.setIcon(''); return; }
        if (el.closest('[data-icon]')) { void this.chooseIcon(); return; }

        const act = el.closest<HTMLButtonElement>('.act[data-action]');
        if (act && !act.disabled) { this.act(act.dataset.action as ContainerAction); return; }

        if (el.closest('#lg-follow')) {
            this.follow = !this.follow;
            writeFlag(FOLLOW_KEY, this.follow);
            this.paintLogBar();
            this.syncPolling();
            if (this.follow) void this.pollLogs(true);
            return;
        }
        if (el.closest('#lg-ts')) {
            this.stamps = !this.stamps;
            writeFlag(STAMPS_KEY, this.stamps);
            this.paintLogBar();
            return;
        }
        if (el.closest('#lg-more')) { void this.loadLogs(MORE_TAIL); return; }
        if (el.closest('#lg-copy')) { void this.copyLogs(); }
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
        const when = c.at[index] ? i18n.formatDateTime(new Date(c.at[index]), { timeStyle: 'medium' }) : '';
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

    // ── Selection ──

    /** Chooses a container. `open` shows it in the drawer; the Logs tab chooses without opening one. */
    private choose(hostId: string, name: string, open: boolean) {
        const same = !!this.sel && this.sel.hostId === hostId && this.sel.name === name;
        if (!same) {
            this.sel = { hostId, name };
            this.resetSelected();
        }
        const wasOpen = this.drawerOpen;
        if (open) this.showDrawer();
        // Opening a container is a step; choosing another while one is open is not.
        if (open) { if (wasOpen) this.navReplace(); else this.navPush(); }
        this.paintAll();
        if (!same) {
            void this.loadDetail();
            if (this.viewerPlace()) void this.loadLogs(FIRST_TAIL);
        }
        this.syncPolling();
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
        return { tab: this.tab, sel: this.drawerOpen && this.sel ? `${this.sel.hostId}/${this.sel.name}` : null };
    }

    // Over the board there is one entry, the panel's: choosing replaces it instead of adding a step.
    private navPush() { if (this.applying) return; if (this.panelOnly) this.nav.replace(this.navState()); else this.nav.push(this.navState()); }

    private navReplace() { if (!this.applying) this.nav.replace(this.navState()); }

    /** Puts the page where an entry of the history says: its tab, and the container open in the panel, if any. */
    private applyNav(s: NavState) {
        this.applying = true;
        try {
            if (s.tab !== this.tab) this.setTab(s.tab as Tab);
            if (s.sel) {
                const at = s.sel.indexOf('/');
                this.choose(s.sel.slice(0, at), s.sel.slice(at + 1), true);
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
        this.paintAll();
        this.syncPolling();
    }

    /** What belongs to the container that was chosen before is dropped, so none of it is shown under the new name. */
    private resetSelected() {
        this.detail = null;
        this.detailErr = '';
        this.lines = [];
        this.logsErr = '';
        this.logsLoaded = false;
        this.truncated = false;
        this.loadedTail = FIRST_TAIL;
        this.detailSeq++;
        this.logSeq++;
        this.last.dbody = this.last.dhead = this.last.dfoot = '';
        const box = this.v('lg-box');
        if (box) box.innerHTML = '';
    }

    private setTab(tab: Tab) {
        if (tab === this.tab) return;
        this.tab = tab;
        this.navPush();
        this.paintAll();
        if (tab === 'logs' && this.sel && !this.logsLoaded) void this.loadLogs(FIRST_TAIL);
        this.syncPolling();
    }

    private setDrawerTab(tab: DrawerTab) {
        if (tab === this.drawerTab) return;
        this.drawerTab = tab;
        this.paintDrawer();
        if (tab === 'logs' && this.sel && !this.logsLoaded) void this.loadLogs(FIRST_TAIL);
        this.syncPolling();
    }

    // ── Data ──

    private async load(fresh = false) {
        if (this.loading) return;
        this.loading = true;
        this.paintHead();
        try {
            // The links come from every board, not the one behind this page, so a container is flagged the same wherever the visitor was.
            loadDockerLinks().then(() => { if (this.hasAttribute('open')) this.paintAll(); }).catch(() => { });
            const settings = await fetchDockerSettings(fresh);
            this.icons = settings.icons ?? {};
            const hosts = hostsForWidget(settings.hosts);
            this.noHosts = hosts.length === 0;
            this.fatal = '';
            const previous = new Map(this.groups.map(g => [g.host.id, g]));
            this.groups = await Promise.all(hosts.map(async (host): Promise<HostRows> => {
                try {
                    return { host, containers: await fetchContainers(host), loaded: true };
                } catch (err) {
                    // A host that fails shows why in its own place; the others still draw.
                    return { host, containers: [], error: hostErrorKey(err), loaded: previous.get(host.id)?.loaded ?? true };
                }
            }));
            if (this.hostFilter !== 'all' && !this.groups.some(g => g.host.id === this.hostFilter)) this.hostFilter = 'all';
        } catch {
            this.groups = [];
            this.fatal = 'docker.connection_error';
        }
        this.loading = false;
        this.loaded = true;
        if (!this.hasAttribute('open')) return;

        // A container that is gone is gone; one whose host did not answer is only out of sight.
        if (this.sel && !this.current()) {
            const g = this.groups.find(x => x.host.id === this.sel!.hostId);
            if (!g || (!g.error && g.loaded)) {
                this.sel = null;
                this.resetSelected();
                this.hideDrawer();
                this.navReplace();
                this.syncPolling();
            }
        }
        this.paintAll();
        void this.loadSizes();
        void this.loadDisks(fresh);
        await this.loadStats();
        if (this.current()) void this.loadDetail();
    }

    /** What the storage card says: the sum, or why there is none. */
    private diskState(scope: HostRows[]): { totals: ReturnType<typeof diskTotals>; state: 'ready' | 'measuring' | 'unavailable' } {
        const live = scope.filter(g => !g.error);
        const known = live.map(g => this.disks.get(g.host.id)?.usage).filter((u): u is DiskUsage => !!u);
        const totals = diskTotals(known);
        if (totals.hosts > 0) return { totals, state: 'ready' };
        return { totals, state: known.length < live.length ? 'measuring' : 'unavailable' };
    }

    /** Asks each host how big it is, once. Failing is not an error: the page then reads its figures without that scale. */
    private sizesAsking = false;

    private async loadSizes() {
        if (this.sizesAsking) return;
        this.sizesAsking = true;
        try { await this.readSizes(); } finally { this.sizesAsking = false; }
        if (this.hasAttribute('open') && this.tab === 'overview') this.paintBody();
    }

    private async readSizes() {
        await Promise.all(this.groups.filter(g => !g.error && !this.sizes.has(g.host.id)).map(async g => {
            try {
                const size = await fetchHostSize(g.host);
                if (size.cores > 0 && size.mem_total > 0) this.sizes.set(g.host.id, size);
            } catch { /* an agent that cannot say, or a host that does not answer, has no scale */ }
        }));
    }

    /** Asks each host what it holds on disk, when it has not been asked lately. An agent that cannot say is remembered as such until the next round. */
    private async loadDisks(force = false) {
        if (this.diskAsking) return;
        const now = Date.now();
        const due = this.groups.filter(g => !g.error && (force || now - (this.disks.get(g.host.id)?.at ?? 0) > DISK_MS));
        if (!due.length) return;
        this.diskAsking = true;
        try {
            await Promise.all(due.map(async g => {
                try {
                    this.disks.set(g.host.id, { at: Date.now(), usage: await fetchDiskUsage(g.host) });
                } catch {
                    // A host that does not answer, or takes too long to measure, shows nothing this round; the list's own error says if it is down.
                    this.disks.set(g.host.id, { at: Date.now(), usage: blankDisk() });
                }
            }));
        } finally {
            this.diskAsking = false;
        }
        if (this.hasAttribute('open') && this.tab === 'overview') this.paintBody();
    }

    /** What the hosts in view have together, or null unless every one of them has said. */
    private capacity(scope: HostRows[]): { cores: number; physical: number; mem: number } | null {
        const live = scope.filter(g => !g.error);
        if (!live.length) return null;
        let cores = 0, physical = 0, mem = 0, allSaid = true;
        for (const g of live) {
            const s = this.sizes.get(g.host.id);
            if (!s) return null;
            cores += s.cores;
            mem += s.mem_total;
            // The real cores are said only when every host in view said them: a sum with a hole in it is not a count.
            if (s.physical_cores) physical += s.physical_cores; else allSaid = false;
        }
        return { cores, physical: allSaid ? physical : 0, mem };
    }

    /** Whether a round of readings is on its way: the refresh does not start another on top of it. */
    private statsAsking = false;

    private async loadStats() {
        if (this.statsAsking) return;
        this.statsAsking = true;
        try {
            await this.readStats();
        } finally {
            this.statsAsking = false;
        }
        if (!this.hasAttribute('open')) return;
        const tt = dockerTotals(this.groups, this.statsObject(), this.linkOf);
        if (tt.total > 0) sessionHistory = pushHistory(sessionHistory, { t: Date.now(), cores: tt.cores, memUsed: tt.memUsed, running: tt.running });
        this.paintAll();
    }

    private async readStats() {
        await Promise.all(this.groups.map(async g => {
            const ids = g.containers.filter(c => stateLevel(c.State || c.Status) === 'up').map(c => c.ID);
            // What is no longer running has no reading; keeping the old one would show it as alive.
            for (const c of g.containers) if (!ids.includes(c.ID)) this.stats.delete(c.ID);
            if (!ids.length || g.error) return;
            try {
                const all = await fetchStats(g.host, ids);
                for (const id of ids) {
                    if (all[id]) this.stats.set(id, all[id]); else this.stats.delete(id);
                }
            } catch { /* no number is better than a wrong one */ }
        }));
    }

    private async loadDetail() {
        const cur = this.current();
        if (!cur) return;
        const seq = ++this.detailSeq;
        try {
            const d = await fetchDetail(cur.host, cur.container.ID);
            if (seq !== this.detailSeq) return;
            this.detail = d;
            this.detailErr = '';
            // An agent that was updated since the log was refused can answer now; do not make the person re-select.
            if (this.logsErr === 'docker.agent_too_old' || this.logsErr === 'docker.not_found') {
                this.logsErr = '';
                this.logsLoaded = false;
                if (this.viewerPlace()) void this.loadLogs(FIRST_TAIL);
            }
        } catch (err) {
            if (seq !== this.detailSeq) return;
            this.detail = null;
            this.detailErr = pageErrorKey(err);
        }
        this.paintDrawer();
        // A daemon that no longer has it: the list is the one that knows.
        if (this.detailErr === 'docker.not_found') void this.load();
    }

    /** Reads the log afresh: the last `tail` lines, replacing what is shown. */
    private async loadLogs(tail: number) {
        const cur = this.current();
        if (!cur) return;
        const seq = ++this.logSeq;
        try {
            const b = await fetchLogs(cur.host, cur.container.ID, { tail });
            if (seq !== this.logSeq) return;
            this.lines = b.lines.slice(-MAX_LOG_LINES);
            this.truncated = b.truncated;
            this.logsErr = '';
            this.loadedTail = tail;
        } catch (err) {
            if (seq !== this.logSeq) return;
            this.lines = [];
            this.logsErr = pageErrorKey(err);
        }
        this.logsLoaded = true;
        this.paintLogs(true);
    }

    /** What the follow timer asks: only the lines after the last one shown. */
    private async pollLogs(immediate = false) {
        if (this.polling || !this.hasAttribute('open') || !this.viewerPlace()) return;
        if (!immediate && !this.follow) return;
        // An agent that does not know the call will not learn it by being asked every three seconds.
        if (this.logsErr === 'docker.agent_too_old' || this.logsErr === 'docker.not_found') return;
        const cur = this.current();
        if (!cur) return;
        if (!this.logsLoaded) { void this.loadLogs(this.loadedTail); return; }
        this.polling = true;
        const seq = this.logSeq;
        const after = this.lines.length ? this.lines[this.lines.length - 1].t : undefined;
        try {
            const b = await fetchLogs(cur.host, cur.container.ID, { after });
            if (seq !== this.logSeq) return;
            const wasError = this.logsErr;
            this.logsErr = '';
            if (b.truncated && !this.truncated) { this.truncated = true; this.paintLogMeta(); }
            if (b.lines.length) this.appendLogs(b.lines);
            else if (wasError) this.paintLogs(false);
        } catch (err) {
            if (seq !== this.logSeq) return;
            this.logsErr = pageErrorKey(err);
            this.paintLogMeta();
        } finally {
            this.polling = false;
        }
    }

    private async copyLogs() {
        const text = logsToText(this.lines, this.stamps ? this.stamp : null);
        let ok = false;
        try {
            await navigator.clipboard.writeText(text);
            ok = true;
        } catch {
            // Over plain http the clipboard API is not offered; a hidden field and the old command still work.
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;inset-block-start:0;inset-inline-start:0;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            try { ok = document.execCommand('copy'); } catch { ok = false; }
            ta.remove();
        }
        if (ok) eventBus.emit(EVENTS.NOTIFY, { message: this.t('dockerpage.copied'), type: 'success' });
    }

    // ── Actions ──

    private act(action: ContainerAction) {
        const cur = this.current();
        if (!cur || !this.mayControl()) return;
        const { host, container } = cur;
        const name = containerName(container);
        const run = async () => {
            this.busy.add(container.ID);
            this.paintDrawer();
            try {
                await runAction(host, container.ID, action);
                eventBus.emit(EVENTS.NOTIFY, { message: this.t('docker.action_success'), type: 'success' });
                // The daemon takes a moment to report the new state.
                await new Promise(r => setTimeout(r, 600));
            } catch (err) {
                const key = pageErrorKey(err);
                eventBus.emit(EVENTS.NOTIFY, {
                    message: this.t(key === 'docker.connection_error' ? 'docker.action_error' : key),
                    type: 'error',
                });
            }
            this.busy.delete(container.ID);
            await this.load();
            this.paintDrawer();
        };
        if (action === 'start') { void run(); return; }
        eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
            title: this.t(action === 'stop' ? 'docker.action_stop' : 'docker.action_restart'),
            message: this.t(action === 'stop' ? 'dockerpage.confirm_stop' : 'dockerpage.confirm_restart', { name }),
            onConfirm: () => { void run(); },
        });
    }

    // ── Polling of the log ──

    /** The log timer runs exactly while there is a log in front of somebody who asked it to follow. */
    private syncPolling() {
        const want = this.hasAttribute('open') && this.follow && !!this.viewerPlace();
        if (want && !this.logTimer) this.logTimer = setInterval(whenVisible(() => this.pollLogs()), LOG_MS);
        if (!want && this.logTimer) { clearInterval(this.logTimer); this.logTimer = null; }
    }

    // ── Painting ──

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
        this.$('pg')?.classList.toggle('has-drawer', this.drawerOpen);
        this.$('scrim')?.classList.toggle('on', this.drawerOpen);
        this.$('drawer')?.classList.toggle('on', this.drawerOpen);
    }

    private paintHead() {
        const head = this.$('phead');
        if (!head) return;
        const t = this.t;
        const ready = this.loaded && !this.fatal && !this.noHosts;
        const summary = ready ? summaryHtml(dockerTotals(this.scope(), this.statsObject(), this.linkOf), t, this.fmt) : '';
        // Up to two hosts are buttons beside "All", as in the design; more than that would not fit a header, so it is a selector.
        const few = this.groups.length > 1 && this.groups.length <= MAX_HOST_BUTTONS;
        const pressed = (id: string) => `aria-pressed="${this.hostFilter === id}"`;
        const hosts = few
            ? `<span class="seg seg--text" role="group" aria-label="${escapeHtml(t('docker.hosts'))}">
                <button type="button" data-hostf="all" ${pressed('all')}>${escapeHtml(t('infra.filter_all'))}</button>
                ${this.groups.map(g => `<button type="button" data-hostf="${escapeHtml(g.host.id)}" ${pressed(g.host.id)}>${escapeHtml(g.host.name)}</button>`).join('')}
            </span>`
            : this.groups.length > 1 ? '<app-select id="hp-host"></app-select>' : '';
        const html = `<div class="ptitle">${icon('box', 20)}<span>${escapeHtml(t('widget.docker.name'))}</span></div>
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
                ...this.groups.map(g => ({ value: g.host.id, label: g.host.name })),
            ], this.hostFilter, t('docker.hosts'));
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
        const html = tabsHtml([
            { id: 'overview', label: t('dockerpage.tab_overview') },
            { id: 'containers', label: t('docker.containers'), count: this.loaded && !this.fatal && !this.noHosts ? dockerTotals(this.scope(), {}, this.linkOf).total : undefined },
            { id: 'logs', label: t('dockerpage.tab_logs') },
        ], this.tab, n => this.fmt.num(n));
        if (html === this.last.tabs) return;
        this.last.tabs = html;
        el.innerHTML = html;
    }

    /** The body: what the chosen tab shows. Each tab owns regions of its own, written only when they change. */
    private paintBody() {
        if (this.panelOnly) return;
        const body = this.$('body');
        if (!body || this.selectOpen()) return;
        const t = this.t;

        if (!this.loaded) { this.setBody(body, 'overview', `<div class="empty">${escapeHtml(t('general.loading'))}</div>`); return; }
        if (this.fatal) { this.setBody(body, 'overview', hostErrorHtml(this.fatal, '', t)); return; }
        if (this.noHosts) {
            this.setBody(body, 'overview', `<div class="empty"><b>${escapeHtml(t('docker.no_hosts_configured'))}</b>${escapeHtml(t('docker.configure_hint'))}</div>`);
            return;
        }

        if (this.tab === 'overview') {
            this.setBody(body, 'overview', '<div id="ov"></div>');
            this.paintOverview();
        } else if (this.tab === 'containers') {
            if (this.bodyTab !== 'containers') {
                this.viewer?.remove();
                body.innerHTML = '<div id="inv-tools"></div><div id="inv-errors"></div><div id="inv-list"></div>';
                this.bodyTab = 'containers';
                this.last.tools = this.last.list = this.last.body = '';
            }
            this.paintTools();
            this.paintInventory();
        } else {
            if (this.bodyTab !== 'logs') {
                this.viewer?.remove();
                body.innerHTML = '<div id="lg-pick-wrap"></div><div id="lg-slot-page" class="logv-slot"></div>';
                this.bodyTab = 'logs';
                this.last.pick = this.last.body = '';
            }
            this.paintPick();
            this.placeViewer();
            this.paintLogMeta();
        }
    }

    private setBody(body: HTMLElement, tab: Tab, html: string) {
        if (this.bodyTab === tab && this.last.body === html) return;
        // Whatever the log viewer was in goes with it; it is kept and put back where it belongs.
        this.viewer?.remove();
        body.innerHTML = html;
        this.bodyTab = tab;
        this.last.body = html;
        this.last.list = '';
    }

    private paintOverview() {
        const ov = this.$('ov');
        if (!ov) return;
        const scope = this.scope();
        const stats = this.statsObject();
        const hist = sessionHistory;
        const cores = hist.map(h => h.cores);
        let chart = '';
        this.charts.clear();
        if (hist.length >= 2) {
            const cap = this.capacity(scope);
            let spec: ChartSpec;
            if (cap) {
                // Both lines are a share of the host, on one 0–100 scale.
                const cpuShare = cores.map(v => Math.min(100, (v / cap.cores) * 100));
                const memShare = hist.map(h => Math.min(100, (h.memUsed / cap.mem) * 100));
                spec = {
                    series: [
                        { name: this.t('widget.telemetry.cpu'), color: 'var(--ok)', data: cpuShare },
                        { name: this.t('widget.telemetry.ram'), color: 'var(--warn)', data: memShare },
                    ],
                    max: 100, height: 190, edges: [this.clock(hist[0].t), this.clock(hist[hist.length - 1].t)], fmt: v => this.fmt.pct(v),
                };
            } else {
                // Without the size of the host, cores and a share of the memory limit have no common unit: both are drawn on one height,
                // the axis reads in cores, and the cursor says what each line is really worth.
                const top = niceMax(Math.max(...cores));
                const limit = dockerTotals(scope, stats).memLimit;
                const series: ChartSpec['series'] = [{ name: this.t('dockerpage.cores_in_use'), color: 'var(--ok)', data: cores, labels: cores.map(v => this.fmt.dec(v)) }];
                if (limit > 0) {
                    const share = hist.map(h => Math.min(100, (h.memUsed / limit) * 100));
                    series.push({ name: this.t('dockerpage.mem_of_limit'), color: 'var(--warn)', data: share.map(v => (v / 100) * top), labels: share.map(v => this.fmt.pct(v)) });
                }
                spec = { series, max: top, height: 190, edges: [this.clock(hist[0].t), this.clock(hist[hist.length - 1].t)], fmt: v => this.fmt.dec(v) };
            }
            chart = chartHtml('session', spec);
            this.charts.set('session', { spec, at: hist.map(h => h.t) });
        }
        const hostUse: Record<string, { cpu: number | null; mem: number | null }> = {};
        for (const g of this.groups) {
            const size = this.sizes.get(g.host.id);
            const cores = g.containers.reduce((a, c) => a + (this.stats.get(c.ID)?.CPUPercent ?? 0) / 100, 0);
            const mem = g.containers.reduce((a, c) => a + (this.stats.get(c.ID)?.MemUsed ?? 0), 0);
            hostUse[g.host.id] = size ? { cpu: Math.min(100, (cores / size.cores) * 100), mem: Math.min(100, (mem / size.mem_total) * 100) } : { cpu: null, mem: null };
        }
        const names: Record<string, string> = {};
        for (const g of this.groups) names[g.host.id] = g.host.name;
        const html = overviewHtml({
            totals: dockerTotals(scope, stats, this.linkOf),
            attention: attentionList(scope, this.linkOf, stats),
            projects: projectRows(scope),
            hosts: scope,
            cores,
            mem: hist.map(h => h.memUsed),
            chart,
            hostNames: names,
            faceOf: (h, n) => this.faceOf(h, n),
            disk: this.diskState(scope),
            linkOf: this.linkOf,
            hostUse,
            capacity: this.capacity(scope),
        }, this.t, this.fmt);
        if (html === this.last.list) return;
        this.last.list = html;
        const body = this.$('body');
        const top = body?.scrollTop ?? 0;
        ov.innerHTML = html;
        if (body) body.scrollTop = top;
    }

    private clock(ms: number): string {
        return i18n.formatDateTime(new Date(ms), { timeStyle: 'short' });
    }

    private paintTools() {
        const el = this.$('inv-tools');
        if (!el) return;
        const counts = countUnits(dockerUnits(this.scope(), this.statsObject(), this.linkOf));
        const html = toolbarHtml({
            query: this.query, status: this.status, counts: { all: 0, up: 0, off: 0, warn: 0 }, sort: this.sort,
            grouped: this.grouped, view: this.viewMode, searchLabel: this.t('docker.search_containers'), groupLabel: this.t('dockerpage.group_project'),
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
        const several = this.groups.length > 1;

        errs.innerHTML = scope.filter(g => g.error).map(g => hostErrorHtml(g.error!, g.host.name, t)).join('');

        const all = dockerUnits(scope, this.statsObject(), this.linkOf);
        const views = new Map<string, UnitView>();
        for (const g of scope) {
            for (const c of g.containers) {
                const name = containerName(c);
                views.set(`${g.host.id}/${name}`, {
                    hostId: g.host.id, hostName: g.host.name, showHost: several, container: c, stats: this.stats.get(c.ID),
                    link: this.linkOf(g.host.id, name), face: this.faceOf(g.host.id, name),
                    selected: !!this.sel && this.sel.hostId === g.host.id && this.sel.name === name,
                });
            }
        }
        const shown = sortUnits(all.filter(u => passes(u, this.query, this.status)), this.sort);
        const html = shown.length
            ? inventoryHtml(groupUnits(shown, this.grouped), this.viewMode, id => views.get(id), t, this.fmt, this.grouped)
            : noMatchHtml(t, all.length > 0);
        if (html === this.last.list) return;
        this.last.list = html;
        // The card the keyboard is on must still be on it after the list is written again.
        const active = this.shadowRoot?.activeElement as HTMLElement | null;
        const focus = active && el.contains(active) ? { host: active.dataset.host, name: active.dataset.name } : null;
        const body = this.$('body');
        const top = body?.scrollTop ?? 0;
        el.innerHTML = html;
        if (body) body.scrollTop = top;
        if (focus?.host) {
            for (const n of el.querySelectorAll<HTMLElement>('[data-host]')) {
                if (n.dataset.host === focus.host && n.dataset.name === focus.name) { n.focus({ preventScroll: true }); break; }
            }
        }
    }

    /** The Logs tab's picker: every container in view, and the one chosen. */
    private paintPick() {
        const el = this.$('lg-pick-wrap');
        if (!el) return;
        const several = this.groups.length > 1;
        const options = this.scope().flatMap(g => g.containers.map(c => {
            const name = containerName(c);
            return { value: `${g.host.id}/${name}`, label: several ? `${g.host.name} · ${name}` : name };
        }));
        const html = `<div class="tools"><app-select id="lg-pick"></app-select></div>
            ${this.sel ? '' : `<div class="empty">${escapeHtml(this.t('dockerpage.select_hint'))}</div>`}`;
        if (html !== this.last.pick) {
            this.last.pick = html;
            el.innerHTML = html;
        }
        const pick = el.querySelector<SelectEl>('#lg-pick');
        if (!pick) return;
        const value = this.sel ? `${this.sel.hostId}/${this.sel.name}` : '';
        // Nothing chosen yet: the first entry is a prompt rather than a container.
        this.setSelect(pick, this.sel ? options : [{ value: '', label: this.t('dockerpage.pick_container') }, ...options], value, this.t('docker.containers'));
    }

    // ── The drawer ──

    /**
     * Opens the icon picker for the container in the panel.
     *
     * The icon is downloaded once, here, exactly as a bookmark's is: the board
     * never asks a CDN what it is drawing, and this must not become the one
     * place that does.
     */
    private async chooseIcon() {
        if (!this.current()) return;
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
        const cur = this.current();
        if (!cur) return;
        const name = containerName(cur.container);
        try {
            await saveDockerIcon(cur.host.id, name, iconName);
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
            return;
        }
        this.icons = withDockerIcon(this.icons, cur.host.id, name, iconName);
        this.last.dhead = this.last.dfoot = this.last.dbody = '';
        this.last.list = '';
        this.paintAll();
    }

    private paintDrawer() {
        const head = this.$('dr-head');
        const tabs = this.$('dr-tabs');
        const body = this.$('dr-body');
        const foot = this.$('dr-foot');
        if (!head || !tabs || !body || !foot) return;
        const cur = this.current();
        if (!this.drawerOpen || !cur) return;
        const t = this.t;
        const c = cur.container;

        const name = containerName(c);
        const link = this.linkOf(cur.host.id, name);
        const hHtml = drawerHeadHtml({ host: cur.host, container: c, showHost: this.groups.length > 1, link, face: this.faceOf(cur.host.id, name) }, t);
        if (hHtml !== this.last.dhead) { this.last.dhead = hHtml; head.innerHTML = hHtml; }

        const tHtml = tabsHtml([
            { id: 'summary', label: t('dockerpage.tab_summary') },
            { id: 'logs', label: t('dockerpage.tab_logs') },
            { id: 'env', label: t('dockerpage.env_short') },
            { id: 'mounts', label: t('dockerpage.mounts_networks') },
        ], this.drawerTab, n => this.fmt.num(n));
        if (tHtml !== this.last.dtabs) { this.last.dtabs = tHtml; tabs.innerHTML = tHtml; }

        const fHtml = footerHtml({
            container: c, canControl: this.mayControl(), busy: this.busy.has(c.ID),
            // The bookmark's address, or the one the container advertises (a `lastboard.url` or `homepage.href` label) or publishes a port on.
            bookmarkUrl: dockerLinkFor(cur.host.id, name)?.url || defaultContainerUrl(cur.container, cur.host, window.location.hostname),
            bookmarked: !!dockerLinkFor(cur.host.id, name)?.url, hasChosenIcon: !!chosenDockerIcon(this.icons, cur.host.id, name),
        }, t);
        if (fHtml !== this.last.dfoot) { this.last.dfoot = fHtml; foot.innerHTML = fHtml; }
        foot.hidden = !fHtml;

        let bHtml: string;
        if (this.drawerTab === 'logs') bHtml = '<div class="logv-slot" id="lg-slot-drawer"></div>';
        else if (!this.detail) {
            bHtml = this.detailErr
                ? hostErrorHtml(this.detailErr, cur.host.name, t)
                : `<div class="empty">${escapeHtml(t('general.loading'))}</div>`;
        } else if (this.drawerTab === 'summary') bHtml = summaryTabHtml(this.detail, c, this.stats.get(c.ID), link, t, this.fmt);
        else if (this.drawerTab === 'env') bHtml = envTabHtml(this.detail, t);
        else bHtml = mountsTabHtml(this.detail, t);

        if (bHtml !== this.last.dbody) {
            const top = body.scrollTop;
            this.viewer?.remove();
            this.last.dbody = bHtml;
            body.innerHTML = bHtml;
            body.scrollTop = top;
        }
        this.placeViewer();
        this.paintLogMeta();
    }

    /** Puts the one log viewer where it is wanted, and nowhere else. */
    private placeViewer() {
        if (!this.viewer) return;
        const place = this.viewerPlace();
        const slot = place === 'drawer' ? this.$('lg-slot-drawer') : place === 'page' ? this.$('lg-slot-page') : null;
        if (!slot) { this.viewer.remove(); return; }
        if (this.viewer.parentElement !== slot) {
            slot.appendChild(this.viewer);
            this.paintLogs(true);
        }
    }

    // ── The log ──

    private v<E extends HTMLElement>(id: string): E | null {
        return this.viewer?.querySelector<E>(`#${id}`) ?? null;
    }

    private paintLogBar() {
        this.v('lg-follow')?.setAttribute('aria-pressed', String(this.follow));
        this.v('lg-ts')?.setAttribute('aria-pressed', String(this.stamps));
        this.v('lg-box')?.classList.toggle('logbox--no-ts', !this.stamps);
        const more = this.v<HTMLButtonElement>('lg-more');
        if (more) more.disabled = this.loadedTail >= MORE_TAIL;
        const copy = this.v<HTMLButtonElement>('lg-copy');
        if (copy) copy.disabled = !this.lines.length;
    }

    /** The note, the empty state and the error — everything about the log that is not a line of it. */
    private paintLogMeta() {
        const note = this.v('lg-note');
        if (note) note.hidden = !this.truncated;
        const state = this.v('lg-state');
        const box = this.v('lg-box');
        const cur = this.current();
        if (!state || !box) return;
        let html = '';
        if (this.logsErr && cur) html = hostErrorHtml(this.logsErr, cur.host.name, this.t);
        else if (!this.logsLoaded) html = `<div class="empty">${escapeHtml(this.t('general.loading'))}</div>`;
        else if (!this.lines.length) html = `<div class="empty">${escapeHtml(this.t('dockerpage.logs_empty'))}</div>`;
        if (state.innerHTML !== html) state.innerHTML = html;
        state.hidden = !html;
        box.hidden = !!html;
        this.paintLogBar();
    }

    /** Draws the whole log: on a fresh read, on a change of language, on moving the viewer. */
    private paintLogs(toBottom: boolean) {
        const box = this.v('lg-box');
        if (!box) return;
        box.innerHTML = this.lines.map(l => logLineHtml(l, this.stamp(l.t))).join('');
        this.paintLogMeta();
        if (toBottom) box.scrollTop = box.scrollHeight;
    }

    /** Adds what a poll brought, drops what falls off the front, and follows only a reader who is at the end. */
    private appendLogs(incoming: LogLine[]) {
        const box = this.v('lg-box');
        const before = this.lines.length;
        const last = before ? this.lines[before - 1].t : '';
        const fresh = last ? incoming.filter(l => l.t > last) : incoming;
        if (!fresh.length) return;
        const drop = overflow(before, fresh.length);
        this.lines = mergeLogLines(this.lines, fresh);
        if (!box) return;
        // Decided before writing: afterwards the box is taller and every reader looks as if they had scrolled up.
        const stick = atBottom(box.scrollTop, box.clientHeight, box.scrollHeight);
        box.insertAdjacentHTML('beforeend', fresh.map(l => logLineHtml(l, this.stamp(l.t))).join(''));
        for (let i = 0; i < drop && box.firstElementChild; i++) box.firstElementChild.remove();
        if (before === 0) this.paintLogMeta(); else this.paintLogBar();
        if (stick) box.scrollTop = box.scrollHeight;
    }
}

if (!customElements.get('docker-page')) {
    customElements.define('docker-page', DockerPage);
}

export { DockerPage };
