
import { csrfToken } from '../../services/csrf';
import { i18n } from '../../services/i18n';
import { adoptSharedStyles } from '../../services/sharedStyles';
import { dashboardStore } from '../../store/dashboardStore';
import { userStore } from '../../store/userStore';
import { escapeHtml as esc } from '../../services/escape';
import {
    type ContainerCfgEntry,
    type DockerContainer,
    type DockerHost,
    type DockerPort,
    containerName,
    defaultContainerUrl,
    fetchContainers,
    hostParam,
    isDemoMode,
    shortId,
} from '../../services/dockerShared';
import '../../components/ui/Select/Select';

// ── Types ───────────────────────────────────────────────────────────────────

interface DockerWidgetConfig {
    widgetId: 'docker';
    hosts: DockerHost[];
    activeHost: string;
    containerConfig?: Record<string, ContainerCfgEntry>;
    /** Header text. Empty falls back to the widget's own name. */
    title?: string;
    /** How often the container list is re-listed, in seconds. */
    refreshSec?: number;
}

interface DockerStats {
    CPUPercent: number;
    MemPercent: number;
    MemUsed: number;
    MemLimit: number;
}

/** Matches the monitor widget's default, and its options in the config modal. */
const DEFAULT_REFRESH_SEC = 60;

// ── Helpers ─────────────────────────────────────────────────────────────────

