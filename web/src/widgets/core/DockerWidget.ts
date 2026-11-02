import { i18n } from '../../services/i18n';
import { adoptSharedStyles } from '../../services/sharedStyles';
import { dashboardStore } from '../../store/dashboardStore';
import {
    type ContainerCfgEntry,
    type DockerContainer,
    type DockerHost,
    fetchContainers,
    hostRef,
    dockerPost,
    hostErrorKey,
    isDemoMode,
} from '../../services/dockerShared';
import { fetchDockerSettings, hostsForWidget } from '../../services/dockerHosts';
import { fetchHostSize, type ContainerStats } from '../../services/dockerPage';
import { chosenDockerIcon } from '../../services/dockerIcons';
import { dockerLinkFor, loadDockerLinks } from '../../services/dockerLinks';
import { dockerEntries, dockerShell, type WHost, type WSize } from '../../services/dockerWidget';
import { resolveIconUrl } from '../../services/iconUrl';
import { eventBus, EVENTS } from '../../services/EventBus';
import { whenVisible } from '../../services/whenVisible';
import { holdReading } from '../../services/infraReadings';
import { readMetrics, showsSeeAll, type MetricFlags } from '../shell/metrics';
import { SHELL_CSS, shellHtml } from '../shell/shell';

// ── Types ───────────────────────────────────────────────────────────────────

interface DockerWidgetConfig {
    widgetId: 'docker';
    /** Which of the account's hosts this widget shows; none stored means all of them. */
    hostIds?: string[];
    containerConfig?: Record<string, ContainerCfgEntry>;
    /** Each host's containers in the order they were arranged in. See dockerContainers.ts. */
    containerOrder?: Record<string, string[]>;
    /** Whether a container nobody has chosen yet is shown. On unless it is `false`. */
    showNew?: boolean;
    /** The tile's name, drawn as a pill on its border by the grid. Not used here. */
    title?: string;
    /** How often the container list is re-listed, in seconds. */
    refreshSec?: number;
    /** Which of CPU and memory are shown. Stored by absence: only a reading turned off is written. */
    metrics?: Record<string, boolean>;
    /** Whether the foot leads to the page. On unless it is `false`. */
    showAll?: boolean;
    /** Whether the line of totals under the name is drawn. On unless it is `false`. */
    showNode?: boolean;
}

/** Matches the monitor widget's default, and its options in the config modal. */
const DEFAULT_REFRESH_SEC = 60;

// ── Helpers ─────────────────────────────────────────────────────────────────

function demoStats(): ContainerStats {
    const cpu = Math.random() * 18 + 0.4;      // 0.4% – 18%
    const memPct = Math.random() * 40 + 8;     // 8% – 48%
    const memLimit = 2 * 1024 * 1024 * 1024;   // 2 GiB
    return {
        CPUPercent: cpu,
        MemPercent: memPct,
        MemUsed: (memPct / 100) * memLimit,
        MemLimit: memLimit,
    };
}

// ── Widget ───────────────────────────────────────────────────────────────────

/**
 * Per-host state. `failed` means the last attempt didn't work, which is a
 * different thing from `everLoaded`: a host that went quiet after answering
 * still has containers worth showing (greyed), while one that never answered
 * has nothing to show but the fact that it's unreachable.
 */
type HostState = WHost;

/**
 * The containers of the hosts you chose, beside the things they serve. Reading only: a click on a
 * row opens the Docker page with that container in its panel, where it can be started, stopped or
 * restarted.
 */
class DockerWidget extends HTMLElement {
    private _itemId: number = 0;
    private _config: DockerWidgetConfig = { widgetId: 'docker' };
    /** The account's hosts this widget draws: its chosen ones, switched on and usable. */
    private _hosts: DockerHost[] = [];
    private _onHostsChanged = () => { this.loadContainers(); };

    private _byHost: HostState[] = [];
    private _stats: Map<string, ContainerStats> = new Map();
    private _sizes: Map<string, WSize> = new Map();
    private _icons: Record<string, string> = {};
    private _loading = false;
    private _pollingTimer: ReturnType<typeof setTimeout> | null = null;
    /** Last list markup written, so an unchanged refresh writes nothing. */
    private _lastBodyHTML: string | null = null;

    /** Re-lists containers, so one started elsewhere shows up on its own. */
    private _listTimer: ReturnType<typeof setInterval> | null = null;

    private _unsubscribeDashboard: (() => void) | null = null;
    private _unsubscribeI18n: (() => void) | null = null;

    static get observedAttributes() { return ['item-id', 'content']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
    }

