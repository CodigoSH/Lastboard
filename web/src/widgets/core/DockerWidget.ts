
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
    dockerPost,
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
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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
.retry-btn:hover { background: rgba(var(--accent-rgb,232,82,14),0.12); border-color: var(--accent); color: var(--accent); }

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
/* Same shape as the monitor widget's rows: a dot for state, then the name.
   The two sit side by side on a dashboard, so they are read together.

   The ports column is --ports-w, measured after each render: the widest ports
   cell in the list, floored at one badge and capped so it can never take the
   name's room. As a fixed 110px it charged every row for the worst case, and
   most lists never pay it — plenty of containers publish nothing at all.

   Every row must agree on the width or the columns stop lining up, which is why
   this is one measured value rather than per-row content sizing. Subgrid would
   express it directly and was tried; the rows carry horizontal padding, and a
   subgrid's tracks are positioned by the parent, so the padding pushed every
   cell 10px left of its track and the name landed on top of the state dot.

   The name is also the widest flexible column now. It used to be 1.5fr against
   the image's 2fr, so the part people read was narrower than the part they
   don't — the image is abbreviated to library/n... either way. */
.container-row {
    display: grid;
    grid-template-columns: 8px minmax(0, 2fr) 130px minmax(0, 1.4fr) var(--ports-w, 56px) 90px;
    align-items: center;
    gap: 0 8px;
    padding: 7px 10px;
    border-bottom: 1px solid rgba(128,128,128,0.08);
    transition: background 0.15s, opacity 0.2s;
    min-width: 0;
    overflow: hidden;
}
.container-row:last-child { border-bottom: none; }
.container-row:hover { background: var(--surface-hover, rgba(128,128,128,0.06)); }

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
/* STATE — the same 8px dot the monitor widget uses, so a glance down a board
   with both widgets reads one way and not two. Docker has four states where
   monitoring has two, and the colour carries all of them; what the badge used
   to add was the word, not the state. Its title attribute still spells it out
   for the two that aren't obvious. */
.state-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--border);
}
.state-dot.running  { background: var(--success-color); }
.state-dot.stopped  { background: var(--text-dim); opacity: 0.5; }
.state-dot.paused   { background: var(--warning-color); }
.state-dot.restarting { background: var(--accent); }

.cell-state {
    min-width: 0;
    padding-right: 8px;
}
.stats-text {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-dim); opacity: 0.7;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
/* A running container has no reading for its first seconds: the list arrives
   from one endpoint and the numbers from another, one request per container.
   The cell used to sit empty in the meantime, so the row landed with a hole in
   it and grew a value out of nothing. It now carries the same shimmer bar the
   bookmarks show while they load — the row arrives whole and fills in. */
