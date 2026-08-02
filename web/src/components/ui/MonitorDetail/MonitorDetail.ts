import { apiService } from '../../../services/apiService';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import {
    loadingInner, emptyInner, dataInner, noSelectionInner, HistoryData,
    barTooltipHtml, sparkTooltipHtml,
} from './MonitorDetail.template';
import css from './MonitorDetail.css' with { type: 'text' };

const parseMs = (s: string) => new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z').getTime();

function downsample<T>(arr: T[], n: number): T[] {
    if (arr.length <= n) return arr;
    const out: T[] = [];
    for (let k = 0; k < n; k++) out.push(arr[Math.round(k * (arr.length - 1) / (n - 1))]);
    return out;
}

interface ChartPoint { t: number; v: number; at: string; }
interface ScreenPoint { sx: number; sy: number; v: number; at: string; }

/**
 * MonitorDetail
 * Embeddable status detail for one monitor: status, uptime/latency stats, a
 * pixel-measured latency chart with axes, a recent-beats heartbeat and an events
 * table. Range selector + background auto-refresh. Hosted by the drawer and page.
 */
class MonitorDetail extends HTMLElement {
    private active = false;
    private name = '';
    private mode = 'background';
    private itemId = 0;
    private range = '24h';
    private data: HistoryData | null = null;
    private loading = false;
    private _chartData: ChartPoint[] = [];
    private _chartScreen: ScreenPoint[] = [];
    private _lastFetch = 0;
    private _lastSig = '';
    private _refreshTimer: number | null = null;
    private _agoTimer: number | null = null;
    private _resizeObs: ResizeObserver | null = null;
    private static readonly REFRESH_MS = 30000;
    private _unsubI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
    }

    connectedCallback() {
        this.render();
        const root = this.shadowRoot!;
        root.addEventListener('click', (e) => {
            const t = e.target as HTMLElement;
            const rangeBtn = t.closest('.mhd__range') as HTMLElement | null;
            if (rangeBtn && rangeBtn.dataset.range) { this.setRange(rangeBtn.dataset.range); return; }
            if (t.closest('.mhd__clear')) { this._toggleClearMenu(); return; }
            const clearItem = t.closest('.mhd__clear-item') as HTMLElement | null;
            if (clearItem) { this._closeClearMenu(); this._doClear(clearItem.dataset.scope || 'item'); return; }
            this._closeClearMenu();
            if (t.closest('.mhd__refresh')) this._reload(false);
        });
        root.addEventListener('mouseover', (e) => this._onHover(e));
        root.addEventListener('mousemove', (e) => this._onMove(e as MouseEvent));
        root.addEventListener('mouseout', (e) => this._onOut(e as MouseEvent));
        this._unsubI18n = i18n.subscribe(() => { if (this.active) this.render(); });
        this._resizeObs = new ResizeObserver(() => { if (this.active) this._drawChart(); });
        this._resizeObs.observe(this);
    }

    disconnectedCallback() {
        if (this._unsubI18n) this._unsubI18n();
        if (this._resizeObs) { this._resizeObs.disconnect(); this._resizeObs = null; }
        this._stopTimers();
    }

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

    clear() {
        this.active = false;
        this.data = null;
        this._stopTimers();
        this.render();
    }

    stop() { this._stopTimers(); }

    setRange(range: string) {
        if (range === this.range) return;
        this.range = range;
        this._reload(true);
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

    // --- Clear-data menu ---
    private _toggleClearMenu() {
        const menu = this.shadowRoot!.querySelector('.mhd__clear-menu') as HTMLElement | null;
        if (menu) menu.hidden = !menu.hidden;
    }
    private _closeClearMenu() {
        const menu = this.shadowRoot!.querySelector('.mhd__clear-menu') as HTMLElement | null;
        if (menu && !menu.hidden) menu.hidden = true;
    }
    private _doClear(scope: string) {
        if (scope === 'all') {
            eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
                title: i18n.t('monitor.clear_all'),
                message: i18n.t('monitor.clear_all_confirm'),
                onConfirm: async () => {
                    try {
                        await apiService.delete('/api/monitor/history');
                        this._lastSig = '';
                        if (this.active) this._reload(true);
                        if (window.notifier) window.notifier.show(i18n.t('monitor.data_cleared'));
                    } catch { /* ignore */ }
                },
            });
            return;
        }
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

    // --- Latency chart (measured pixels + axes) ---
    private _drawChart() {
        const box = this.shadowRoot!.getElementById('mhd-chart') as HTMLElement | null;
        if (!box) return;
        const data = this._chartData;
        const W = Math.max(0, Math.floor(box.clientWidth));
        const H = 190;
        if (data.length < 2 || W < 60) {
            box.innerHTML = `<div class="mhd__chart-empty">—</div>`;
            this._chartScreen = [];
            return;
        }
        const mL = 46, mR = 14, mT = 10, mB = 22;
        const pw = W - mL - mR, ph = H - mT - mB;
        const vs = data.map(d => d.v);
        let vmin = Math.min(...vs), vmax = Math.max(...vs);
        if (vmax === vmin) vmax = vmin + 1;
        const tmin = data[0].t, tmax = data[data.length - 1].t;
        const tr = (tmax - tmin) || 1;
        const X = (t: number) => mL + ((t - tmin) / tr) * pw;
        const Y = (v: number) => mT + (1 - (v - vmin) / (vmax - vmin)) * ph;

        const line = data.map(d => `${X(d.t).toFixed(1)},${Y(d.v).toFixed(1)}`).join(' ');
        const area = `${mL},${(mT + ph).toFixed(1)} ${line} ${(mL + pw).toFixed(1)},${(mT + ph).toFixed(1)}`;

        const yVals = [vmin, (vmin + vmax) / 2, vmax];
        const yEls = yVals.map(v => {
            const yy = Y(v);
            return `<line class="mhd__grid" x1="${mL}" y1="${yy.toFixed(1)}" x2="${(mL + pw).toFixed(1)}" y2="${yy.toFixed(1)}"/>`
                + `<text class="mhd__axis" x="${mL - 8}" y="${(yy + 3).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`;
        }).join('');

        const nx = Math.min(5, data.length);
        const xEls = Array.from({ length: nx }, (_, i) => {
            const t = tmin + (i / (nx - 1)) * tr;
            const xx = X(t);
            const dt = new Date(t);
            const lbl = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
            const anchor = i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle';
            return `<text class="mhd__axis" x="${xx.toFixed(1)}" y="${H - 6}" text-anchor="${anchor}">${lbl}</text>`;
        }).join('');

        box.innerHTML = `
            <svg class="mhd__chartsvg" width="${W}" height="${H}" role="img">
                ${yEls}
                <polygon points="${area}" class="mhd__chart-fill"></polygon>
                <polyline points="${line}" class="mhd__chart-line"></polyline>
                ${xEls}
                <line class="mhd__chart-cross" x1="0" y1="${mT}" x2="0" y2="${mT + ph}" hidden></line>
                <circle class="mhd__chart-dot" r="3.5" hidden></circle>
            </svg>`;
        this._chartScreen = data.map(d => ({ sx: X(d.t), sy: Y(d.v), v: d.v, at: d.at }));
    }

    // --- Hover ---
    private _onHover(e: Event) {
        const beat = (e.target as HTMLElement).closest?.('.mhd__beat') as HTMLElement | null;
        if (beat && beat.dataset.at) {
            const r = beat.getBoundingClientRect();
            this._showTip(barTooltipHtml(beat.dataset.status || '', beat.dataset.at), r.left + r.width / 2, r.top);
        }
    }

    private _onMove(e: MouseEvent) {
        const box = (e.target as HTMLElement).closest?.('#mhd-chart') as HTMLElement | null;
        if (!box || this._chartScreen.length === 0) return;
        const rect = box.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        let nearest = this._chartScreen[0], best = Infinity;
        for (const p of this._chartScreen) {
            const d = Math.abs(p.sx - mx);
            if (d < best) { best = d; nearest = p; }
        }
        const cross = box.querySelector('.mhd__chart-cross') as SVGElement | null;
        const dot = box.querySelector('.mhd__chart-dot') as SVGElement | null;
        if (cross) { cross.setAttribute('x1', String(nearest.sx)); cross.setAttribute('x2', String(nearest.sx)); cross.removeAttribute('hidden'); }
        if (dot) { dot.setAttribute('cx', String(nearest.sx)); dot.setAttribute('cy', String(nearest.sy)); dot.removeAttribute('hidden'); }
        this._showTip(sparkTooltipHtml(nearest.v, nearest.at), rect.left + nearest.sx, rect.top + nearest.sy);
    }

    private _onOut(e: MouseEvent) {
        const to = e.relatedTarget as Node | null;
        const beat = (e.target as HTMLElement).closest?.('.mhd__beat') as HTMLElement | null;
        if (beat && (!to || !beat.contains(to))) this._hideTip();

        const box = (e.target as HTMLElement).closest?.('#mhd-chart') as HTMLElement | null;
        if (box && (!to || !box.contains(to))) {
            box.querySelector('.mhd__chart-cross')?.setAttribute('hidden', '');
            box.querySelector('.mhd__chart-dot')?.setAttribute('hidden', '');
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
        this._chartData = (this.data && this.data.total > 0)
            ? downsample((this.data.checks || []).filter(c => c.up && c.latency_ms != null), 150)
                .map(c => ({ t: parseMs(c.checked_at), v: c.latency_ms as number, at: c.checked_at }))
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
        this._drawChart();
        this._updateAgoLabel();
    }
}

if (!customElements.get('monitor-detail')) {
    customElements.define('monitor-detail', MonitorDetail);
}

export { MonitorDetail };
