import { i18n } from '../../services/i18n';
import { apiService } from '../../services/apiService';
import { dashboardStore } from '../../store/dashboardStore';
import { escapeHtml } from '../../services/escape';
import { eventBus, EVENTS } from '../../services/EventBus';

/** One service as /api/monitor/overview reports it. */
interface OverviewRow {
    item_id: number;
    name: string;
    status: 'up' | 'down' | 'none';
    uptime_pct: number;
    latency_ms: number | null;
    heartbeat: { status: 'up' | 'down'; at: string }[];
}

interface MonitorConfig {
    /** Item ids to show. Empty means every monitored service. */
    items: number[];
    refreshSec: number;
    /** Header text. Empty falls back to the widget's own name. */
    title: string;
}

const DEFAULT_CONFIG: MonitorConfig = { items: [], refreshSec: 60, title: '' };

const ICON_PULSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>';

/** How many bars a row draws. Matches what the endpoint returns. */
const BEATS = 30;

/**
 * A compact status page: the services being monitored, their uptime over the
 * last 24h and a heartbeat, with the same reading as the full monitor page.
 *
 * It refreshes on a timer, which is why the overview endpoint was rewritten to
 * summarise in SQL first — it used to read a whole day of history per service
 * on every call.
 */
class MonitorWidget extends HTMLElement {
    private _itemId = 0;
    private _config: MonitorConfig = { ...DEFAULT_CONFIG };
    private rows: OverviewRow[] = [];
    private loaded = false;
    private failed = false;
    private timer: ReturnType<typeof setInterval> | null = null;
    private _unsubscribe: (() => void) | null = null;
    private _unsubscribeI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['item-id']; }

    attributeChangedCallback(name: string, _old: string, val: string) {
        if (name === 'item-id') this._itemId = parseInt(val);
    }

    connectedCallback() {
        this.readConfig();
        this.render();
        this.load();
        this.restartTimer();

        this.shadowRoot!.addEventListener('click', this.onClick);

        this._unsubscribe = dashboardStore.subscribe((state) => {
            if (!this._itemId) return;
            const item = state.items.find(i => i.id === this._itemId);
            if (!item?.content) return;
            try {
                const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                if (data.widgetId !== 'monitor') return;

                const next: MonitorConfig = {
                    items: Array.isArray(data.items) ? data.items : [],
                    refreshSec: Number(data.refreshSec) > 0 ? Number(data.refreshSec) : DEFAULT_CONFIG.refreshSec,
                    title: typeof data.title === 'string' ? data.title : '',
                };
                const selectionChanged = next.items.join(',') !== this._config.items.join(',');
                const intervalChanged = next.refreshSec !== this._config.refreshSec;
                const titleChanged = next.title !== this._config.title;
                this._config = next;

                // Stats tick every second through this same store; repainting on
                // every one of them would fight the heartbeat animation.
                if (selectionChanged || titleChanged) this.render();
                if (intervalChanged) this.restartTimer();
            } catch { /* keep the current config */ }
        });

        this._unsubscribeI18n = i18n.subscribe(() => this.render());
    }

    disconnectedCallback() {
        this.shadowRoot?.removeEventListener('click', this.onClick);
        if (this.timer) clearInterval(this.timer);
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    private readConfig() {
        const item = dashboardStore.getState().items.find(i => i.id === this._itemId);
        if (!item?.content) return;
        try {
            const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            this._config = {
                items: Array.isArray(data.items) ? data.items : [],
                refreshSec: Number(data.refreshSec) > 0 ? Number(data.refreshSec) : DEFAULT_CONFIG.refreshSec,
                title: typeof data.title === 'string' ? data.title : '',
            };
        } catch { /* defaults */ }
    }

    private restartTimer() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.load(), this._config.refreshSec * 1000);
    }

    // ── Data ──

    private async load() {
        try {
            const rows = await apiService.get<OverviewRow[]>('/api/monitor/overview');
            this.rows = Array.isArray(rows) ? rows : [];
            this.failed = false;
        } catch {
            this.failed = true;
        }
        this.loaded = true;
        this.render();
    }

    /** The chosen services, in the order they were chosen. */
    private visibleRows(): OverviewRow[] {
        if (!this._config.items.length) return this.rows;
        const byId = new Map(this.rows.map(r => [r.item_id, r]));
        return this._config.items
            .map(id => byId.get(id))
            .filter((r): r is OverviewRow => !!r);
    }

    // ── Events ──

    private onClick = (e: Event) => {
        const row = (e.target as HTMLElement)?.closest?.('.mw-row') as HTMLElement | null;
        if (!row) return;
        const id = parseInt(row.dataset.id || '0', 10);
        if (id) eventBus.emit(EVENTS.SHOW_MONITOR_HISTORY, { itemId: id, name: row.dataset.name || '' });
    };

    // ── Render ──

    private state(text: string): string {
        return `<div class="mw-state">${escapeHtml(text)}</div>`;
    }

    private rowHtml(r: OverviewRow): string {
        const uptime = r.uptime_pct < 0 ? '—' : `${Math.round(r.uptime_pct)}%`;
        const beats = r.heartbeat || [];
        // Pad on the left so every row ends at "now", however little history a
        // freshly added service has.
        const pad = Math.max(0, BEATS - beats.length);
        const label = (st: string) => st === 'down' ? i18n.t('status.unreachable') : i18n.t('status.online');
        const bars = '<span class="mw-beat mw-beat--empty"></span>'.repeat(pad)
            + beats.map(b => `<span class="mw-beat mw-beat--${b.status}" title="${escapeHtml(`${label(b.status)} · ${new Date(b.at).toLocaleString()}`)}"></span>`).join('');

        const latency = r.latency_ms != null ? `${r.latency_ms} ms` : '';
        return `
            <button class="mw-row" data-id="${r.item_id}" data-name="${escapeHtml(r.name)}"
                    title="${escapeHtml(i18n.t('monitor.click_for_history'))}">
                <span class="mw-dot mw-dot--${r.status}"></span>
                <span class="mw-name">${escapeHtml(r.name) || '—'}</span>
                <span class="mw-latency">${escapeHtml(latency)}</span>
                <span class="mw-uptime mw-uptime--${r.status}">${uptime}</span>
                <span class="mw-beats">${bars}</span>
            </button>`;
    }

    private body(): string {
        if (!this.loaded) return this.state(i18n.t('general.loading'));
        if (this.failed) return this.state(i18n.t('general.error'));
        if (!this.rows.length) return this.state(i18n.t('monitor.overview_empty'));

        const visible = this.visibleRows();
        // Chosen services that no longer exist (deleted or monitoring turned off)
        // leave the widget empty; say so instead of showing a blank box.
        if (!visible.length) return this.state(i18n.t('monitor.no_services_selected'));

        return `<div class="mw-rows">${visible.map(r => this.rowHtml(r)).join('')}</div>`;
    }

    render() {
        if (!this.shadowRoot) return;
        const title = this._config.title || i18n.t('widget.monitor.name');
        const header = `
            <div class="mw-header">
                <span class="mw-header-icon">${ICON_PULSE}</span>
                <span class="mw-header-title">${escapeHtml(title)}</span>
            </div>`;
        this.shadowRoot.innerHTML = `<style>${CSS}</style>${header}<div class="mw-body">${this.body()}</div>`;
    }
}

