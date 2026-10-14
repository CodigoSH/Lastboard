
import { i18n } from '../../services/i18n';
import { dashboardStore } from '../../store/dashboardStore';
import { userStore } from '../../store/userStore';
import { DEFAULT_TELEMETRY_INTERVAL, telemetryInterval } from './telemetryInterval';
import { EMPTY_VIEW, RemoteView, nextRemoteView, remoteErrorKey, remoteSignature, serverLink, telemetrySource } from './remoteTelemetry';
import { fetchRemoteStats } from '../../services/remoteStats';
import { whenVisible } from '../../services/whenVisible';

// ── Thresholds ─────────────────────────────────────────────────────────────────

function percentState(v: number): 'ok' | 'warn' | 'crit' {
    if (v > 80) return 'crit';
    if (v > 60) return 'warn';
    return 'ok';
}

function tempState(c: number): 'ok' | 'warn' | 'crit' {
    if (c > 70) return 'crit';
    if (c > 50) return 'warn';
    return 'ok';
}

// ── Widget ─────────────────────────────────────────────────────────────────────

class TelemetryWidget extends HTMLElement {
    private _unsubscribe: (() => void) | undefined;
    private _unsubscribeI18n: (() => void) | undefined;
    private _unsubscribeUser: (() => void) | undefined;

    private _itemId: number = 0;
    private _interval: number = DEFAULT_TELEMETRY_INTERVAL;
    private _metrics: string[] = ['cpu', 'ram', 'temp'];
    private _unit: string = 'metric';

    // Another server instead of this one. The numbers come from the server by
    // widget id; the address and the password never reach this file.
    private _remote = false;
    private _remoteSig = '';
    private _link: string | null = null;
    private _view: RemoteView = EMPTY_VIEW;
    private _timer: number | undefined;
    private _polling = false;

    private lastUpdate: number = 0;
    private lastKnownStats = { cpu_usage: 0, ram_usage: 0, temperature: 0 };
    private _lastRendered = { cpu: -1, ram: -1, temp: -1 };

    static get observedAttributes() { return ['item-id', 'content']; }

    attributeChangedCallback(name: string, _old: string, newValue: string) {
        if (name === 'item-id') {
            this._itemId = parseInt(newValue);
            if (this.isConnected) this.startPolling();
        }
        if (name === 'content') {
            try {
                const d = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
                if (d?.interval) this._interval = telemetryInterval(d.interval);
                if (Array.isArray(d?.metrics) && d.metrics.length > 0) {
                    this._metrics = d.metrics;
                }
                this.readRemote(d);
            } catch (_) { }
        }
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
        this.addEventListener('click', this.onClick);
        this.render();

        if (this._unsubscribe) return;

        this._unsubscribeUser = userStore.subscribe(user => {
            const newUnit = user?.preferences?.unit_system || 'metric';
            if (newUnit !== this._unit) {
                this._unit = newUnit;
                this.render();
            }
        });

        this._unsubscribe = dashboardStore.subscribe((state) => {
            if (this._itemId) {
                const item = (Array.isArray(state.items) ? state.items : [])
                    .find((i) => i.id === this._itemId);
                if (item?.content) {
                    try {
                        const c = typeof item.content === 'string'
                            ? JSON.parse(item.content) : item.content;
                        let renderNeeded = this.readRemote(c);
                        if (c.interval && telemetryInterval(c.interval) !== this._interval) {
                            this._interval = telemetryInterval(c.interval);
                            if (this._remote) { this.stopPolling(); this.startPolling(); }
                        }
                        if (Array.isArray(c.metrics) && c.metrics.length > 0) {
                            const next = c.metrics.join(',');
                            if (next !== this._metrics.join(',')) {
                                this._metrics = c.metrics;
                                renderNeeded = true;
                            }
                        }
                        if (renderNeeded) {
                            this.render();
                            return;
                        }
                    } catch (_) { }
                }
            }
            if (!this._remote && state.stats) this.update(state.stats);
        });

        this.startPolling();

        if (!this._unsubscribeI18n) {
            this._unsubscribeI18n = i18n.subscribe(() => {
                this.render();
                const s = dashboardStore.getState();
                if (!this._remote && s.stats) this.update(s.stats);
            });
        }
    }

    disconnectedCallback() {
        this.removeEventListener('click', this.onClick);
        this.stopPolling();
        this._unsubscribe?.();
        this._unsubscribeI18n?.();
        this._unsubscribeUser?.();
        this._unsubscribe = undefined;
    }

    // ── Another server ──────────────────────────────────────────────────────

    /** Takes the remote settings out of the content. True when the widget must be drawn again. */
    private readRemote(c: any): boolean {
        const remote = telemetrySource(c?.source) !== 'local';
        const sig = remote ? remoteSignature(c) : '';
        const link = remote ? serverLink(c) : null;
        const changed = remote !== this._remote || sig !== this._remoteSig || link !== this._link;
        this._remote = remote;
        this._remoteSig = sig;
        this._link = link;
        if (changed) {
            this._view = EMPTY_VIEW;
            this.stopPolling();
            if (this.isConnected) this.startPolling();
        }
        return changed;
    }

