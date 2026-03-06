
import { i18n } from '../../services/i18n';
import { dashboardStore } from '../../store/dashboardStore';
import { userStore } from '../../store/userStore';

// ── Types ───────────────────────────────────────────────────────────────────

interface DockerHost {
    id: string;
    name: string;
    type: 'local' | 'tcp' | 'tls' | 'agent';
    url?: string;   // for tcp, tls, agent
    token?: string; // only for agent type
}

interface DockerWidgetConfig {
    widgetId: 'docker';
    hosts: DockerHost[];
    activeHost: string;
}

interface DockerContainer {
    ID: string;
    Name: string;
    Image: string;
    Status: string;
    State: string;
    Created: number;
}

interface DockerStats {
    CPUPercent: number;
    MemPercent: number;
    MemUsed: number;
    MemLimit: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hostParam(host: DockerHost): string {
    if (host.type === 'local') return '';
    if (host.type === 'agent') return `agent://${host.url ?? ''}?token=${encodeURIComponent(host.token ?? '')}`;
    if (host.type === 'tls') return `https://${host.url ?? ''}`;
    return host.url ?? '';
}

function isAdmin(): boolean {
    const user = userStore.getUser();
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'admin' || role === 'administrator';
}

// ── Lucide SVG icons ────────────────────────────────────────────────────────

const ICON = {
    docker: `<svg class="solid-icon" viewBox="0 0 640 512" fill="currentColor"><path d="M349.9 236.3h-66.1v-59.4h66.1v59.4zm0-204.3h-66.1v60.7h66.1V32zm78.2 144.8H362v59.4h66.1v-59.4zm-156.3-72.1h-66.1v60.1h66.1v-60.1zm78.1 0h-66.1v60.1h66.1v-60.1zm276.8 100c-14.4-9.7-47.6-13.2-73.1-8.4-3.3-24-16.7-44.9-41.1-63.7l-14-9.3-9.3 14c-18.4 27.8-23.4 73.6-3.7 103.8-8.7 4.7-25.8 11.1-48.4 10.7H2.4c-8.7 50.8 5.8 116.8 44 162.1 37.1 43.9 92.7 66.2 165.4 66.2 157.4 0 273.9-72.5 328.4-204.2 21.4.4 67.6.1 91.3-45.2 1.5-2.5 6.6-13.2 8.5-17.1l-13.3-8.9zm-511.1-27.9h-66v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm-78.1-72.1h-66.1v60.1h66.1v-60.1z"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    stop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
    restart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
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
.widget-header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 12px 7px;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(128,128,128,0.12);
}
.widget-header-icon {
    width: 16px;
    height: 16px;
    color: var(--accent);
    flex-shrink: 0;
    display: flex;
    align-items: center;
}
.widget-header-icon svg { width: 16px; height: 16px; }
.widget-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
    flex: 1;
}
.host-select {
    background: rgba(128,128,128,0.08);
    border: 1px solid rgba(128,128,128,0.15);
    border-radius: calc(var(--radius) - 2px);
    color: var(--text-main);
    font-family: var(--font-sans);
    font-size: 11px;
    padding: 3px 6px;
    cursor: pointer;
    outline: none;
    max-width: 120px;
    transition: border-color 0.2s;
}
.host-select:hover, .host-select:focus {
    border-color: var(--accent);
}
.host-select option {
    background: var(--surface-solid, #1a1a1a);
}

/* ── Scrollable body ── */
.widget-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: rgba(128,128,128,0.2) transparent;
}
.widget-body::-webkit-scrollbar { width: 4px; }
.widget-body::-webkit-scrollbar-track { background: transparent; }
.widget-body::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 2px; }

/* ── State views (empty / error / no-hosts) ── */
.state-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    opacity: 0.5;
    text-align: center;
}
.state-icon { width: 28px; height: 28px; }
.state-icon svg { width: 100%; height: 100%; }
.state-text { font-size: 12px; color: var(--text-dim); }
.state-hint { font-size: 11px; color: var(--text-dim); opacity: 0.7; }
.retry-btn {
    margin-top: 4px;
    padding: 5px 12px;
    background: rgba(128,128,128,0.1);
    border: 1px solid rgba(128,128,128,0.2);
    border-radius: var(--radius);
    color: var(--text-main);
    font-size: 11px;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: all 0.15s;
    opacity: 1;
}
.retry-btn:hover { background: rgba(var(--accent-rgb, 37,99,235), 0.12); border-color: var(--accent); color: var(--accent); }

/* ── Skeleton ── */
.skeleton-row {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-bottom: 1px solid rgba(128,128,128,0.08);
}
.skeleton-line {
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(90deg, rgba(128,128,128,0.1) 25%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Container rows ── */
.container-row {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(128,128,128,0.08);
    transition: background 0.15s;
}
.container-row:last-child { border-bottom: none; }
.container-row:hover { background: var(--surface-hover); }

.row-top {
    display: flex;
    align-items: center;
    gap: 7px;
}
.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background 0.3s;
}
.status-dot.running  { background: var(--success-color); animation: pulse 2.5s ease-in-out infinite; }
.status-dot.paused   { background: var(--warning-color); }
.status-dot.stopped  { background: var(--text-dim); opacity: 0.4; }
.status-dot.restarting { background: var(--accent); animation: pulse 1.2s ease-in-out infinite; }

@keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
    50%       { opacity: 0.7; box-shadow: 0 0 0 3px transparent; }
}

.container-name {
    font-size: 12px;
    font-weight: 600;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.container-image {
    font-size: 10px;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 38%;
    flex-shrink: 0;
    opacity: 0.7;
}

.row-bottom {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    padding-left: 15px;
}
.status-label {
    font-size: 10px;
    color: var(--text-dim);
    text-transform: lowercase;
    min-width: 52px;
    opacity: 0.75;
}
.stats-text {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-dim);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.actions {
    display: flex;
    gap: 4px;
    margin-left: auto;
    flex-shrink: 0;
}
.action-btn {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(128,128,128,0.08);
    border: 1px solid rgba(128,128,128,0.14);
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-dim);
    transition: all 0.15s;
    position: relative;
}
.action-btn svg { width: 12px; height: 12px; }
.action-btn:hover { background: rgba(var(--accent-rgb, 37,99,235), 0.12); border-color: var(--accent); color: var(--accent); }
.action-btn:active { transform: scale(0.9); }
.action-btn[data-action="stop"]:hover  { background: rgba(var(--danger-rgb, 220,38,38), 0.1); border-color: var(--danger-color); color: var(--danger-color); }
.action-btn[data-action="start"]:hover { background: rgba(var(--success-rgb, 22,163,74), 0.1); border-color: var(--success-color); color: var(--success-color); }

/* Tooltip */
.action-btn::after {
    content: attr(title);
    position: absolute;
    bottom: calc(100% + 5px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.75);
    color: #fff;
    font-family: var(--font-sans);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 10;
}
.action-btn:hover::after { opacity: 1; }
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

    private _unsubscribeDashboard: (() => void) | null = null;
    private _unsubscribeI18n: (() => void) | null = null;

    static get observedAttributes() { return ['item-id', 'content']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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

        this._unsubscribeDashboard = dashboardStore.subscribe((state: any) => {
            if (this._itemId) {
                const item = (Array.isArray(state.items) ? state.items : [])
                    .find((i: any) => i.id === this._itemId);
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
        this._unsubscribeDashboard?.();
        this._unsubscribeI18n?.();
    }

    // ── Active host ──────────────────────────────────────────────────────────

    private getActiveHost(): DockerHost | undefined {
        return this._config.hosts.find(h => h.id === this._config.activeHost)
            ?? this._config.hosts[0];
    }

    // ── Data fetching ────────────────────────────────────────────────────────

    private async loadContainers() {
        const host = this.getActiveHost();

        // No hosts configured yet
        if (!host) {
            this._loading = false;
            this._error = false;
            this._containers = [];
            this.render();
            return;
        }

        this.stopPolling();
        this._loading = true;
        this._error = false;
        this._containers = [];
        this._stats.clear();
        this.render();

        try {
            const param = hostParam(host);
            const res = await fetch(`/api/docker/containers?host=${encodeURIComponent(param)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this._containers = Array.isArray(data) ? data : [];
            this._loading = false;
            this.render();
            this.startStatsPolling();
        } catch (_) {
            this._loading = false;
            this._error = true;
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
            if (this._pollingTimer === null) return; // stopped
            await this.fetchAllStats();
            if (this._pollingTimer !== null) {
                this._pollingTimer = setTimeout(poll, 4000);
            }
        };
        // Use a dummy timeout to indicate it's active
        this._pollingTimer = setTimeout(poll, 0);
    }

