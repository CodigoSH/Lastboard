import '../MonitorDetail/MonitorDetail';
import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { escapeHtml } from '../../../services/escape';
import css from './MonitorPage.css' with { type: 'text' };

interface OverviewRow {
    item_id: number;
    name: string;
    status: string;
    uptime_pct: number;
    latency_ms: number | null;
    heartbeat: { status: string }[];
}

/**
 * MonitorPage
 * Full-screen status page: a searchable list of monitors on the left, the
 * selected monitor's detail on the right (shared <monitor-detail>). On phones a
 * tapped row opens the drawer instead. Reached from the topbar status icon.
 */
class MonitorPage extends HTMLElement {
    private rows: OverviewRow[] = [];
    private selectedId = 0;
    private _built = false;
    private _keydown: (e: KeyboardEvent) => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.hasAttribute('open')) this.close();
        };
    }

    connectedCallback() {
        this._build();
        window.addEventListener('keydown', this._keydown);
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
    }

    private _build() {
        if (this._built) return;
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            <div class="mp">
                <header class="mp__header">
                    <div class="mp__title">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        ${escapeHtml(i18n.t('monitor.overview_title'))}
                    </div>
                    <button class="mp__home" id="mp-home">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        <span>${escapeHtml(i18n.t('monitor.back_home'))}</span>
                    </button>
                </header>
                <div class="mp__layout">
                    <aside class="mp__list">
                        <input class="mp__search" id="mp-search" type="text" placeholder="${escapeHtml(i18n.t('monitor.search_placeholder'))}" />
                        <div class="mp__rows" id="mp-rows"></div>
                    </aside>
                    <section class="mp__detail"><monitor-detail></monitor-detail></section>
                </div>
            </div>`;

        this.shadowRoot!.getElementById('mp-home')!.addEventListener('click', () => this.close());
        this.shadowRoot!.getElementById('mp-search')!.addEventListener('input', (e) =>
            this._filter((e.target as HTMLInputElement).value));
        this.shadowRoot!.getElementById('mp-rows')!.addEventListener('click', (e) => {
            const row = (e.target as HTMLElement).closest('.mp-row') as HTMLElement | null;
            if (!row) return;
            const id = parseInt(row.dataset.id || '0', 10);
            if (id) this._select(id, row.dataset.name || '');
        });
        this._built = true;
    }

    private _detail() {
        return this.shadowRoot!.querySelector('monitor-detail') as (HTMLElement & {
            load: (id: number, name: string) => void; stop: () => void; clear: () => void;
        }) | null;
    }

    async open() {
        this._build();
        this.setAttribute('open', '');
        document.body.style.overflow = 'hidden';
        try {
            this.rows = await apiService.get<OverviewRow[]>('/api/monitor/overview');
        } catch {
            this.rows = [];
        }
        this._renderRows();
        if (this.rows.length) {
            this._select(this.rows[0].item_id, this.rows[0].name);
        } else {
            this._detail()?.clear();
        }
    }

    close() {
        this.removeAttribute('open');
        document.body.style.overflow = '';
        this._detail()?.stop();
    }

    private _select(id: number, name: string) {
        this.selectedId = id;
        this.shadowRoot!.querySelectorAll('.mp-row').forEach(r =>
            r.classList.toggle('mp-row--active', parseInt((r as HTMLElement).dataset.id || '0', 10) === id));

        // On phones there's no room for a side-by-side detail; use the drawer.
        if (window.innerWidth < 640) {
            eventBus.emit(EVENTS.SHOW_MONITOR_HISTORY, { itemId: id, name });
        } else {
            this._detail()?.load(id, name);
        }
    }

    private _renderRows() {
        const box = this.shadowRoot!.getElementById('mp-rows');
        if (!box) return;
        if (!this.rows.length) {
            box.innerHTML = `<div class="mp__empty">${escapeHtml(i18n.t('monitor.overview_empty'))}</div>`;
            return;
        }
        box.innerHTML = this.rows.map(r => this._row(r)).join('');
    }

    private _row(r: OverviewRow): string {
        const uptime = r.uptime_pct < 0 ? '—' : `${r.uptime_pct.toFixed(1)}%`;
        const beats = (r.heartbeat || []).map(b => `<span class="mp-row__beat mp-row__beat--${b.status}"></span>`).join('');
        return `
            <button class="mp-row ${r.item_id === this.selectedId ? 'mp-row--active' : ''}" data-id="${r.item_id}" data-name="${escapeHtml(r.name)}">
                <span class="mp-row__status mp-row__status--${r.status}"></span>
                <span class="mp-row__name">${escapeHtml(r.name) || '—'}</span>
                <span class="mp-row__beats">${beats}</span>
                <span class="mp-row__uptime">${uptime}</span>
            </button>`;
    }

    private _filter(q: string) {
        const term = q.trim().toLowerCase();
        this.shadowRoot!.querySelectorAll('.mp-row').forEach(r => {
            const name = ((r as HTMLElement).dataset.name || '').toLowerCase();
            (r as HTMLElement).style.display = name.includes(term) ? '' : 'none';
        });
    }
}

if (!customElements.get('monitor-page')) {
    customElements.define('monitor-page', MonitorPage);
}

export { MonitorPage };