    private startPolling() {
        if (!this._remote || !this._itemId || this._timer !== undefined) return;
        const tick = async () => {
            if (this._polling) return;
            this._polling = true;
            const id = this._itemId;
            try {
                const reply = await fetchRemoteStats(id);
                if (this._remote && id === this._itemId) this.showRemote(nextRemoteView(this._view, reply));
            } catch (_) {
                if (this._remote) this.showRemote(nextRemoteView(this._view, { ok: false, error: 'unreachable' }));
            } finally {
                this._polling = false;
            }
        };
        void tick();
        this._timer = window.setInterval(whenVisible(tick), this._interval);
    }

    private stopPolling() {
        if (this._timer !== undefined) window.clearInterval(this._timer);
        this._timer = undefined;
    }

    private showRemote(view: RemoteView) {
        this._view = view;
        const root = this.shadowRoot;
        if (!root) return;
        const reason = view.offline ? i18n.t(remoteErrorKey(view.error)) : '';
        const apply = (key: string, value: number | null, state: (v: number) => 'ok' | 'warn' | 'crit', text: (v: number) => string, missing: string) => {
            const wrap = root.querySelector(`.gauge-wrap[data-key="${key}"]`) as HTMLElement | null;
            if (!wrap) return;
            const val = wrap.querySelector('.value-text') as SVGTextElement | null;
            const circle = wrap.querySelector('.circle') as SVGPathElement | null;
            if (value === null) {
                if (val) val.textContent = '—';
                if (circle) circle.style.strokeDasharray = '0, 100';
                wrap.dataset.state = 'none';
                wrap.title = view.offline ? reason : missing;
                return;
            }
            const r = Math.round(value);
            if (val) val.textContent = text(r);
            if (circle) circle.style.strokeDasharray = `${Math.min(100, Math.max(0, r))}, 100`;
            wrap.dataset.state = state(r);
            wrap.title = '';
        };
        const none = i18n.t('widget.telemetry.remote.no_metric');
        if (this._metrics.includes('cpu')) apply('cpu', view.cpu, percentState, v => `${v}%`, none);
        if (this._metrics.includes('ram')) apply('ram', view.ram, percentState, v => `${v}%`, none);
        if (this._metrics.includes('temp')) {
            const imperial = this._unit === 'imperial';
            apply('temp', view.temp, tempState, v => imperial ? `${Math.round(v * 9 / 5 + 32)}°F` : `${v}°C`, i18n.t('widget.telemetry.remote.no_sensor'));
        }
        this.toggleAttribute('data-offline', view.offline);
    }

    // ── Update ──────────────────────────────────────────────────────────────

    update(data: any) {
        if (!this.shadowRoot) return;

        const now = Date.now();
        if (now - this.lastUpdate < (this._interval - 100)) return;
        this.lastUpdate = now;

        if (typeof data.cpu_usage === 'number') this.lastKnownStats.cpu_usage = data.cpu_usage;
        if (typeof data.ram_usage === 'number') this.lastKnownStats.ram_usage = data.ram_usage;
        if (typeof data.temperature === 'number') this.lastKnownStats.temperature = data.temperature;

        const cpu = Math.min(100, Math.max(0, Math.round(
            typeof data.cpu_usage === 'number' ? data.cpu_usage : this.lastKnownStats.cpu_usage)));
        const ram = Math.min(100, Math.max(0, Math.round(
            typeof data.ram_usage === 'number' ? data.ram_usage : this.lastKnownStats.ram_usage)));
        const temp = Math.round(
            typeof data.temperature === 'number' ? data.temperature : this.lastKnownStats.temperature);

        if (this._lastRendered.cpu === cpu &&
            this._lastRendered.ram === ram &&
            this._lastRendered.temp === temp) return;
        this._lastRendered = { cpu, ram, temp };

        requestAnimationFrame(() => {
            const root = this.shadowRoot!;

            const apply = (key: string, text: string, state: 'ok' | 'warn' | 'crit', pct: number) => {
                const wrap = root.querySelector(`.gauge-wrap[data-key="${key}"]`) as HTMLElement;
                if (!wrap) return;

                const valEl = wrap.querySelector('.value-text') as SVGTextElement;
                const circleEl = wrap.querySelector('.circle') as SVGPathElement;

                if (valEl) valEl.textContent = text;
                if (circleEl) circleEl.style.strokeDasharray = `${pct}, 100`;
                wrap.dataset.state = state;
            };

            if (this._metrics.includes('cpu')) apply('cpu', `${cpu}%`, percentState(cpu), cpu);
            if (this._metrics.includes('ram')) apply('ram', `${ram}%`, percentState(ram), ram);
            
            if (this._metrics.includes('temp')) {
                let displayTemp = temp;
                let unitStr = '°C';
                if (this._unit === 'imperial') {
                    displayTemp = Math.round(temp * 9 / 5 + 32);
                    unitStr = '°F';
                }
                apply('temp', `${displayTemp}${unitStr}`, tempState(temp), Math.min(100, Math.max(0, temp)));
            }
        });
    }