    attributeChangedCallback(name: string, _old: string, val: string) {
        if (name === 'item-id') {
            this._itemId = parseInt(val) || 0;
        }
        if (name === 'content') {
            try {
                const d = typeof val === 'string' ? JSON.parse(val) : val;
                if (d?.widgetId === 'docker') {
                    const upcomingIds: string[] = Array.isArray(d.hostIds) ? d.hostIds : [];
                    const idsChanged = JSON.stringify(upcomingIds) !== JSON.stringify(this._config.hostIds ?? []);

                    if (idsChanged || this._config.widgetId !== 'docker') {
                        this._config = { ...this._config, ...d, hostIds: upcomingIds };
                        this.loadContainers();
                    } else {
                        this._config = { ...this._config, ...d, hostIds: upcomingIds };
                    }
                }
            } catch (_) { }
        }
    }

    connectedCallback() {
        this.render();
        this.loadContainers();
        this.restartListTimer();

        // Delegated on the shadow root, which outlives every repaint.
        this.shadowRoot!.addEventListener('click', this.onClick);

        this._unsubscribeDashboard = dashboardStore.subscribe((state) => {
            if (this._itemId) {
                const item = (Array.isArray(state.items) ? state.items : [])
                    .find((i) => i.id === this._itemId);
                if (item?.content) {
                    try {
                        const c = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                        if (c?.widgetId === 'docker') {
                            const incomingIds: string[] = Array.isArray(c.hostIds) ? c.hostIds : [];
                            const hostsChanged = JSON.stringify(incomingIds) !== JSON.stringify(this._config.hostIds ?? []);

                            if (hostsChanged) {
                                this._config = { ...this._config, ...c, hostIds: incomingIds };
                                this.loadContainers();
                                this.restartListTimer();
                            } else {
                                // Saved from the config modal: visibility, names, readings,
                                // order and interval all land here.
                                const intervalChanged = Number(c.refreshSec) !== Number(this._config.refreshSec);
                                const before = JSON.stringify(this.drawnConfig());
                                this._config = { ...this._config, ...c, hostIds: incomingIds };
                                if (JSON.stringify(this.drawnConfig()) !== before) {
                                    this.refreshBody();
                                    // A reading just turned on needs its numbers.
                                    this.startStatsPolling();
                                }
                                if (intervalChanged) this.restartListTimer();
                            }
                        }
                    } catch (_) { }
                }
            }
        });

        this._unsubscribeI18n = i18n.subscribe(() => {
            this.render();
        });

        // Hosts are added, renamed and switched off in Preferences; the widget
        // follows without a reload.
        eventBus.on(EVENTS.DOCKER_CHANGED, this._onHostsChanged);
    }

    disconnectedCallback() {
        this.shadowRoot?.removeEventListener('click', this.onClick);
        this.stopPolling();
        this.stopListTimer();
        this._unsubscribeDashboard?.();
        this._unsubscribeI18n?.();
        eventBus.off(EVENTS.DOCKER_CHANGED, this._onHostsChanged);
    }

    /** What decides how the list is drawn: the settings a repaint has to follow. */
    private drawnConfig() {
        const c = this._config;
        return { cfg: c.containerConfig, order: c.containerOrder, showNew: c.showNew !== false, metrics: this.metrics(), showAll: showsSeeAll(c.showAll), showNode: c.showNode !== false };
    }

    private metrics(): MetricFlags {
        return readMetrics(this._config.metrics, ['cpu', 'mem']);
    }

    // ── Clicks ───────────────────────────────────────────────────────────────

    private onClick = (e: Event) => {
        const target = e.target as HTMLElement;
        // Both open the page here, at the containers: a full load would throw away the board the person is on.
        if (target.closest('[data-act="all"]')) {
            eventBus.emit(EVENTS.SHOW_DOCKER_PAGE, { tab: 'containers' });
            return;
        }
        const row = target.closest('[data-sel]') as HTMLElement | null;
        if (row) eventBus.emit(EVENTS.SHOW_DOCKER_PAGE, { tab: 'containers', sel: row.dataset.sel || undefined });
    };

    // ── List refresh ─────────────────────────────────────────────────────────
    // Separate from the stats poll: that one updates numbers on rows that are
    // already drawn, this one asks which containers exist at all.

    private stopListTimer() {
        if (this._listTimer !== null) {
            clearInterval(this._listTimer);
            this._listTimer = null;
        }
    }