.stats-text.is-loading {
    display: block;
    width: 85%; height: 9px;
    border-radius: 4px;
    opacity: 1;
    background: linear-gradient(90deg, rgba(128,128,128,0.1) 25%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
}

/* IMAGE cell — two lines, mirroring the state cell opposite it: what it runs
   on top, where it runs underneath. The row is already this tall because of
   that cell, so the second line costs no height. */
.cell-image {
    display: flex; flex-direction: column; gap: 2px;
    min-width: 0; padding-right: 8px; overflow: hidden;
}
.container-image {
    font-size: 11px; color: var(--text-dim);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    opacity: 0.75; display: block;
}
.container-host {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-dim); opacity: 0.7;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.container-host.is-down { color: var(--danger-color); opacity: 1; }

/* A container whose host stopped answering. Everything on the row is a memory
   of the last successful listing, so it reads as one — except the line that
   says why, which does not fade. */
.container-row.is-stale .state-dot,
.container-row.is-stale .cell-name,
.container-row.is-stale .cell-state,
.container-row.is-stale .cell-ports,
.container-row.is-stale .container-image { opacity: 0.4; }

/* A host that was already down when the widget loaded listed nothing, so there
   are no rows of its to grey out — it gets a line of its own instead. */
.host-down-row {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px;
    border-bottom: 1px solid rgba(128,128,128,0.08);
    font-size: 12px;
}
.host-down-icon { width: 14px; height: 14px; color: var(--danger-color); flex-shrink: 0; }
.host-down-icon svg { width: 100%; height: 100%; }
.host-down-name { font-weight: 600; color: var(--text-main); }
.host-down-text { color: var(--danger-color); font-size: 11px; }

/* PORTS cell */
.cell-ports {
    display: flex; flex-wrap: nowrap; gap: 3px;
    align-items: center; min-width: 0;
    overflow: hidden;
    /* No padding of its own: the grid's column gap already separates it. */
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
    border-color: rgba(var(--accent-rgb,232,82,14),0.3);
    background: rgba(var(--accent-rgb,232,82,14),0.08);
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
.action-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(var(--accent-rgb,232,82,14),0.1); }
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

/**
 * What one host contributed to the last listing.
 *
 * `containers` is kept even when a refresh fails, so a host going down greys
 * its rows out instead of making them vanish — a dashboard that reshuffles
 * every time a machine hiccups is harder to read than one that doesn't.
 * `everLoaded` separates "went away just now" from "was already down when you
 * opened this", which are different things to show.
 */
interface HostState {
    host: DockerHost;
    containers: DockerContainer[];
    failed: boolean;
    everLoaded: boolean;
}

class DockerWidget extends HTMLElement {
    private _itemId: number = 0;
    private _config: DockerWidgetConfig = { widgetId: 'docker', hosts: [], activeHost: '' };

    private _byHost: HostState[] = [];
    private _stats: Map<string, DockerStats> = new Map();
    private _loading = false;
    private _pollingTimer: ReturnType<typeof setInterval> | null = null;
    /** Re-lists containers, so one started elsewhere shows up on its own. */
    /** Last list markup written, so an unchanged refresh writes nothing. */
    private _lastBodyHTML: string | null = null;

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

    // ── Hosts ────────────────────────────────────────────────────────────────

    private hostById(id: string): DockerHost | undefined {
        return this._config.hosts.find(h => h.id === id);
    }

    /**
     * The containers on screen, each with the host it came from.
     *
     * Which ones those are is decided in the config screen and stored by
     * absence: a container with nothing set has no entry at all, so "not
     * hidden" is what selected means.
     */
    private visibleRows(): Array<{ container: DockerContainer; state: HostState }> {
        const cfg = this._config.containerConfig || {};
        const rows: Array<{ container: DockerContainer; state: HostState }> = [];
        for (const state of this._byHost) {
            for (const container of state.containers) {
                if (cfg[shortId(container.ID)]?.hidden) continue;
                rows.push({ container, state });
            }
        }
        return rows;
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
     * Re-lists every configured host, in parallel.
     *
     * `silent` is what the refresh timer passes: the rows on screen are still
     * valid, so they stay put instead of collapsing into skeletons and back
     * every interval. Only the first load clears the view.
     *
     * A host that fails keeps whatever it last returned; the render greys those
     * rows rather than dropping them, so one machine going quiet doesn't
     * reshuffle the whole widget.
     */
    private async loadContainers(silent = false) {
        const hosts = this._config.hosts;

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
            } catch (_) {
                return {
                    host,
                    containers: before?.containers ?? [],
                    failed: true,
                    everLoaded: before?.everLoaded ?? false,
                };
            }
        }));

        this._loading = false;
        this.refreshBody();
        this.startStatsPolling();
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

    /**
     * Reads CPU and memory for the rows on screen.
     *
     * One request per host, not per container. It used to ask for a single
     * container at a time, in batches of five with a pause between them, so a
     * host with twenty containers cost twenty round trips and twenty
     * connections to the daemon before the first screenful was complete. The
     * server now reads them together and answers with a map.
     *
     * What it asks for still matters as much as how: it once polled every
     * running container the host reported, including the ones hidden from the
     * widget — you could hide something and still pay for it forever,
     * invisibly. It follows what is drawn.
     */
    private async fetchAllStats() {
        // A host that isn't answering has nothing to report, and asking is how
        // you turn one unreachable machine into a slow widget.
        const rows = this.visibleRows()
            .filter(r => r.container.Status === 'running' && !r.state.failed);

        if (isDemoMode()) {
            rows.forEach(r => this.updateStatsDOM(r.container.ID, demoStats()));
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
                const res = await fetch('/api/docker/stats', dockerPost({ host: hostParam(host), ids }));
                if (!res.ok) {
                    ids.forEach(id => this.clearStatsPending(id));
                    return;
                }
                const all: Record<string, DockerStats> = await res.json();
                for (const id of ids) {
                    const stats = all[id];
                    // A container the daemon wouldn't report on is missing from
                    // the answer. It gets no number, not a zero.
                    if (!stats) { this.clearStatsPending(id); continue; }
                    this._stats.set(id, stats);
                    this.updateStatsDOM(id, stats);
                }
            } catch (_) {
                ids.forEach(id => this.clearStatsPending(id));
            }
        }));
    }

    private updateStatsDOM(containerID: string, stats: DockerStats) {
        const el = this.shadowRoot?.querySelector(`[data-stats-id="${containerID}"]`);
        if (!el) return;
        el.classList.remove('is-loading');
        el.textContent = `${stats.CPUPercent.toFixed(1)}% CPU · ${stats.MemPercent.toFixed(1)}% RAM`;
    }

    /**
     * Takes the shimmer off a row whose reading never arrived. A placeholder
     * that pulses forever promises something that isn't coming, so a container
     * the daemon won't report on goes back to showing nothing at all.
     */
    private clearStatsPending(containerID: string) {
        this.shadowRoot
            ?.querySelector(`[data-stats-id="${containerID}"]`)
            ?.classList.remove('is-loading');
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * Starts, stops or restarts a container.
     *
     * The host comes from the row, not from a widget-wide "current" one: with
     * containers from several hosts side by side, anything else would send the
     * command to whichever machine happened to be selected.
     */
    private async performAction(containerID: string, action: string, hostId: string) {
        const host = this.hostById(hostId);
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

        const label = (p: DockerPort) => (p.PrivatePort && p.PrivatePort !== p.PublicPort
            ? `${p.PublicPort}:${p.PrivatePort}`
            : `${p.PublicPort}`);

        // Two at most on the row. Any more would push the column wide enough to
        // start costing the container's name, which is the part being read.
        const show = unique.slice(0, 2);
        const hidden = unique.slice(2);

        const badges = show.map(p => `<span class="port-badge">${esc(label(p))}</span>`).join('');

        // The rest are counted, and named on hover — a "+3" that will not say
        // which three is just a smaller way of hiding them.
        const moreBadge = hidden.length > 0
            ? `<span class="port-badge more" title="${esc(hidden.map(label).join(', '))}">+${hidden.length}</span>`
            : '';

        return badges + moreBadge;
    }

    // ── Render ───────────────────────────────────────────────────────────────

    render() {
        if (!this.shadowRoot) return;

        const title = this._config.title || i18n.t('widget.docker.name');

        this.shadowRoot.innerHTML = `
            <style>${CSS}</style>
            <div class="widget-header">
                <div class="widget-header__top">
                    <span class="widget-header__icon">${ICON.docker}</span>
                    <span class="widget-header__title">${esc(title)}</span>
                </div>
            </div>
            <div class="widget-body" id="body"></div>
        `;

        this.bindEvents();
        this._lastBodyHTML = null;
        this.refreshBody();
    }

    /**
     * Repaints the list without rebuilding the widget.
     *
     * The refresh timer used to call render(), which reassigned the whole shadow
     * root every few seconds: the stylesheet was reparsed, and every node was
     * replaced — so an open ports popup closed under the pointer and anything
     * animating started over, on a loop, for as long as the dashboard was open.
     *
     * Only the list is touched here, and only when it actually differs. In the
     * ordinary case — the same containers in the same states — nothing is
     * written to the DOM at all.
     */
    private refreshBody(): void {
        const body = this.shadowRoot?.getElementById('body');
        if (!body) return;

        const html = this.buildBody();
        if (html === this._lastBodyHTML) return;
        this._lastBodyHTML = html;

        body.innerHTML = html;
        this.fitPortsColumn();
    }

    private buildBody(): string {
        const hasHosts     = this._config.hosts.length > 0;
        const admin        = isAdmin();
        const containerCfg = this._config.containerConfig || {};

        const rows = this.visibleRows();
        // With one host, naming it on every row says nothing you don't know.
        const showHost = this._config.hosts.length > 1;

        // Hosts that were already down when this loaded have no containers to
        // grey out, so they get a line of their own. Ones that went quiet later
        // keep their rows instead — see renderContainer.
        const silentHosts = this._byHost.filter(s => s.failed && !s.everLoaded);
        const everythingDown = this._byHost.length > 0 && this._byHost.every(s => s.failed);

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

        } else if (everythingDown && rows.length === 0) {
            bodyHTML = `
                <div class="state-view">
                    <div class="state-icon">${ICON.alert}</div>
                    <span class="state-text">${i18n.t('docker.connection_error')}</span>
                    <button class="retry-btn" id="retry-btn">${i18n.t('general.retry') || 'Retry'}</button>
                </div>`;

        } else if (rows.length === 0 && silentHosts.length === 0) {
            // Either the hosts have none, or every one of them is hidden from
            // the config screen. Both read the same from here.
            bodyHTML = `
                <div class="state-view">
                    <div class="state-icon">${ICON.inbox}</div>
                    <span class="state-text">${i18n.t('docker.no_containers')}</span>
                </div>`;

        } else {
            bodyHTML = rows
                .map(({ container, state }) =>
                    this.renderContainer(container, state, admin, containerCfg, showHost))
                .join('')
                + silentHosts.map(s => `
                <div class="host-down-row">
                    <span class="host-down-icon">${ICON.alert}</span>
                    <span class="host-down-name">${esc(s.host.name)}</span>
                    <span class="host-down-text">${esc(i18n.t('docker.host_unreachable'))}</span>
                </div>`).join('');
        }

        return bodyHTML;
    }

    /**
     * Sizes the ports column to the widest row that actually has ports.
     *
     * Measured rather than guessed: the badges are monospaced but the label is
     * anything from "80" to "65535:65535", and a fixed track has to assume the
     * worst for every row in the list. Floored at one badge so the column does
     * not disappear on a list where nothing publishes a port, and capped so a
     * container with two long mappings cannot eat into the name — which is the
     * part being read.
     */
    private fitPortsColumn(): void {
        const body = this.shadowRoot?.getElementById('body');
        if (!body) return;
        const cells = body.querySelectorAll<HTMLElement>('.cell-ports');
        let widest = 0;
        for (const cell of cells) widest = Math.max(widest, cell.scrollWidth);
        const width = Math.min(120, Math.max(56, Math.ceil(widest)));
        body.style.setProperty('--ports-w', `${width}px`);
    }

    private renderContainer(
        c: DockerContainer,
        state: HostState,
        admin: boolean,
        containerCfg: Record<string, ContainerCfgEntry>,
        showHost: boolean
    ): string {
        const sid = shortId(c.ID);
        const cfg = containerCfg[sid] || {};
        // Its host stopped answering after we listed it. The row stays, because
        // knowing a service is unreachable is worth more than an empty space,
        // but nothing on it pretends to be current any more.
        const stale = state.failed;

        // Name. It becomes a link when we know where the container answers —
        // either because it says so, because a port is published, or because
        // someone typed an address in the config. Without that it stays text:
        // a link that goes nowhere is worse than no link.
        const displayName = cfg.label || containerName(c);
        const target = cfg.url || defaultContainerUrl(c, state.host, window.location.hostname);
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
        // Only a row that is actually waiting for numbers shimmers. A stopped
        // container has none to wait for, and a host that stopped answering
        // isn't going to send any.
        const statsPending = c.Status === 'running' && !stale && !cachedStats;

        // Image
        const imgShort = c.Image.replace(/^[a-z0-9.-]+\.[a-z]{2,}\//i, '');

        // Ports
        const portsHTML = this.renderPorts(c.Ports || []);

        // The host goes under the image. When the host stops answering this is
        // where it says so — on the row of the container it affects.
        const hostLine = stale
            ? `<span class="container-host is-down">${esc(i18n.t('docker.host_unreachable'))}</span>`
            : showHost
                ? `<span class="container-host">${esc(state.host.name)}</span>`
                : '';

        // Actions. A host that isn't answering can't be told to do anything.
        let actionsHTML = '';
        if (admin && !stale) {
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
        <div class="container-row${stale ? ' is-stale' : ''}"
             data-container-id="${esc(c.ID)}" data-host-id="${esc(state.host.id)}">
            <span class="state-dot ${statusKey}" title="${esc(stateLabel)}"></span>
            <div class="cell-name">${nameHTML}</div>
            <div class="cell-state">
                <span class="stats-text${statsPending ? ' is-loading' : ''}" data-stats-id="${esc(c.ID)}">${esc(statsText)}</span>
            </div>
            <div class="cell-image">
                <span class="container-image" title="${esc(c.Image)}">${esc(imgShort)}</span>
                ${hostLine}
            </div>
            <div class="cell-ports">${portsHTML}</div>
            <div class="cell-actions">${actionsHTML}</div>
        </div>`;
    }

    // ── Event binding ────────────────────────────────────────────────────────

    private bindEvents() {
        if (!this.shadowRoot) return;
        const root = this.shadowRoot;

        // Delegated from the body, which survives a refresh — anything bound to a
        // node inside it would not.
        root.getElementById('body')?.addEventListener('click', (e: Event) => {
            if ((e.target as Element).closest('#retry-btn')) {
                this.loadContainers();
                return;
            }

            // Start / stop / restart. Everything else a row can do is
            // configuration, and configuration lives in the config modal.
            const btn = (e.target as Element).closest('.action-btn') as HTMLElement | null;
            if (btn && !btn.hasAttribute('disabled')) {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                // The row carries its host: with several on screen, the command
                // has to go to the machine this container actually runs on.
                const hostId = btn.closest<HTMLElement>('.container-row')?.dataset.hostId;
                if (action && id && hostId) this.performAction(id, action, hostId);
            }
        });
    }
}

customElements.define('widget-docker', DockerWidget);
