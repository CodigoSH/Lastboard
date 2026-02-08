
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
        if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
        if (!this.cpuBar) this.render(); // Ensure elements exist

        // Prevent multiple subscriptions
        if (this._unsubscribe) return;

        this._unsubscribe = dashboardStore.subscribe((state) => {
            // Check for config updates
            if (this._itemId) {
                const items = Array.isArray(state.items) ? state.items : [];
                const item = items.find((i: any) => i.id === this._itemId);
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
        if (!this._unsubscribeI18n) {
            this._unsubscribeI18n = i18n.subscribe(() => {
                this.render();
                // Re-apply latest stats if available
                const state = dashboardStore.getState();
                if (state.stats) this.update(state.stats);
            });
        }
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    private lastKnownStats: any = { cpu_usage: 0, ram_usage: 0, temperature: 0 };

    update(data: any) {
        if (!this.shadowRoot) return;

        // Throttle check
        const now = Date.now();
        // Allow for small jitter (100ms grace) if the user selected 1s and backend sends 1s
        const jitter = 100;
        if (now - this.lastUpdate < (this._interval - jitter)) {
            return;
        }
        this.lastUpdate = now;

        // Fallback to last known if data is partial or missing, but update last known if data is valid
        // Check if data has actual numeric values (0 is valid)
        if (typeof data.cpu_usage === 'number') this.lastKnownStats.cpu_usage = data.cpu_usage;
        if (typeof data.ram_usage === 'number') this.lastKnownStats.ram_usage = data.ram_usage;
        if (typeof data.temperature === 'number') this.lastKnownStats.temperature = data.temperature;

        // Use current data if valid, else last known
        const cpuVal = typeof data.cpu_usage === 'number' ? data.cpu_usage : this.lastKnownStats.cpu_usage;
        const ramVal = typeof data.ram_usage === 'number' ? data.ram_usage : this.lastKnownStats.ram_usage;
        const tempVal = typeof data.temperature === 'number' ? data.temperature : this.lastKnownStats.temperature;

        // Force visual update in next frame to ensure DOM is ready
        requestAnimationFrame(() => {
            // CPU
            const cpu = Math.min(100, Math.max(0, Math.round(cpuVal)));
            if (this.cpuBar) {
                this.cpuBar.style.strokeDasharray = `${cpu}, 100`;
            }
            if (this.cpuText) this.cpuText.textContent = `${cpu}%`;

            // RAM
            const ram = Math.min(100, Math.max(0, Math.round(ramVal)));
            if (this.ramBar) this.ramBar.style.strokeDasharray = `${ram}, 100`;
            if (this.ramText) this.ramText.textContent = `${ram}%`;

            // Temp
            const temp = Math.round(tempVal);
            const displayTemp = Math.min(100, Math.max(0, temp));

            if (this.tempBar) {
                this.tempBar.style.strokeDasharray = `${displayTemp}, 100`;
            }
            if (this.tempText) {
                this.tempText.textContent = `${temp}°C`;
            }
        });
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
                    background: var(--surface);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    box-sizing: border-box;
                    padding: 4%; /* Proportional padding */
                    color: var(--text-main);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    container-type: inline-size; /* Enable CQ */
                }
                /* Combined with container hover, we don't need specific host hover */
                .gauge-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8%;
                    flex: 1;
                    height: 100%; /* Ensure full height usage */
                }
                .wrapper {
                    position: relative;
                    width: 70%;  /* Relative to gauge-container */
                    height: auto;
                    aspect-ratio: 1/1; /* Square */
                    max-height: 80%; /* Don't overflow */
                }
                .circular-chart {
                    width: 100%;
                    height: 100%;
                    display: block;
                    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.2));
                }
                .circle-bg {
                    fill: none;
                    stroke: var(--border-bright);
                    stroke-width: 3;
                }
                .circle {
                    fill: none;
                    stroke-width: 3;
                    stroke-linecap: round;
                    transition: stroke-dasharray 0.5s ease-in-out, stroke 0.5s ease;
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
                    font-size: clamp(10px, 3.5cqi, 16px); /* Proportional Font */
                    font-weight: 800;
                    text-align: center;
                    text-shadow: 0 4px 8px rgba(0,0,0,0.5);
                    user-select: none;
                }
                .sub {
                    font-size: clamp(8px, 2.5cqi, 12px); /* Proportional Font */
                    color: var(--text-dim);
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