    private restartListTimer() {
        this.stopListTimer();
        const sec = Number(this._config.refreshSec) > 0
            ? Number(this._config.refreshSec)
            : DEFAULT_REFRESH_SEC;
        this._listTimer = setInterval(whenVisible(() => this.loadContainers(true)), sec * 1000);
    }

    // ── Data fetching ────────────────────────────────────────────────────────

    /**
     * Re-lists every configured host, in parallel.
     *
     * `silent` is what the refresh timer passes: the rows on screen are still
     * valid, so they stay put instead of collapsing and back every interval.
     * Only the first load clears the view.
     *
     * A host that fails keeps whatever it last returned; the render greys those
     * rows rather than dropping them, so one machine going quiet doesn't
     * reshuffle the whole widget.
     */
    private async loadContainers(silent = false) {
        // Which hosts, first: the account's list is the truth, and what this
        // widget chose is only a filter over it. Failing to read it leaves the
        // widget with no hosts, which it says in its own words.
        try {
            const settings = await fetchDockerSettings();
            this._icons = settings.icons ?? {};
            this._hosts = hostsForWidget(settings.hosts, this._config.hostIds);
        } catch {
            this._hosts = [];
        }
        const hosts = this._hosts;
        // The bookmarks a container serves arrive on their own and repaint when they do.
        loadDockerLinks().then(() => { if (this.isConnected) this.refreshBody(); }).catch(() => { });

        if (!hosts.length && !isDemoMode()) {
            this.stopPolling();
            this._loading = false;
            this._byHost = [];
            this.refreshBody();
            return;
        }

        this.stopPolling();
        if (!silent) {
            this._loading = true;
            this._byHost = [];
            this._stats.clear();
            this.refreshBody();
        }

        const previous = new Map(this._byHost.map(s => [s.host.id, s]));

        this._byHost = await Promise.all(hosts.map(async (host): Promise<HostState> => {
            const before = previous.get(host.id);
            try {
                return {
                    host,
                    containers: await fetchContainers(host),
                    failed: false,
                    everLoaded: true,
                };
            } catch (err) {
                return {
                    host,
                    containers: before?.containers ?? [],
                    failed: true,
                    everLoaded: before?.everLoaded ?? false,
                    errorKey: hostErrorKey(err),
                };
            }
        }));

        this._loading = false;
        // What the page opens on when a row of this tile is clicked.
        holdReading('docker', this._byHost.map(s => ({
            host: s.host, containers: s.containers, loaded: s.everLoaded, ...(s.failed ? { error: s.errorKey || 'docker.connection_error' } : {}),
        })));
        this.refreshBody();
        this.startStatsPolling();
        void this.loadSizes();
    }

    /** How big each host is, asked once: what the CPU of its containers is read against. A host that cannot say has no scale. */
    private async loadSizes() {
        await Promise.all(this._byHost.filter(s => !s.failed && !this._sizes.has(s.host.id)).map(async s => {
            try {
                const size = await fetchHostSize(s.host);
                if (size.cores > 0 && size.mem_total > 0) this._sizes.set(s.host.id, size);
            } catch { /* no scale */ }
        }));
        this.refreshBody();
    }

    private stopPolling() {
        if (this._pollingTimer !== null) {
            clearTimeout(this._pollingTimer);
            this._pollingTimer = null;
        }
    }

    private startStatsPolling() {
        this.stopPolling();
        const poll = async () => {
            if (this._pollingTimer === null) return;
            await this.fetchAllStats();
            if (this._pollingTimer !== null) {
                this._pollingTimer = setTimeout(poll, 4000);
            }
        };
        this._pollingTimer = setTimeout(poll, 0);
    }

    /** The containers on screen, with their host: what the numbers are asked for. */
    private drawnContainers(): Array<{ container: DockerContainer; state: HostState }> {
        return dockerEntries(this.input()).map(e => ({ container: e.c, state: e.host }));
    }

