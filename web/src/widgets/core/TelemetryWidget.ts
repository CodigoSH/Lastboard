
import { i18n } from '../../services/i18n';

class TelemetryWidget extends HTMLElement {
    private interval: any;
    private cpuBar: HTMLElement | null = null;
    private ramBar: HTMLElement | null = null;
    private tempBar: HTMLElement | null = null;
    private cpuText: HTMLElement | null = null;
    private ramText: HTMLElement | null = null;
    private tempText: HTMLElement | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.fetchStats();
        this.interval = setInterval(() => this.fetchStats(), 3000);
    }

    disconnectedCallback() {
        if (this.interval) clearInterval(this.interval);
    }

    async fetchStats() {
        try {
            const res = await fetch('/api/system/stats');
            if (res.ok) {
                const data = await res.json();
                this.update(data);
            }
        } catch (e) {
            console.error('Stats fetch failed', e);
        }
    }

    update(data: any) {
        if (!this.shadowRoot) return;

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
        const hasTemp = temp > 0;
        // Map temp 0-100 to stroke
        const displayTemp = Math.min(100, Math.max(0, temp));

        if (this.tempBar) {
            this.tempBar.style.strokeDasharray = `${hasTemp ? displayTemp : 0}, 100`;
        }
        if (this.tempText) {
            this.tempText.textContent = hasTemp ? `${temp}°C` : 'N/A';
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
                    background: rgba(30, 30, 35, 0.5);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius);
                    box-sizing: border-box;
                    padding: 12px;
                    color: white;
                }
                .gauge-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    flex: 1;
                }
                .wrapper {
                    position: relative;
                    width: 54px;
                    height: 54px;
                }
                .circular-chart {
                    width: 100%;
                    height: 100%;
                    display: block;
                }
                .circle-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.05);
                    stroke-width: 3.5;
                }
                .circle {
                    fill: none;
                    stroke-width: 3.5;
                    stroke-linecap: round;
                    transition: stroke-dasharray 0.5s ease;
                }
                .cpu-bar { stroke: url(#grad-cpu); }
                .ram-bar { stroke: url(#grad-ram); }
                .temp-bar { stroke: url(#grad-temp); }

                .value-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-family: var(--font-mono, monospace);
                    font-size: 11px;
                    font-weight: 700;
                    text-align: center;
                }
                .sub {
                    font-size: 10px;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
            </style>

            <svg style="width:0;height:0;position:absolute;">
                <defs>
                    <linearGradient id="grad-cpu" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#4caf50" />
                        <stop offset="100%" stop-color="#ff9800" />
                    </linearGradient>
                    <linearGradient id="grad-ram" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#2196f3" />
                        <stop offset="100%" stop-color="#9c27b0" />
                    </linearGradient>
                    <linearGradient id="grad-temp" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#2196f3" />
                        <stop offset="50%" stop-color="#ffeb3b" />
                        <stop offset="100%" stop-color="#f44336" />
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
                <div class="sub">CPU</div>
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
                <div class="sub">RAM</div>
            </div>

            <!-- TEMP -->
            <div class="gauge-container">
                <div class="wrapper">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle temp-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="value-overlay temp-text">N/A</div>
                </div>
                <div class="sub">TEMP</div>
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
