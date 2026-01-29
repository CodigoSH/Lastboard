
import { i18n } from '../../services/i18n';
import { dashboardStore } from '../../store/dashboardStore';

class TelemetryWidget extends HTMLElement {
    private cpuBar: HTMLElement | null = null;
    private ramBar: HTMLElement | null = null;
    private tempBar: HTMLElement | null = null;

    private cpuText: HTMLElement | null = null;
    private ramText: HTMLElement | null = null;
    private tempText: HTMLElement | null = null;
    private _unsubscribe: (() => void) | undefined;
    private _unsubscribeI18n: (() => void) | undefined;

    private _itemId: number = 0;
    private _interval: number = 1000;
    private lastUpdate: number = 0;

    static get observedAttributes() {
        return ['item-id', 'content'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'item-id') this._itemId = parseInt(newValue);
        if (name === 'content') {
            try {
                const data = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
                if (data && data.interval) {
                    this._interval = parseInt(data.interval);
                }
            } catch (e) { }
        }
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this._unsubscribe = dashboardStore.subscribe((state) => {
            // Check for config updates
            if (this._itemId) {
                const item = state.items.find((i: any) => i.id === this._itemId);
                if (item && item.content) {
                    try {
                        const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                        if (content.interval && content.interval !== this._interval) {
                            this._interval = parseInt(content.interval);
                        }
                    } catch (e) { }
                }
            }

            if (state.stats) {
                this.update(state.stats);
            }
        });

        // i18n Subscription
        this._unsubscribeI18n = i18n.subscribe(() => {
            this.render();
            // Re-apply latest stats if available
            const state = dashboardStore.getState();
            if (state.stats) this.update(state.stats);
        });
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    update(data: any) {
        if (!this.shadowRoot) return;

        // console.log('[TelemetryWidget] Updating with:', data); 

        // CPU
        const cpu = Math.round(data.cpu_usage || 0);
        if (this.cpuBar) this.cpuBar.style.strokeDasharray = `${cpu}, 100`;
        if (this.cpuText) this.cpuText.textContent = `${cpu}%`;

        // RAM
        const ram = Math.round(data.ram_usage || 0);
        if (this.ramBar) this.ramBar.style.strokeDasharray = `${ram}, 100`;
        if (this.ramText) this.ramText.textContent = `${ram}%`;

        // Temp
        const temp = Math.round(data.temperature || 0);
        // Map temp 0-100 to stroke (as per user request: scale 0-100C)
        const displayTemp = Math.min(100, Math.max(0, temp));

        if (this.tempBar) {
            this.tempBar.style.strokeDasharray = `${displayTemp}, 100`;
        }
        if (this.tempText) {
            this.tempText.textContent = `${temp}°C`;
        }
    }

    render() {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    width: 100%;
                    height: 100%;
                    background: rgba(40, 44, 52, 0.4);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-sizing: border-box;
                    padding: 12px;
                    color: white;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                :host(:hover) {
                    background: rgba(40, 44, 52, 0.5);
                    border-color: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
                .gauge-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                }
                .wrapper {
                    position: relative;
                    width: 64px;
                    height: 64px;
                }
                .circular-chart {
                    width: 100%;
                    height: 100%;
                    display: block;
                    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.2));
                }
                .circle-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.05);
                    stroke-width: 3;
                }
                .circle {
                    fill: none;
                    stroke-width: 3;
                    stroke-linecap: round;
                    transition: stroke-dasharray 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .cpu-bar { stroke: url(#grad-cpu); }
                .ram-bar { stroke: url(#grad-ram); }
                .temp-bar { stroke: url(#grad-temp); }

                .value-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 13px;
                    font-weight: 800;
                    text-align: center;
                    text-shadow: 0 4px 8px rgba(0,0,0,0.5);
                    user-select: none;
                }
                .sub {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                }
            </style>

            <svg style="width:0;height:0;position:absolute;">
                <defs>
                    <linearGradient id="grad-cpu" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#00f2fe" />
                        <stop offset="100%" stop-color="#4facfe" />
                    </linearGradient>
                    <linearGradient id="grad-ram" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f093fb" />
                        <stop offset="100%" stop-color="#f5576c" />
                    </linearGradient>
                    <linearGradient id="grad-temp" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#2196f3" /> <!-- Blue -->
                        <stop offset="50%" stop-color="#ffeb3b" /> <!-- Yellow -->
                        <stop offset="100%" stop-color="#f44336" /> <!-- Red -->
                    </linearGradient>
                </defs>
            </svg>

            <!-- CPU -->
            <div class="gauge-container">
                <div class="wrapper">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle cpu-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="value-overlay cpu-text">0%</div>
                </div>
                <div class="sub">${i18n.t('widget.telemetry.cpu')}</div>
            </div>

            <!-- RAM -->
            <div class="gauge-container">
                <div class="wrapper">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle ram-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="value-overlay ram-text">0%</div>
                </div>
                <div class="sub">${i18n.t('widget.telemetry.ram')}</div>
            </div>

            <!-- TEMP -->
            <div class="gauge-container">
                <div class="wrapper">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle temp-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="value-overlay temp-text">0°C</div>
                </div>
                <div class="sub">${i18n.t('widget.telemetry.temp')}</div>
            </div>
        `;

        this.cpuBar = this.shadowRoot.querySelector('.cpu-bar');
        this.ramBar = this.shadowRoot.querySelector('.ram-bar');
        this.tempBar = this.shadowRoot.querySelector('.temp-bar');
        this.cpuText = this.shadowRoot.querySelector('.cpu-text');
        this.ramText = this.shadowRoot.querySelector('.ram-text');
        this.tempText = this.shadowRoot.querySelector('.temp-text');
    }
}

customElements.define('widget-telemetry', TelemetryWidget);
