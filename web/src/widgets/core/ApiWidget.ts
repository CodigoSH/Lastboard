import { dashboardStore } from '../../store/dashboardStore';
import { i18n } from '../../services/i18n';
import { apiService } from '../../services/apiService';
import { escapeHtml } from '../../services/escape';

interface Mapping {
    label: string;
    path: string;
    format?: string; // 'number' | 'bytes' | 'percent' | undefined (raw)
}

interface ApiConfig {
    title?: string;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    mappings?: Mapping[];
    refreshSec?: number;
}

const MIN_REFRESH_SEC = 15;

function humanBytes(n: number): string {
    if (!isFinite(n)) return String(n);
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let i = 0;
    let v = Math.abs(n);
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatValue(v: any, fmt?: string): string {
    if (v === null || v === undefined) return '—';
    const num = Number(v);
    if (fmt === 'bytes' && !isNaN(num)) return humanBytes(num);
    if (fmt === 'percent' && !isNaN(num)) return `${Math.round(num)}%`;
    if (fmt === 'number' && !isNaN(num)) return num.toLocaleString();
    if (typeof v === 'object') return Array.isArray(v) ? `${v.length}` : JSON.stringify(v);
    return String(v);
}

class ApiWidget extends HTMLElement {
    private _itemId = 0;
    private _config: ApiConfig = {};
    private _fetchKey = '';
    private _unsub: (() => void) | null = null;
    private _unsubI18n: (() => void) | undefined;
    private _timer: ReturnType<typeof setInterval> | null = null;
    private _values: Record<string, any> | null = null;
    private _ok = true;
    private _loading = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['item-id']; }

    attributeChangedCallback(name: string, _old: string, val: string) {
        if (name === 'item-id') this._itemId = parseInt(val);
    }

    connectedCallback() {
        this._syncConfig();
        this.render();
        this.fetchData();

        this._unsub = dashboardStore.subscribe((state) => {
            if (!this._itemId) return;
            const item = state.items.find(i => i.id === this._itemId);
            if (!item?.content) return;
            let data: any = {};
            try {
                data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            } catch { return; }
            if (data.widgetId !== 'api') return;

            const prevKey = this._fetchKey;
            this._config = data;
            this._fetchKey = JSON.stringify([data.url, data.method, data.headers, data.mappings, data.refreshSec]);

            if (this._fetchKey !== prevKey) {
                this._scheduleRefresh();
                this.fetchData();
            } else {
                // Only cosmetic fields (title) changed — repaint without refetch.
                this.render();
            }
        });

        this._unsubI18n = i18n.subscribe(() => this.render());
        this._scheduleRefresh();
    }

    disconnectedCallback() {
        if (this._unsub) this._unsub();
        if (this._unsubI18n) this._unsubI18n();
        if (this._timer) clearInterval(this._timer);
    }

    private _syncConfig() {
        const item = dashboardStore.getState().items.find(i => i.id === this._itemId);
        if (!item?.content) return;
        try {
            const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            if (data.widgetId === 'api') {
                this._config = data;
                this._fetchKey = JSON.stringify([data.url, data.method, data.headers, data.mappings, data.refreshSec]);
            }
        } catch { /* ignore */ }
    }

    private _scheduleRefresh() {
        if (this._timer) clearInterval(this._timer);
        const sec = Math.max(MIN_REFRESH_SEC, this._config.refreshSec || 60);
        this._timer = setInterval(() => this.fetchData(), sec * 1000);
    }

    private async fetchData() {
        if (!this._config.url) {
            this._values = null;
            this.render();
            return;
        }
        this._loading = this._values === null;
        this.render();
        try {
            const paths = (this._config.mappings || []).map(m => m.path).filter(Boolean);
            const res = await apiService.post<{ ok: boolean; values: Record<string, any> }>(
                '/api/widget/api-fetch',
                { url: this._config.url, method: this._config.method || 'GET', headers: this._config.headers || {}, paths }
            );
            this._ok = !!res.ok;
            this._values = res.values || {};
        } catch {
            this._ok = false;
        }
        this._loading = false;
        this.render();
    }

    render() {
        const c = this._config;
        const title = c.title || '';
        const mappings = c.mappings || [];

        let body: string;
        if (!c.url) {
            body = `<div class="state">${i18n.t('widget.api.needs_config') || 'Configure an endpoint'}</div>`;
        } else if (this._loading) {
            body = `<div class="state">${i18n.t('general.loading') || 'Loading…'}</div>`;
        } else if (!this._ok) {
            body = `<div class="state state--err">${i18n.t('widget.api.unreachable') || 'Unreachable'}</div>`;
        } else if (!mappings.length) {
            body = `<div class="state">${i18n.t('widget.api.no_fields') || 'No fields mapped'}</div>`;
        } else {
            const vals = this._values || {};
            body = `<div class="metrics">${mappings.map(m => `
                <div class="metric">
                    <div class="metric__val">${escapeHtml(formatValue(vals[m.path], m.format))}</div>
                    <div class="metric__label">${escapeHtml(m.label || m.path)}</div>
                </div>`).join('')}</div>`;
        }

        this.shadowRoot!.innerHTML = `
            <style>
                :host { display:block; width:100%; height:100%; }
                .wrap { display:flex; flex-direction:column; height:100%; box-sizing:border-box; padding:12px 14px; container-type:size; }
                .title { font-size:clamp(.6rem,4cqi,.8rem); font-weight:600; color:var(--text-dim); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .metrics { flex:1; display:flex; flex-wrap:wrap; align-content:center; justify-content:space-around; gap:8px 14px; min-height:0; }
                .metric { display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:0; }
                .metric__val { font-size:clamp(1rem,11cqi,2rem); font-weight:700; color:var(--text-main); line-height:1.1; }
                .metric__label { font-size:clamp(.5rem,3.4cqi,.72rem); color:var(--text-dim); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
                .state { flex:1; display:flex; align-items:center; justify-content:center; text-align:center; color:var(--text-dim); font-size:clamp(.6rem,4cqi,.85rem); opacity:.7; padding:4px; }
                .state--err { color:var(--danger-color); opacity:.85; }
            </style>
            <div class="wrap">
                ${title ? `<div class="title">${escapeHtml(title)}</div>` : ''}
                ${body}
            </div>
        `;
    }
}

if (!customElements.get('widget-api')) {
    customElements.define('widget-api', ApiWidget);
}