function demoStats(): DockerStats {
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

function isAdmin(): boolean {
    const user = userStore.getUser();
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'admin';
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

const ICON = {
    docker: `<svg viewBox="0 0 640 512" fill="currentColor"><path d="M349.9 236.3h-66.1v-59.4h66.1v59.4zm0-204.3h-66.1v60.7h66.1V32zm78.2 144.8H362v59.4h66.1v-59.4zm-156.3-72.1h-66.1v60.1h66.1v-60.1zm78.1 0h-66.1v60.1h66.1v-60.1zm276.8 100c-14.4-9.7-47.6-13.2-73.1-8.4-3.3-24-16.7-44.9-41.1-63.7l-14-9.3-9.3 14c-18.4 27.8-23.4 73.6-3.7 103.8-8.7 4.7-25.8 11.1-48.4 10.7H2.4c-8.7 50.8 5.8 116.8 44 162.1 37.1 43.9 92.7 66.2 165.4 66.2 157.4 0 273.9-72.5 328.4-204.2 21.4.4 67.6.1 91.3-45.2 1.5-2.5 6.6-13.2 8.5-17.1l-13.3-8.9zm-511.1-27.9h-66v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm-78.1-72.1h-66.1v60.1h66.1v-60.1z"/></svg>`,
    play:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16l13 -8z" /></svg>`,
    stop:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" /></svg>`,
    restart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>`,
    alert:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    inbox:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    spinner: `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
};

// ── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
:host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    color: var(--text-main);
    font-family: var(--font-sans);
    box-sizing: border-box;
    overflow: hidden;
}

/* ── Header ── */
/* .widget-header / __top / __icon / __title come from the shared sheet — see
   styles/shared.css. They used to be declared here, and the monitor widget grew
   its own smaller variant, which is how two widgets side by side ended up with
   different headers. */
.host-select {
    width: 150px;
    flex-shrink: 0;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Second header line. Only drawn when the host can't be reached — in normal
   operation the header is one line, the same as every other widget. */
.header-summary {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--danger-color);
    padding-left: 1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Scrollable wrapper ── */
.widget-body {
    flex: 1; overflow-y: auto; min-height: 0;
    scrollbar-width: none;
}
.widget-body::-webkit-scrollbar { display: none; }

/* ── State views ── */
.state-view {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px; padding: 24px 16px;
    opacity: 0.55; text-align: center;
}
.state-icon { width: 28px; height: 28px; }
.state-icon svg { width: 100%; height: 100%; }
.state-text { font-size: 12px; color: var(--text-dim); }
.state-hint { font-size: 11px; color: var(--text-dim); opacity: 0.7; }
.retry-btn {
    margin-top: 4px; padding: 5px 14px;
    background: rgba(128,128,128,0.1);
    border: 1px solid rgba(128,128,128,0.2);
    border-radius: var(--radius);
    color: var(--text-main); font-size: 11px;
    font-family: var(--font-sans); cursor: pointer;
    transition: all 0.15s; opacity: 1;
}
.retry-btn:hover { background: rgba(var(--accent-rgb,37,99,235),0.12); border-color: var(--accent); color: var(--accent); }

/* ── Skeleton rows ── */
.skeleton-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(128,128,128,0.08);
}
.skeleton-circle {
    width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
    background: linear-gradient(90deg, rgba(128,128,128,0.1) 25%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.skeleton-line {
    height: 9px; border-radius: 4px;
    background: linear-gradient(90deg, rgba(128,128,128,0.1) 25%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Container rows — CSS Grid layout ── */
.container-row {
    display: grid;
    grid-template-columns: 36px minmax(0, 1.5fr) 140px minmax(0, 2fr) 110px 90px;
    align-items: center;
    padding: 7px 10px;
    border-bottom: 1px solid rgba(128,128,128,0.08);
    transition: background 0.15s, opacity 0.2s;
    min-width: 0;
    overflow: hidden;
}
.container-row:last-child { border-bottom: none; }
.container-row:hover { background: var(--surface-hover, rgba(128,128,128,0.06)); }

/* ICON cell — display only. Choosing the icon lives in the config modal, like
   every other per-container setting. */
.cell-icon {
    display: flex; align-items: center; justify-content: flex-start;
    padding-right: 6px;
}
.icon-img {
    width: 28px; height: 28px;
    border-radius: 6px; object-fit: contain;
    background: rgba(128,128,128,0.05);
}
.icon-placeholder {
    width: 28px; height: 28px;
    border-radius: 6px;
    background: rgba(var(--accent-rgb, 37,99,235), 0.15);
    border: 1px solid rgba(var(--accent-rgb, 37,99,235), 0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600; color: var(--accent);
    text-transform: uppercase;
    user-select: none;
}

/* NAME cell */
.cell-name { min-width: 0; padding-right: 8px; position: relative; overflow: hidden; }
.container-name {
    font-size: 13px; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    display: block;
    color: inherit;
    text-decoration: none;
}
/* Only rows that lead somewhere look clickable. */
.container-name.is-link:hover {
    color: var(--accent);
    text-decoration: underline;
}

/* STATE cell */
.cell-state {
    display: flex; flex-direction: column; gap: 2px;
    padding-right: 8px; min-width: 0;
}
.state-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; padding: 2px 7px;
    border-radius: 100px;
    width: fit-content; max-width: 100%;
    white-space: nowrap;
}
.state-dot {
    width: 6px; height: 6px;
    border-radius: 50%; flex-shrink: 0;
}
.state-badge.running  { color: var(--success-color); background: rgba(var(--success-rgb,22,163,74),0.12); }
.state-badge.stopped  { color: var(--text-dim); background: rgba(128,128,128,0.1); }
.state-badge.paused   { color: var(--warning-color); background: rgba(var(--warning-rgb,202,138,4),0.12); }
.state-badge.restarting { color: var(--accent); background: rgba(var(--accent-rgb,37,99,235),0.12); }
.state-dot.running  { background: var(--success-color); animation: pulse 2.5s ease-in-out infinite; }
.state-dot.stopped  { background: var(--text-dim); opacity: 0.5; }
.state-dot.paused   { background: var(--warning-color); }
.state-dot.restarting { background: var(--accent); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.stats-text {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-dim); opacity: 0.7;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* IMAGE cell */
.cell-image { min-width: 0; padding-right: 8px; overflow: hidden; }
.container-image {
    font-size: 11px; color: var(--text-dim);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    opacity: 0.75; display: block;
}

/* PORTS cell */
.cell-ports {
    display: flex; flex-wrap: nowrap; gap: 3px;
    align-items: center; min-width: 0;
    overflow: hidden; padding-right: 8px;
}
.port-badge {
    background: var(--surface-hover, rgba(128,128,128,0.08));
    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--text-dim);
    white-space: nowrap;
    flex-shrink: 0;
}
.port-badge.more {
    color: var(--accent);
    border-color: rgba(var(--accent-rgb,37,99,235),0.3);
    background: rgba(var(--accent-rgb,37,99,235),0.08);
}

/* ACTIONS cell */
.cell-actions {
    display: flex; gap: 4px;
    align-items: center; justify-content: flex-end;
    overflow: visible;
    position: relative;
}
.action-btn {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(128,128,128,0.08);
    border: 1px solid rgba(128,128,128,0.14);
    border-radius: 5px; cursor: pointer;
    color: var(--text-dim); transition: all 0.15s;
    position: relative; flex-shrink: 0;
}
.action-btn svg { width: 13px; height: 13px; }
.action-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(var(--accent-rgb,37,99,235),0.1); }
.action-btn:active { transform: scale(0.92); }
.action-btn[data-action="stop"]:hover:not(:disabled)  { background: rgba(var(--danger-rgb,220,38,38),0.1); border-color: var(--danger-color); color: var(--danger-color); }
.action-btn[data-action="start"]:hover:not(:disabled) { background: rgba(var(--success-rgb,22,163,74),0.1); border-color: var(--success-color); color: var(--success-color); }
.action-btn:disabled { cursor: not-allowed; transform: none; background: rgba(128,128,128,0.04); border-color: rgba(128,128,128,0.07); color: rgba(128,128,128,0.5); }
.action-btn:disabled svg { opacity: 0.5; }

/* Tooltip — anchored left so it never overflows widget top edge */
.action-btn::after {
    content: attr(data-title);
    position: absolute; right: calc(100% + 8px); top: 50%;
    transform: translateY(-50%);
    background: rgba(0,0,0,0.8); color: #fff;
    font-family: var(--font-sans); font-size: 10px;
    padding: 4px 8px; border-radius: 4px;
    white-space: nowrap; pointer-events: none;
    opacity: 0; transition: opacity 0.15s; z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.action-btn:hover::after { opacity: 1; }

.spin { animation: spin 0.7s linear infinite; }
`;

// ── Widget class ─────────────────────────────────────────────────────────────

class DockerWidget extends HTMLElement {
    private _itemId: number = 0;
    private _config: DockerWidgetConfig = { widgetId: 'docker', hosts: [], activeHost: '' };

    private _containers: DockerContainer[] = [];
    private _stats: Map<string, DockerStats> = new Map();
    private _loading = false;
    private _error = false;
    private _pollingTimer: ReturnType<typeof setInterval> | null = null;
    /** Re-lists containers, so one started elsewhere shows up on its own. */
    private _listTimer: ReturnType<typeof setInterval> | null = null;

    private _unsubscribeDashboard: (() => void) | null = null;
    private _unsubscribeI18n: (() => void) | null = null;

    private _pendingAction: Set<string> = new Set();

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
                    const upcomingHosts = d.hosts || [];
                    let upcomingActiveHost = d.activeHost || '';

                    if (!upcomingActiveHost && upcomingHosts.length > 0) {
                        upcomingActiveHost = upcomingHosts[0].id;
                    }

                    const hostsChanged = JSON.stringify(upcomingHosts) !== JSON.stringify(this._config.hosts);
                    const hostChanged = upcomingActiveHost !== this._config.activeHost;

                    if (hostsChanged || hostChanged || this._config.widgetId !== 'docker') {
                        this._config = { ...this._config, ...d, hosts: upcomingHosts, activeHost: upcomingActiveHost };
                        this.loadContainers();
                    }
                }
            } catch (_) { }
        }
    }

    connectedCallback() {
        this.render();
        this.loadContainers();
        this.restartListTimer();

        this._unsubscribeDashboard = dashboardStore.subscribe((state) => {
            if (this._itemId) {
                const item = (Array.isArray(state.items) ? state.items : [])
                    .find((i) => i.id === this._itemId);
                if (item?.content) {
                    try {
                        const c = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                        if (c?.widgetId === 'docker') {
                            const incomingHosts = c.hosts || [];
                            let incomingActiveHost = c.activeHost || '';

                            if (!incomingActiveHost && incomingHosts.length > 0) {
                                incomingActiveHost = incomingHosts[0].id;
                            }

                            const hostsChanged = JSON.stringify(incomingHosts) !== JSON.stringify(this._config.hosts);
                            const hostChanged = incomingActiveHost !== this._config.activeHost;

                            if (hostsChanged || hostChanged) {
                                this._config = { ...this._config, ...c, hosts: incomingHosts, activeHost: incomingActiveHost };
                                this.loadContainers();
                                this.restartListTimer();
                            } else {
                                // Saved from the config modal: visibility, icons,
                                // names, title and interval all land here.
                                const titleChanged = (c.title || '') !== (this._config.title || '');
                                const cfgChanged = JSON.stringify(c.containerConfig || {})
                                    !== JSON.stringify(this._config.containerConfig || {});
                                const intervalChanged = Number(c.refreshSec) !== Number(this._config.refreshSec);

                                this._config.containerConfig = c.containerConfig || this._config.containerConfig;
                                this._config.title = c.title;
                                this._config.refreshSec = c.refreshSec;

                                if (titleChanged || cfgChanged) this.render();
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
    }

    disconnectedCallback() {
        this.stopPolling();
        this.stopListTimer();
        this._unsubscribeDashboard?.();
        this._unsubscribeI18n?.();
    }

    // ── Active host ──────────────────────────────────────────────────────────

    private getActiveHost(): DockerHost | undefined {
        return this._config.hosts.find(h => h.id === this._config.activeHost)
            ?? this._config.hosts[0];
    }

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
        this._listTimer = setInterval(() => this.loadContainers(true), sec * 1000);
    }

    // ── Data fetching ────────────────────────────────────────────────────────

    /**
     * Re-lists the active host's containers.
     *
     * `silent` is what the refresh timer passes: the rows on screen are still
     * valid, so they stay put instead of collapsing into skeletons and back
     * every interval. Only a host change or the first load clears the view.
     */
    private async loadContainers(silent = false) {
        const host = this.getActiveHost();

        if (!host && !isDemoMode()) {
            this.stopPolling();
            this._loading = false;
            this._error = false;
            this._containers = [];
            this.render();
            return;
        }

        this.stopPolling();
        if (!silent) {
            this._loading = true;
            this._error = false;
            this._containers = [];
            this._stats.clear();
            this.render();
        }

        try {
            this._containers = await fetchContainers(host);
            this._loading = false;
            this._error = false;
            this.render();
            this.startStatsPolling();
        } catch (_) {
            this._loading = false;
            this._error = true;
            this._containers = [];
            this.render();
        }
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

    private async fetchAllStats() {
        if (isDemoMode()) {
            this._containers
                .filter(c => c.Status === 'running')
                .forEach(c => this.updateStatsDOM(c.ID, demoStats()));
            return;
        }

        const host = this.getActiveHost();
        if (!host) return;
        const param = hostParam(host);
        const running = this._containers.filter(c => c.Status === 'running');

        const chunkSize = 5;
        for (let i = 0; i < running.length; i += chunkSize) {
            if (this._pollingTimer === null) break;

            const chunk = running.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async c => {
                try {
                    const res = await fetch(
                        `/api/docker/stats?host=${encodeURIComponent(param)}&id=${encodeURIComponent(c.ID)}`
                    );
                    if (res.ok) {
                        const stats: DockerStats = await res.json();
                        this._stats.set(c.ID, stats);
                        this.updateStatsDOM(c.ID, stats);
                    }
                } catch (_) { }
            }));

            await new Promise(r => setTimeout(r, 150));
        }
    }

    private updateStatsDOM(containerID: string, stats: DockerStats) {
        const el = this.shadowRoot?.querySelector(`[data-stats-id="${containerID}"]`);
        if (!el) return;
        el.textContent = `${stats.CPUPercent.toFixed(1)}% CPU · ${stats.MemPercent.toFixed(1)}% RAM`;
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    private async performAction(containerID: string, action: string) {
        const host = this.getActiveHost();
        if (!host) return;

        this._pendingAction.add(containerID);
        this.updateActionButtonsDOM(containerID, action);

        try {
            const res = await fetch('/api/docker/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken(),
                },
                body: JSON.stringify({ host: hostParam(host), id: containerID, action }),
            });
            if (res.ok) {
                setTimeout(() => this.loadContainers(), 600);
            }
        } catch (_) { }

        this._pendingAction.delete(containerID);
    }

    private updateActionButtonsDOM(containerID: string, activeAction: string) {
        const row = this.shadowRoot?.querySelector(`[data-container-id="${containerID}"]`);
        if (!row) return;
        const btns = row.querySelectorAll<HTMLButtonElement>('.action-btn');
        btns.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.action === activeAction) {
                btn.innerHTML = ICON.spinner;
            }
        });
    }

    // ── Host selector change ─────────────────────────────────────────────────

    private async onHostChange(id: string) {
        this._config.activeHost = id;
        if (this._itemId) {
            const state = dashboardStore.getState();
            const item = (Array.isArray(state.items) ? state.items : [])
                .find((i) => i.id === this._itemId);
            if (item?.content) {
                try {
                    const parsed = typeof item.content === 'string'
                        ? JSON.parse(item.content) : item.content;
                    const newContent = { ...parsed, activeHost: id };
                    await dashboardStore.updateItem({ id: this._itemId, content: JSON.stringify(newContent) });
                } catch (_) { }
            }
        }
        this.loadContainers();
    }

    // ── Ports rendering ───────────────────────────────────────────────────────

    private renderPorts(ports: DockerPort[]): string {
        if (!ports || ports.length === 0) return '';

        // De-duplicate by PublicPort
        const seen = new Set<number>();
        const unique: DockerPort[] = [];
        for (const p of ports) {
            if (!seen.has(p.PublicPort)) {
                seen.add(p.PublicPort);
                unique.push(p);
            }
        }

        const show = unique.slice(0, 2);
        const rest = unique.length - show.length;

        const badges = show.map(p => {
            const label = p.PrivatePort && p.PrivatePort !== p.PublicPort
                ? `${p.PublicPort}:${p.PrivatePort}`
                : `${p.PublicPort}`;
            return `<span class="port-badge">${esc(label)}</span>`;
        }).join('');

        const moreBadge = rest > 0
            ? `<span class="port-badge more">+${rest}</span>`
            : '';

        return badges + moreBadge;
    }

    // ── Render ───────────────────────────────────────────────────────────────

    render() {
        if (!this.shadowRoot) return;

        const hasHosts     = this._config.hosts.length > 0;
        const admin        = isAdmin();
        const containerCfg = this._config.containerConfig || {};

        const visibleContainers = this._containers
            .filter(c => !containerCfg[shortId(c.ID)]?.hidden);

        // Only failures earn a second header line; the rest of the time this is
        // a one-line header like every other widget.
        const errorLine = this._error
            ? `<div class="header-summary">${esc(i18n.t('docker.connection_error') || 'Connection failed')}</div>`
            : '';

        // Switching host is navigation, not configuration, so it stays here.
        const hostSelector = this._config.hosts.length > 1 ? `
            <div style="width: 150px; flex-shrink: 0;">
                <app-select class="host-select" id="host-select" value="${esc(this._config.activeHost)}"></app-select>
            </div>` : '';

        let bodyHTML = '';

        if (!hasHosts) {
            bodyHTML = `
                <div class="state-view">
                    <div class="state-icon">${ICON.settings}</div>
                    <span class="state-text">${i18n.t('docker.no_hosts_configured')}</span>
                    <span class="state-hint">${i18n.t('docker.configure_hint')}</span>
                </div>`;

        } else if (this._loading) {
            bodyHTML = [1, 2, 3].map(() => `
                <div class="skeleton-row">
                    <div class="skeleton-circle"></div>
                    <div class="skeleton-lines">
                        <div class="skeleton-line" style="width:55%"></div>
                        <div class="skeleton-line" style="width:35%"></div>
                    </div>
                </div>`).join('');

        } else if (this._error) {
            bodyHTML = `
                <div class="state-view">
                    <div class="state-icon">${ICON.alert}</div>
                    <span class="state-text">${i18n.t('docker.connection_error')}</span>
                    <button class="retry-btn" id="retry-btn">${i18n.t('general.retry') || 'Retry'}</button>
                </div>`;

        } else if (visibleContainers.length === 0) {
            // Either the host has none, or every one of them is hidden from the
            // config screen. Both read the same from here.
            bodyHTML = `
                <div class="state-view">
                    <div class="state-icon">${ICON.inbox}</div>
                    <span class="state-text">${i18n.t('docker.no_containers')}</span>
                </div>`;

        } else {
            bodyHTML = visibleContainers.map(c =>
                this.renderContainer(c, admin, containerCfg)
            ).join('');
        }

        const title = this._config.title || i18n.t('widget.docker.name');

        this.shadowRoot.innerHTML = `
            <style>${CSS}</style>
            <div class="widget-header">
                <div class="widget-header__top">
                    <span class="widget-header__icon">${ICON.docker}</span>
                    <span class="widget-header__title">${esc(title)}</span>
                    ${hostSelector}
                </div>
                ${errorLine}
            </div>
            <div class="widget-body" id="body">${bodyHTML}</div>
        `;

        this.bindEvents();
    }

    private renderContainer(
        c: DockerContainer,
        admin: boolean,
        containerCfg: Record<string, ContainerCfgEntry>
    ): string {
        const sid = shortId(c.ID);
        const cfg = containerCfg[sid] || {};

        // Icon
        const iconHTML = cfg.icon
            ? `<img class="icon-img" src="${esc(cfg.icon)}" alt="" loading="lazy" />`
            : `<div class="icon-placeholder">${esc((containerName(c)[0] || '?').toUpperCase())}</div>`;

        // Name. It becomes a link when we know where the container answers —
        // either because it says so, because a port is published, or because
        // someone typed an address in the config. Without that it stays text:
        // a link that goes nowhere is worse than no link.
        const displayName = cfg.label || containerName(c);
        const target = cfg.url || defaultContainerUrl(c, this.getActiveHost(), window.location.hostname);
        const nameHTML = target
            ? `<a class="container-name is-link" href="${esc(target)}" target="_blank" rel="noopener noreferrer"
                  title="${esc(target)}">${esc(displayName)}</a>`
            : `<span class="container-name" title="${esc(displayName)}">${esc(displayName)}</span>`;

        // State
        const statusKey  = c.Status === 'running' ? 'running'
            : c.Status === 'paused' ? 'paused'
            : c.Status === 'restarting' ? 'restarting'
            : 'stopped';
        const stateLabel = i18n.t(`docker.state_${c.Status}`) || c.Status.toUpperCase();

        const cachedStats = this._stats.get(c.ID);
        const statsText   = (c.Status === 'running' && cachedStats)
            ? `${cachedStats.CPUPercent.toFixed(1)}% CPU · ${cachedStats.MemPercent.toFixed(1)}% RAM`
            : '';

        // Image
        const imgShort = c.Image.replace(/^[a-z0-9.-]+\.[a-z]{2,}\//i, '');

        // Ports
        const portsHTML = this.renderPorts(c.Ports || []);

        // Actions
        let actionsHTML = '';
        if (admin) {
            const isPending = this._pendingAction.has(c.ID);
            const dis = isPending ? 'disabled' : '';
            const isAgent = containerName(c) === 'lastboard-agent';
            const stopDis = (isPending || isAgent) ? 'disabled' : '';
            if (c.Status === 'running') {
                actionsHTML = `
                    <button class="action-btn" data-action="stop" data-id="${esc(c.ID)}" data-title="${isAgent ? i18n.t('docker.action_stop_disabled') || 'Cannot stop agent' : i18n.t('docker.action_stop') || 'Stop'}" ${stopDis}>${isPending ? ICON.spinner : ICON.stop}</button>
                    <button class="action-btn" data-action="restart" data-id="${esc(c.ID)}" data-title="${i18n.t('docker.action_restart') || 'Restart'}" ${dis}>${ICON.restart}</button>`;
            } else {
                actionsHTML = `
                    <button class="action-btn" data-action="start" data-id="${esc(c.ID)}" data-title="${i18n.t('docker.action_start') || 'Start'}" ${dis}>${isPending ? ICON.spinner : ICON.play}</button>
                    <button class="action-btn" data-action="restart" data-id="${esc(c.ID)}" data-title="${i18n.t('docker.action_restart') || 'Restart'}" ${dis}>${ICON.restart}</button>`;
            }
        }

        return `
        <div class="container-row" data-container-id="${esc(c.ID)}">
            <div class="cell-icon" data-sid="${esc(sid)}">
                ${iconHTML}
            </div>
            <div class="cell-name">${nameHTML}</div>
            <div class="cell-state">
                <div class="state-badge ${statusKey}">
                    <div class="state-dot ${statusKey}"></div>
                    ${esc(stateLabel)}
                </div>
                <span class="stats-text" data-stats-id="${esc(c.ID)}">${esc(statsText)}</span>
            </div>
            <div class="cell-image">
                <span class="container-image" title="${esc(c.Image)}">${esc(imgShort)}</span>
            </div>
            <div class="cell-ports">${portsHTML}</div>
            <div class="cell-actions">${actionsHTML}</div>
        </div>`;
    }

    // ── Event binding ────────────────────────────────────────────────────────

    private bindEvents() {
        if (!this.shadowRoot) return;
        const root = this.shadowRoot;

        // Retry
        root.getElementById('retry-btn')?.addEventListener('click', () => this.loadContainers());

        // Host selector
        const sel = root.getElementById('host-select') as any;
        if (sel) {
            sel.options = this._config.hosts.map(h => ({ value: h.id, label: h.name }));
            sel.addEventListener('change', (e: CustomEvent) => this.onHostChange(e.detail));
        }

        // Start / stop / restart. Everything else a row can do is configuration,
        // and configuration lives in the config modal.
        root.getElementById('body')?.addEventListener('click', (e: Event) => {
            const btn = (e.target as Element).closest('.action-btn') as HTMLElement | null;
            if (btn && !btn.hasAttribute('disabled')) {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                if (action && id) this.performAction(id, action);
            }
        });
    }
}

customElements.define('widget-docker', DockerWidget);