    // ── Render ───────────────────────────────────────────────────────────────

    private buildCard(key: string, label: string, initVal: string): string {
        return `
        <div class="gauge-wrap" data-key="${key}" data-state="ok">
            <svg class="gauge-svg" viewBox="0 0 60 72" preserveAspectRatio="xMidYMid meet">
                <defs>
                   <linearGradient id="grad-${key}" x1="0%" y1="100%" x2="100%" y2="0%">
                       <stop class="stop-start" offset="0%" />
                       <stop class="stop-end" offset="100%" />
                   </linearGradient>
                </defs>
                <path class="circle-bg" d="M30 8 a 22 22 0 0 1 0 44 a 22 22 0 0 1 0 -44" pathLength="100"/>
                <path class="circle ${key}-bar" d="M30 8 a 22 22 0 0 1 0 44 a 22 22 0 0 1 0 -44" pathLength="100" stroke-dasharray="0, 100"/>
                <text class="value-text ${key}-text" x="30" y="32">${initVal}</text>
                <text class="label-text" x="30" y="62">${label}</text>
            </svg>
        </div>`;
    }

    render() {
        if (!this.shadowRoot) return;

        const metrics = this._metrics.length > 0 ? this._metrics : ['cpu', 'ram', 'temp'];

        const cards = metrics.map(m => {
            if (m === 'cpu') return this.buildCard('cpu', i18n.t('widget.telemetry.cpu'), '—');
            if (m === 'ram') return this.buildCard('ram', i18n.t('widget.telemetry.ram'), '—');
            if (m === 'temp') return this.buildCard('temp', i18n.t('widget.telemetry.temp'), '—');
            return '';
        }).join('');

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: flex !important;
                flex-direction: row !important;
                align-items: stretch !important;
                align-items: stretch !important;
                padding: 0 !important;
                gap: 4px;
                overflow: hidden;
                width: 100% !important;
                height: 100% !important;
                box-sizing: border-box;
                color: var(--text-main);
                font-family: var(--font-sans);
            }

            .gauge-wrap {
                flex: 1 1 0;
                min-width: 0;
                min-height: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
                transition: transform 0.2s var(--ease-bounce);
            }
            
            .gauge-svg {
                width: 100%;
                height: 100%;
                display: block;
            }

            .circle-bg {
                fill: none;
                stroke: var(--surface-hover, rgba(255, 255, 255, 0.05));
                stroke-width: 4;
            }

            .circle {
                fill: none;
                stroke: url(#grad-cpu); /* We override this below */
                stroke-width: 4;
                stroke-linecap: round;
                transition: stroke-dasharray 0.6s var(--ease-out), stroke 0.2s;
            }

            .value-text {
                font-family: var(--font-mono);
                font-size: 12px;
                font-weight: 700;
                fill: var(--text-main);
                text-anchor: middle;
                dominant-baseline: central;
            }

            .label-text {
                font-family: var(--font-sans);
                font-size: 8px;
                font-weight: 600;
                fill: var(--text-dim);
                text-anchor: middle;
                letter-spacing: 1px;
                text-transform: uppercase;
                opacity: 0.8;
                dominant-baseline: central;
            }

            /* State styles for SVG */
            .gauge-wrap[data-state="ok"] { --gauge-color: var(--success-color); }
            .gauge-wrap[data-state="warn"] { --gauge-color: var(--warning-color); }
            .gauge-wrap[data-state="crit"] { --gauge-color: var(--danger-color); }
            .gauge-wrap[data-state="none"] .value-text { fill: var(--text-dim); }
            :host([data-offline]) .label-text { opacity: 0.45; }
            :host([data-link]) { cursor: pointer; }
            
            /* Apply current gauge color to the gradient stops and circle stroke fallback */
            .gauge-wrap .stop-start { stop-color: var(--gauge-color); }
            .gauge-wrap .stop-end { stop-color: var(--gauge-color); }
            .gauge-wrap .circle { stroke: var(--gauge-color); } /* Simple solid color fallback / override */

        </style>
        ${cards}`;

        this._lastRendered = { cpu: -1, ram: -1, temp: -1 };
        this.lastUpdate = 0;

        this.toggleAttribute('data-link', !!this._link);
        if (!this._remote) this.removeAttribute('data-offline');
        if (this._remote) {
            this.showRemote(this._view);
            return;
        }
        const state = dashboardStore.getState();
        if (state.stats) this.update(state.stats);
    }

    /** A click opens the server's own page, except while the board is being edited. */
    private onClick = () => {
        if (!this._remote || !this._link || dashboardStore.getState().isEditing) return;
        window.open(this._link, '_blank', 'noopener,noreferrer');
    };
}

customElements.define('widget-telemetry', TelemetryWidget);
