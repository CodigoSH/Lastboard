import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import {
    loadingInner, emptyInner, dataInner, noSelectionInner, HistoryData,
    computeSpark, barTooltipHtml, sparkTooltipHtml, SparkPoint,
} from './MonitorDetail.template';
import css from './MonitorDetail.css' with { type: 'text' };

/**
 * MonitorDetail
 * Embeddable status detail for one monitor: current status, uptime %, latency
 * chart, heartbeat and incidents, with a range selector and background
 * auto-refresh. Hosted by both the slide-in drawer and the full-screen page.
 */
class MonitorDetail extends HTMLElement {
    private active = false;
    private name = '';
    private mode = 'background';
    private itemId = 0;
    private range = '24h';
    private data: HistoryData | null = null;
    private loading = false;
    private _sparkPoints: SparkPoint[] = [];
    private _lastFetch = 0;
    private _lastSig = '';
    private _refreshTimer: number | null = null;
    private _agoTimer: number | null = null;
    private static readonly REFRESH_MS = 30000;
    private _unsubI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.shadowRoot!.addEventListener('click', (e) => {
            const t = e.target as HTMLElement;
            const rangeBtn = t.closest('.mhd__range') as HTMLElement | null;
            if (rangeBtn && rangeBtn.dataset.range) { this.setRange(rangeBtn.dataset.range); return; }
            if (t.closest('.mhd__clear')) { this._confirmClear(); return; }
            if (t.closest('.mhd__refresh')) this._reload(false);
        });
        this.shadowRoot!.addEventListener('mouseover', (e) => this._onHover(e));
        this.shadowRoot!.addEventListener('mousemove', (e) => this._onMove(e as MouseEvent));
        this.shadowRoot!.addEventListener('mouseout', (e) => this._onOut(e as MouseEvent));
        this._unsubI18n = i18n.subscribe(() => { if (this.active) this.render(); });
    }

    disconnectedCallback() {
        if (this._unsubI18n) this._unsubI18n();
        this._stopTimers();
    }

    /** Load and show one monitor's detail, starting auto-refresh. */
    load(itemId: number, name: string) {
        this.itemId = itemId;
        this.name = name;
        this.range = '24h';
        this.active = true;
        apiService.get<{ mode: string }>('/api/monitor/settings')
            .then(s => { this.mode = s.mode || 'background'; })
            .catch(() => { /* keep default */ });
        this._reload(true);
        this._startTimers();
    }

    /** Show the "nothing selected" placeholder and stop refreshing. */
    clear() {
        this.active = false;
        this.data = null;
        this._stopTimers();
        this.render();
    }

    /** Stop background work (e.g. when the host is hidden). */
    stop() {
        this._stopTimers();
    }

    setRange(range: string) {
        if (range === this.range) return;
        this.range = range;
        this._reload(true);
    }

    private _confirmClear() {
        if (!this.itemId) return;
        const id = this.itemId;
        eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
            title: i18n.t('monitor.clear_data'),
            message: i18n.t('monitor.clear_data_confirm'),
            onConfirm: async () => {
                try {
                    await apiService.delete(`/api/monitor/history?item_id=${id}`);
                    this._lastSig = '';
                    if (this.active && this.itemId === id) this._reload(true);
                } catch { /* ignore */ }
            },
        });
    }

    private async _reload(showLoading: boolean) {
        if (showLoading) {
            this.data = null;
            this.loading = true;
            this.render();
        }
        let d: HistoryData | null = null;
        try {
            d = await apiService.get<HistoryData>(
                `/api/monitor/history?item_id=${this.itemId}&range=${this.range}`);
        } catch {
            d = null;
        }
        if (!this.active) return;

        this.loading = false;
        const sig = this._sig(d);
        if (showLoading || sig !== this._lastSig) {
            this.data = d;
            this._lastSig = sig;
            this.render();
        } else {
            this.data = d;
        }
        this._lastFetch = Date.now();
        this._updateAgoLabel();
    }

    private _sig(d: HistoryData | null): string {
        if (!d) return 'null';
        return `${d.range}|${d.total}|${d.current?.checked_at || ''}`;
    }

    private _startTimers() {
        this._stopTimers();
        this._refreshTimer = window.setInterval(() => this._reload(false), MonitorDetail.REFRESH_MS);
        this._agoTimer = window.setInterval(() => this._updateAgoLabel(), 10000);
    }

    private _stopTimers() {
        if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null; }
        if (this._agoTimer) { clearInterval(this._agoTimer); this._agoTimer = null; }
    }

    private _updateAgoLabel() {
        const el = this.shadowRoot?.getElementById('mhd-ago');
        if (!el || !this._lastFetch) return;
        const secs = Math.round((Date.now() - this._lastFetch) / 1000);
        let rel: string;
        try {
            const rtf = new Intl.RelativeTimeFormat(i18n.getLocale().code, { numeric: 'auto' });
            rel = secs < 60 ? rtf.format(-secs, 'second') : rtf.format(-Math.round(secs / 60), 'minute');
        } catch {
            rel = `${secs}s`;
        }
        el.textContent = `${i18n.t('monitor.updated')} ${rel}`;
    }

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
            if (!this.active) {
                inner = noSelectionInner();
            } else if (this.loading) {
                inner = loadingInner(this.name);
            } else if (!this.data || this.data.total === 0) {
                inner = emptyInner(this.name, this.mode, this.range);
            } else {
                inner = dataInner(this.name, this.data);
            }
        } catch (e) {
            console.error('Monitor detail render failed', e);
            inner = `<div class="mhd__state">${i18n.t('widget.api.unreachable') || 'Error'}</div>`;
        }
        this.shadowRoot!.innerHTML = `<style>${css}</style>${inner}<div class="mhd__tip" hidden></div>`;
        this._updateAgoLabel();
    }
}

if (!customElements.get('monitor-detail')) {
    customElements.define('monitor-detail', MonitorDetail);
}

export { MonitorDetail };