// =============================================================
// Styles
// =============================================================
const CSS = `
:host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 8px;
    color: var(--text-main);
    container-type: inline-size;
    overflow: hidden;
}

/* Fixed header, scrolling body — otherwise the title scrolls away with the
   services on a short widget. */
.mw-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px 6px;
    flex-shrink: 0;
}

.mw-header-icon {
    width: 14px;
    height: 14px;
    color: var(--accent);
    display: flex;
    flex-shrink: 0;
}

.mw-header-icon svg { width: 100%; height: 100%; }

.mw-header-title {
    font-size: clamp(10px, 3cqi, 12px);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.mw-body {
    flex: 1;
    min-height: 0;
}

.mw-rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
}

/* Narrow (a 2-wide widget): the bars drop to their own line so the name stays
   readable. Wide enough and everything sits on one line, which nearly doubles
   how many services fit — measured: 3 rows visible in a 4x2 before, 7 after. */
.mw-row {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) 4.5em 2.8em;
    grid-template-areas: "dot name latency uptime" "beats beats beats beats";
    align-items: center;
    gap: 2px 8px;
    width: 100%;
    padding: 4px 6px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
}

.mw-row:hover {
    background: rgba(var(--accent-rgb), 0.08);
}

.mw-dot {
    grid-area: dot;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border);
}

.mw-dot--up { background: var(--success-color); }
.mw-dot--down { background: var(--danger-color); }

.mw-name {
    grid-area: name;
    font-size: clamp(10px, 3.2cqi, 13px);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.mw-latency {
    grid-area: latency;
    font-size: clamp(9px, 2.6cqi, 11px);
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    text-align: right;
}

.mw-uptime {
    grid-area: uptime;
    font-size: clamp(9px, 2.8cqi, 12px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--text-dim);
    text-align: right;
}

.mw-uptime--up { color: var(--success-color); }
.mw-uptime--down { color: var(--danger-color); }

.mw-beats {
    grid-area: beats;
    display: flex;
    gap: 1px;
    height: 6px;
    margin-top: 1px;
}

@container (min-width: 300px) {
    .mw-row {
        /* Fixed widths for the two numeric columns. Sized to their content,
           "532 ms" and "65 ms" pushed the bars to different places and their
           right edge came out ragged. */
        grid-template-columns: 8px minmax(70px, 1fr) minmax(60px, 1.4fr) 4.5em 2.8em;
        grid-template-areas: "dot name beats latency uptime";
    }

    .mw-beats {
        height: 12px;
        margin-top: 0;
    }
}

.mw-beat {
    flex: 1 1 0;
    min-width: 0;
    border-radius: 1px;
    background: var(--border);
}

.mw-beat--up { background: var(--success-color); }
.mw-beat--down { background: var(--danger-color); }
.mw-beat--empty { background: var(--border); opacity: 0.35; }

.mw-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 8px;
    text-align: center;
    font-size: clamp(10px, 3cqi, 12px);
    color: var(--text-dim);
}
`;

if (!customElements.get('widget-monitor')) {
    customElements.define('widget-monitor', MonitorWidget);
}