    /**
     * Reads CPU and memory for the rows on screen.
     *
     * One request per host, not per container: the server reads them together and answers with a map.
     * What it asks for matters as much as how: it follows what is drawn, so a container hidden from the
     * widget is not paid for in the background. Nothing is asked when both readings are off.
     */
    private async fetchAllStats() {
        const m = this.metrics();
        if (!m.cpu && !m.mem) return;
        // A host that isn't answering has nothing to report, and asking is how
        // you turn one unreachable machine into a slow widget.
        const rows = this.drawnContainers()
            .filter(r => r.container.Status === 'running' && !r.state.failed);

        if (isDemoMode()) {
            rows.forEach(r => this._stats.set(r.container.ID, demoStats()));
            this.refreshBody();
            return;
        }

        // Group by host: the batch endpoint reads one daemon per call.
        const byHost = new Map<string, { host: DockerHost; ids: string[] }>();
        for (const { container, state } of rows) {
            const key = state.host.id;
            const entry = byHost.get(key) ?? { host: state.host, ids: [] };
            entry.ids.push(container.ID);
            byHost.set(key, entry);
        }

        // Hosts in parallel: one slow machine shouldn't hold up the others.
        await Promise.all([...byHost.values()].map(async ({ host, ids }) => {
            if (this._pollingTimer === null) return;
            try {
                const res = await fetch('/api/docker/stats', dockerPost({ ...hostRef(host), ids }));
                if (!res.ok) return;
                const all: Record<string, ContainerStats> = await res.json();
                // A container the daemon wouldn't report on is missing from the answer. It gets no number, not a zero.
                for (const id of ids) if (all[id]) this._stats.set(id, all[id]);
            } catch (_) { /* the next round tells */ }
        }));
        this.refreshBody();
    }

    // ── Markup ───────────────────────────────────────────────────────────────

    private input() {
        const t = (key: string) => i18n.t(key);
        const hasHosts = this._hosts.length > 0 || isDemoMode();
        const everythingDown = this._byHost.length > 0 && this._byHost.every(s => s.failed);
        const nothingYet = everythingDown && this._byHost.every(s => !s.everLoaded);
        let state: string | undefined;
        if (!hasHosts) state = `${t('docker.no_hosts_configured')} ${t('docker.configure_hint')}`;
        else if (this._loading) state = t('general.loading');
        else if (nothingYet) state = t(this._byHost.every(s => s.errorKey === 'docker.unauthorized') ? 'docker.unauthorized' : 'docker.connection_error');

        // What each host's running containers use, as a share of the host; unknown where the host did not say how big it is.
        const use: Record<string, { cpu: number | null; mem: number | null }> = {};
        for (const s of this._byHost) {
            const size = this._sizes.get(s.host.id);
            const cores = s.containers.reduce((a, c) => a + (this._stats.get(c.ID)?.CPUPercent ?? 0) / 100, 0);
            const mem = s.containers.reduce((a, c) => a + (this._stats.get(c.ID)?.MemUsed ?? 0), 0);
            use[s.host.id] = size ? { cpu: Math.min(100, (cores / size.cores) * 100), mem: Math.min(100, (mem / size.mem_total) * 100) } : { cpu: null, mem: null };
        }
        return {
            hosts: this._byHost,
            stats: Object.fromEntries(this._stats),
            sizes: Object.fromEntries(this._sizes),
            use,
            settings: this._config,
            metrics: this.metrics(),
            showAll: showsSeeAll(this._config.showAll),
            showSummary: this._config.showNode !== false,
            // What its owner chose on the page, then what its bookmark wears.
            faceOf: (hostId: string, name: string) => {
                const face = chosenDockerIcon(this._icons, hostId, name) || dockerLinkFor(hostId, name)?.icon || '';
                return face ? resolveIconUrl(face) : '';
            },
            linkOf: (hostId: string, name: string) => { const l = dockerLinkFor(hostId, name); return l ? (l.label || l.url || name) : ''; },
            t,
            num: (n: number) => i18n.formatNumber(n, { maximumFractionDigits: 1 }),
            state,
        };
    }

    render() {
        if (!this.shadowRoot) return;

        // No heading of its own: the tile's name, when it has one, is the pill on
        // its border, so the whole body is the list.
        this.shadowRoot.innerHTML = `<style>${SHELL_CSS}</style><div class="sh-body" id="body"></div>`;
        this._lastBodyHTML = null;
        this.refreshBody();
    }

    /**
     * Repaints the list without rebuilding the widget: a timer that reassigns the shadow root reparses
     * the stylesheet and sends a scrolled list back to the top. Only the body is touched, and only when
     * it differs — in the ordinary case, nothing is written at all.
     */
    private refreshBody(): void {
        const body = this.shadowRoot?.getElementById('body');
        if (!body) return;

        const html = shellHtml(dockerShell(this.input()));
        if (html === this._lastBodyHTML) return;
        this._lastBodyHTML = html;

        const scrollTop = body.querySelector('.sh-rows')?.scrollTop ?? 0;
        body.innerHTML = html;
        const rows = body.querySelector('.sh-rows');
        if (rows && scrollTop) rows.scrollTop = scrollTop;
    }
}

if (!customElements.get('widget-docker')) {
    customElements.define('widget-docker', DockerWidget);
}