    private async fetchAllStats() {
        const host = this.getActiveHost();
        if (!host) return;
        const param = hostParam(host);
        const running = this._containers.filter(c => c.Status === 'running');

        // Fetch sequentially to avoid rate limiting and browser connection pooling limits
        for (const c of running) {
            // Stop if widget unmounted or stopped polling mid-fetch
            if (this._pollingTimer === null) break;

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

            // Small delay to prevent bursting the API rate limiter
            await new Promise(r => setTimeout(r, 150));
        }
    }

    // Targeted DOM update — no full re-render
    private updateStatsDOM(containerID: string, stats: DockerStats) {
        const el = this.shadowRoot?.querySelector(`[data-stats-id="${containerID}"]`);
        if (!el) return;
        el.textContent = `${stats.CPUPercent.toFixed(1)}% CPU  ${stats.MemPercent.toFixed(1)}% RAM`;
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    private async performAction(containerID: string, action: string) {
        const host = this.getActiveHost();
        if (!host) return;
        try {
            const res = await fetch('/api/docker/action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCSRFToken(),
                },
                body: JSON.stringify({ host: hostParam(host), id: containerID, action }),
            });
            if (res.ok) {
                // Reload list after a short delay to let Docker settle
                setTimeout(() => this.loadContainers(), 600);
            }
        } catch (_) { }
    }

    private getCSRFToken(): string {
        return document.cookie
            .split('; ')
            .find(r => r.startsWith('csrf_token='))
            ?.split('=')[1] ?? '';
    }

    // ── Host selector change ─────────────────────────────────────────────────

    private async onHostChange(id: string) {
        this._config.activeHost = id;
        // Persist so the selection survives page reloads
        if (this._itemId) {
            const state: any = dashboardStore.getState();
            const item = (Array.isArray(state.items) ? state.items : [])
                .find((i: any) => i.id === this._itemId);
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

    // ── Render ───────────────────────────────────────────────────────────────

    render() {
        if (!this.shadowRoot) return;

        const hasHosts = this._config.hosts.length > 0;
        const host = this.getActiveHost();
        const admin = isAdmin();

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
                    <div class="skeleton-line" style="width:60%"></div>
                    <div class="skeleton-line" style="width:40%"></div>
                </div>`).join('');
        } else if (this._error) {
            bodyHTML = `
                <div class="state-view">
                    <div class="state-icon">${ICON.alert}</div>
                    <span class="state-text">${i18n.t('docker.connection_error')}</span>
                    <button class="retry-btn" id="retry-btn">${i18n.t('general.retry') || 'Retry'}</button>
                </div>`;
        } else if (this._containers.length === 0) {
            bodyHTML = `
                <div class="state-view">
                    <div class="state-icon">${ICON.inbox}</div>
                    <span class="state-text">${i18n.t('docker.no_containers')}</span>
                </div>`;
        } else {
            bodyHTML = this._containers.map(c => this.renderContainer(c, admin)).join('');
        }

        // Host selector only if >1 host
        const hostSelector = this._config.hosts.length > 1 ? `
            <select class="host-select" id="host-select">
                ${this._config.hosts.map(h =>
            `<option value="${h.id}" ${h.id === this._config.activeHost ? 'selected' : ''}>${h.name}</option>`
        ).join('')}
            </select>` : '';

        this.shadowRoot.innerHTML = `
            <style>${CSS}</style>
            <div class="widget-header">
                <div class="widget-header-icon">${ICON.docker}</div>
                <span class="widget-title">${i18n.t('widget.docker.name')}</span>
                ${hostSelector}
            </div>
            <div class="widget-body" id="body">${bodyHTML}</div>
        `;

        this.bindEvents();
    }

    private renderContainer(c: DockerContainer, admin: boolean): string {
        const statusClass = c.Status === 'running' ? 'running'
            : c.Status === 'paused' ? 'paused'
                : c.Status === 'restarting' ? 'restarting'
                    : 'stopped';

        const cachedStats = this._stats.get(c.ID);
        const statsText = (c.Status === 'running' && cachedStats)
            ? `${cachedStats.CPUPercent.toFixed(1)}% CPU  ${cachedStats.MemPercent.toFixed(1)}% RAM`
            : '';

        // Action buttons
        let actionsHTML = '';
        if (admin) {
            if (c.Status === 'running') {
                actionsHTML = `
                    <button class="action-btn" data-action="stop" data-id="${c.ID}" title="${i18n.t('docker.action_stop') || 'Stop'}">${ICON.stop}</button>
                    <button class="action-btn" data-action="restart" data-id="${c.ID}" title="${i18n.t('docker.action_restart') || 'Restart'}">${ICON.restart}</button>`;
            } else {
                actionsHTML = `
                    <button class="action-btn" data-action="start" data-id="${c.ID}" title="${i18n.t('docker.action_start') || 'Start'}">${ICON.play}</button>
                    <button class="action-btn" data-action="restart" data-id="${c.ID}" title="${i18n.t('docker.action_restart') || 'Restart'}">${ICON.restart}</button>`;
            }
        }

        // Shorten image name: strip registry prefix if long
        const imgShort = c.Image.replace(/^[a-z0-9.-]+\.[a-z]{2,}\//i, '');

        return `
        <div class="container-row">
            <div class="row-top">
                <div class="status-dot ${statusClass}"></div>
                <span class="container-name">${c.Name || c.ID}</span>
                <span class="container-image">${imgShort}</span>
            </div>
            <div class="row-bottom">
                <span class="status-label">${i18n.t('docker.state_' + c.Status) || c.Status}</span>
                <span class="stats-text" data-stats-id="${c.ID}">${statsText}</span>
                <div class="actions">${actionsHTML}</div>
            </div>
        </div>`;
    }

    // ── Event binding ────────────────────────────────────────────────────────

    private bindEvents() {
        if (!this.shadowRoot) return;

        // Retry button
        this.shadowRoot.getElementById('retry-btn')?.addEventListener('click', () => {
            this.loadContainers();
        });

        // Host selector
        const sel = this.shadowRoot.getElementById('host-select') as HTMLSelectElement | null;
        if (sel) {
            sel.addEventListener('change', () => this.onHostChange(sel.value));
        }

        // Action buttons (event delegation on body)
        this.shadowRoot.getElementById('body')?.addEventListener('click', (e: Event) => {
            const btn = (e.target as Element).closest('.action-btn') as HTMLElement | null;
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action && id) this.performAction(id, action);
        });
    }
}

customElements.define('widget-docker', DockerWidget);
