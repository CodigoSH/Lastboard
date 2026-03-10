
import { i18n } from '../../services/i18n';
import { dashboardStore } from '../../store/dashboardStore';
import { userStore } from '../../store/userStore';

// ── Icons (Lucide — stroke-width 1.5, round caps, matching project) ────────────

const ICONS: Record<string, string> = {
    cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <line x1="9"  y1="1"  x2="9"  y2="4"/>
        <line x1="15" y1="1"  x2="15" y2="4"/>
        <line x1="9"  y1="20" x2="9"  y2="23"/>
        <line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9"  x2="23" y2="9"/>
        <line x1="20" y1="15" x2="23" y2="15"/>
        <line x1="1"  y1="9"  x2="4"  y2="9"/>
        <line x1="1"  y1="15" x2="4"  y2="15"/>
    </svg>`,

    ram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="10" rx="1"/>
        <line x1="6"  y1="17" x2="6"  y2="20"/>
        <line x1="10" y1="17" x2="10" y2="20"/>
        <line x1="14" y1="17" x2="14" y2="20"/>
        <line x1="18" y1="17" x2="18" y2="20"/>
        <line x1="5"  y1="10" x2="5"  y2="14"/>
        <line x1="9"  y1="10" x2="9"  y2="14"/>
        <line x1="13" y1="10" x2="13"  y2="14"/>
    </svg>`,

    temp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
    </svg>`,
};

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
    private _interval: number = 5000;
    private _metrics: string[] = ['cpu', 'ram', 'temp'];
    private _unit: string = 'metric';

    private lastUpdate: number = 0;
    private lastKnownStats = { cpu_usage: 0, ram_usage: 0, temperature: 0 };
    private _lastRendered = { cpu: -1, ram: -1, temp: -1 };

    static get observedAttributes() { return ['item-id', 'content']; }

    attributeChangedCallback(name: string, _old: string, newValue: string) {
        if (name === 'item-id') {
            this._itemId = parseInt(newValue);
        }
        if (name === 'content') {
            try {
                const d = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
                if (d?.interval) this._interval = parseInt(d.interval);
                if (Array.isArray(d?.metrics) && d.metrics.length > 0) {
                    this._metrics = d.metrics;
                }
            } catch (_) { }
        }
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
        this.render();

        if (this._unsubscribe) return;

        this._unsubscribeUser = userStore.subscribe(user => {
            const newUnit = user?.preferences?.unit_system || 'metric';
            if (newUnit !== this._unit) {
                this._unit = newUnit;
                this.render();
            }
        });

        this._unsubscribe = dashboardStore.subscribe((state: any) => {
            if (this._itemId) {
                const item = (Array.isArray(state.items) ? state.items : [])
                    .find((i: any) => i.id === this._itemId);
                if (item?.content) {
                    try {
                        const c = typeof item.content === 'string'
                            ? JSON.parse(item.content) : item.content;
                        let renderNeeded = false;
                        if (c.interval && c.interval !== this._interval) {
                            this._interval = parseInt(c.interval);
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
            if (state.stats) this.update(state.stats);
        });

        if (!this._unsubscribeI18n) {
            this._unsubscribeI18n = i18n.subscribe(() => {
                this.render();
                const s = dashboardStore.getState();
                if (s.stats) this.update(s.stats);
            });
        }
    }

    disconnectedCallback() {
        this._unsubscribe?.();
        this._unsubscribeI18n?.();
        this._unsubscribeUser?.();
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
                padding: 6px !important;
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
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            .gauge-wrap:hover {
                transform: scale(1.05);
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
                transition: stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.2s;
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
            
            /* Apply current gauge color to the gradient stops and circle stroke fallback */
            .gauge-wrap .stop-start { stop-color: var(--gauge-color); }
            .gauge-wrap .stop-end { stop-color: var(--gauge-color); }
            .gauge-wrap .circle { stroke: var(--gauge-color); } /* Simple solid color fallback / override */

        </style>
        ${cards}`;

        this._lastRendered = { cpu: -1, ram: -1, temp: -1 };
        this.lastUpdate = 0;

        const state = dashboardStore.getState();
        if (state.stats) this.update(state.stats);
    }
}

customElements.define('widget-telemetry', TelemetryWidget);
