import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import {
    shell, loadingInner, emptyInner, dataInner, HistoryData,
    computeSpark, barTooltipHtml, sparkTooltipHtml, SparkPoint,
} from './MonitorHistoryDrawer.template';
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
    private _sparkPoints: SparkPoint[] = [];
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
        this.shadowRoot!.addEventListener('mouseover', (e) => this._onHover(e));
        this.shadowRoot!.addEventListener('mousemove', (e) => this._onMove(e as MouseEvent));
        this.shadowRoot!.addEventListener('mouseout', (e) => this._onOut(e as MouseEvent));
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

    // --- Hover interactions (heartbeat bars + latency chart) ---
    private _onHover(e: Event) {
        const beat = (e.target as HTMLElement).closest?.('.mhd__beat') as HTMLElement | null;
        if (beat) {
            const r = beat.getBoundingClientRect();
            this._showTip(barTooltipHtml(beat.dataset.status || '', beat.dataset.at || ''), r.left + r.width / 2, r.top);
        }
    }

    private _onMove(e: MouseEvent) {
        const plot = (e.target as HTMLElement).closest?.('.mhd__spark-plot') as HTMLElement | null;
        if (!plot || this._sparkPoints.length === 0) return;

        const rect = plot.getBoundingClientRect();
        const fx = (e.clientX - rect.left) / rect.width;
        let nearest = this._sparkPoints[0];
        let best = Infinity;
        for (const p of this._sparkPoints) {
            const d = Math.abs(p.xPct / 100 - fx);
            if (d < best) { best = d; nearest = p; }
        }

        const dot = plot.querySelector('.mhd__spark-dot') as HTMLElement | null;
        const cross = plot.querySelector('.mhd__spark-cross') as HTMLElement | null;
        if (dot) { dot.style.left = `${nearest.xPct}%`; dot.style.top = `${nearest.yPct}%`; dot.hidden = false; }
        if (cross) { cross.style.left = `${nearest.xPct}%`; cross.hidden = false; }

        const px = rect.left + (nearest.xPct / 100) * rect.width;
        const py = rect.top + (nearest.yPct / 100) * rect.height;
        this._showTip(sparkTooltipHtml(nearest.value, nearest.at), px, py);
    }

    private _onOut(e: MouseEvent) {
        const to = e.relatedTarget as Node | null;
        const beat = (e.target as HTMLElement).closest?.('.mhd__beat') as HTMLElement | null;
        if (beat && (!to || !beat.contains(to))) this._hideTip();

        const plot = (e.target as HTMLElement).closest?.('.mhd__spark-plot') as HTMLElement | null;
        if (plot && (!to || !plot.contains(to))) {
            (plot.querySelector('.mhd__spark-dot') as HTMLElement | null)?.setAttribute('hidden', '');
            (plot.querySelector('.mhd__spark-cross') as HTMLElement | null)?.setAttribute('hidden', '');
            this._hideTip();
        }
    }

    private _showTip(html: string, x: number, y: number) {
        const tip = this.shadowRoot!.querySelector('.mhd__tip') as HTMLElement | null;
        if (!tip) return;
        tip.innerHTML = html;
        tip.hidden = false;
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        let left = x - tw / 2;
        left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
        let top = y - th - 12;
        if (top < 8) top = y + 16;
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
    }

    private _hideTip() {
        const tip = this.shadowRoot!.querySelector('.mhd__tip') as HTMLElement | null;
        if (tip) tip.hidden = true;
    }

    private render() {
        this._sparkPoints = (this.data && this.data.total > 0)
            ? computeSpark(this.data.checks || []).points
            : [];
        let inner: string;
        try {
            if (this.loading) {
                inner = loadingInner(this.name);
            } else if (!this.data || this.data.total === 0) {
                inner = emptyInner(this.name, this.mode, this.range);
            } else {
                inner = dataInner(this.name, this.data);
            }
        } catch (e) {
            // Never let a template error brick the drawer: keep it closeable.
            console.error('History drawer render failed', e);
            inner = `
                <header class="mhd__header">
                    <h2 class="mhd__title"></h2>
                    <button class="mhd__close" aria-label="Close">&times;</button>
                </header>
                <div class="mhd__state">${i18n.t('widget.api.unreachable') || 'Error'}</div>`;
        }
        this.shadowRoot!.innerHTML = `<style>${css}</style>${shell(this.isOpen, inner)}`;
    }
}

if (!customElements.get('monitor-history-drawer')) {
    customElements.define('monitor-history-drawer', MonitorHistoryDrawer);
}

export { MonitorHistoryDrawer };
