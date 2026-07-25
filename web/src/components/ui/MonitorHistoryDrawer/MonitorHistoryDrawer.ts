import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import { shell, loadingInner, emptyInner, dataInner, HistoryData } from './MonitorHistoryDrawer.template';
import css from './MonitorHistoryDrawer.css' with { type: 'text' };

/**
 * MonitorHistoryDrawer
 * Slide-in detail panel for a monitored bookmark: current status, uptime % and
 * a heartbeat of recent checks. Opened by clicking a bookmark's status dot.
 */
class MonitorHistoryDrawer extends HTMLElement {
    private isOpen = false;
    private name = '';
    private mode = 'tab';
    private itemId = 0;
    private range = '24h';
    private data: HistoryData | null = null;
    private loading = false;
    private _keydown: (e: KeyboardEvent) => void;
    private _unsubI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        };
    }

    connectedCallback() {
        this.render();
        this.shadowRoot!.addEventListener('click', (e) => {
            const t = e.target as HTMLElement;
            if (t.closest('.mhd__close') || t.classList.contains('mhd__overlay')) {
                this.close();
                return;
            }
            const rangeBtn = t.closest('.mhd__range') as HTMLElement | null;
            if (rangeBtn && rangeBtn.dataset.range) {
                this.setRange(rangeBtn.dataset.range);
            }
        });
        window.addEventListener('keydown', this._keydown);
        this._unsubI18n = i18n.subscribe(() => { if (this.isOpen) this.render(); });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
        if (this._unsubI18n) this._unsubI18n();
    }

    async open(itemId: number, name: string) {
        this.itemId = itemId;
        this.name = name;
        this.range = '24h';
        this.isOpen = true;
        this.setAttribute('open', '');
        document.body.style.overflow = 'hidden';
        // Fetch mode once per open (drives the empty-state message).
        apiService.get<{ mode: string }>('/api/monitor/settings')
            .then(s => { this.mode = s.mode || 'tab'; })
            .catch(() => { /* keep default */ });
        this.refetch();
    }

    setRange(range: string) {
        if (range === this.range) return;
        this.range = range;
        this.refetch();
    }

    private async refetch() {
        this.data = null;
        this.loading = true;
        this.render();
        try {
            this.data = await apiService.get<HistoryData>(
                `/api/monitor/history?item_id=${this.itemId}&range=${this.range}`);
        } catch {
            this.data = null;
        }
        this.loading = false;
        if (this.isOpen) this.render();
    }

    close() {
        this.isOpen = false;
        this.removeAttribute('open');
        document.body.style.overflow = '';
        this.render();
    }

    private render() {
        let inner: string;
        if (this.loading) {
            inner = loadingInner(this.name);
        } else if (!this.data || this.data.total === 0) {
            inner = emptyInner(this.name, this.mode, this.range);
        } else {
            inner = dataInner(this.name, this.data);
        }
        this.shadowRoot!.innerHTML = `<style>${css}</style>${shell(this.isOpen, inner)}`;
    }
}

if (!customElements.get('monitor-history-drawer')) {
    customElements.define('monitor-history-drawer', MonitorHistoryDrawer);
}

export { MonitorHistoryDrawer };
