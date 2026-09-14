import '../MonitorDetail/MonitorDetail';
import { adoptSharedStyles } from '../../../services/sharedStyles';
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
    heartbeat: { status: string; at: string }[];
}

const parseTs = (s: string) => new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');

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
        adoptSharedStyles(this.shadowRoot);
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
                        <span>${escapeHtml(i18n.t('monitor.overview_title'))}</span>
                    </div>
                    <!-- What the page is about, next to its name — the same
                         line the Proxmox page carries, and for the same reason:
                         the state of the thing belongs beside what it is. -->
                    <div class="mp__status" id="mp-status"></div>
                    <button class="mp__close" id="mp-close" aria-label="${escapeHtml(i18n.t('general.close'))}" title="${escapeHtml(i18n.t('general.close'))}">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </header>
                <div class="mp__layout">
                    <aside class="mp__list">
                        <div class="sec__head">
                            <span class="sec__label">${escapeHtml(i18n.t('monitor.services'))}</span>
                            <span class="sec__rule"></span>
                            <span class="search">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                                <input id="mp-search" type="search" placeholder="${escapeHtml(i18n.t('monitor.search_placeholder'))}"
                                       aria-label="${escapeHtml(i18n.t('monitor.search_placeholder'))}" />
                            </span>
                        </div>
                        <div class="mp__rows" id="mp-rows"></div>
                    </aside>
                    <section class="mp__detail"><monitor-detail></monitor-detail></section>
                </div>
            </div>`;

        this.shadowRoot!.getElementById('mp-close')!.addEventListener('click', () => this.close());
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
        // The topbar locks its other actions while the status page is up, the
        // same way it does in edit mode.
        eventBus.emit(EVENTS.MONITOR_OVERVIEW_CHANGED, { open: true });
        try {
            this.rows = await apiService.get<OverviewRow[]>('/api/monitor/overview');
        } catch {
            this.rows = [];
        }
        this._renderRows();
        this._renderStatus();
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
        eventBus.emit(EVENTS.MONITOR_OVERVIEW_CHANGED, { open: false });
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

    /** The summary beside the title: how many services, and how many are down. */
    private _renderStatus() {
        const el = this.shadowRoot?.getElementById('mp-status');
        if (!el) return;
        const down = this.rows.filter(r => r.status === 'down').length;
        el.innerHTML = `
            <span class="stat"><b>${this.rows.length}</b> ${escapeHtml(i18n.t('monitor.services').toLowerCase())}</span>
            <span class="stat stat--hot">${escapeHtml(i18n.t('monitor.services_down'))}: <b>${down}</b></span>`;
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

    private static readonly BEATS_N = 30;

    private _row(r: OverviewRow): string {
        const uptime = r.uptime_pct < 0 ? '—' : `${Math.round(r.uptime_pct)}%`;
        const real = r.heartbeat || [];
        const pad = Math.max(0, MonitorPage.BEATS_N - real.length);
        const label = (st: string) => st === 'down' ? i18n.t('status.unreachable') : i18n.t('status.online');
        const beats = '<span class="mp-row__beat mp-row__beat--empty"></span>'.repeat(pad)
            + real.map(b => `<span class="mp-row__beat mp-row__beat--${b.status}" title="${escapeHtml(`${label(b.status)} · ${i18n.formatDateTime(parseTs(b.at))}`)}"></span>`).join('');
        return `
            <button class="card mp-row ${r.item_id === this.selectedId ? 'mp-row--active' : ''}" data-id="${r.item_id}" data-name="${escapeHtml(r.name)}">
                <span class="dot dot--${r.status === 'down' ? 'bad' : r.status === 'up' ? 'up' : 'off'}"></span>
                <span class="mp-row__name">${escapeHtml(r.name) || '—'}</span>
                <span class="mp-row__beats">${beats}</span>
                <span class="mp-row__uptime mp-row__uptime--${r.status}">${uptime}</span>
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
