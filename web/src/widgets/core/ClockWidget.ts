
import { i18n } from '../../services/i18n';
import { dashboardStore } from '../../store/dashboardStore';

class ClockWidget extends HTMLElement {
    private timer: any;
    private timeEl: HTMLElement | null = null;
    private dateEl: HTMLElement | null = null;
    private _unsubscribe: (() => void) | null = null;
    private _unsubscribeI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }


    private isEditing: boolean = false;
    private configMode: boolean = false;
    private _config: { timezone: string, hour12: boolean, showDate: boolean } = { timezone: 'local', hour12: false, showDate: true };
    private _itemId: number = 0;

    static get observedAttributes() {
        return ['item-id', 'content', 'mode'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'item-id') this._itemId = parseInt(newValue);
        if (name === 'content') {
            try {
                const data = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
                if (data && typeof data === 'object') {
                    // Merge defaults
                    this._config = { ...this._config, ...data };
                    this.updateTime();
                }
            } catch (e) { }
        }
    }

    connectedCallback() {
        this.render();
        this.updateTime();

        // 1. Time Update Interval
        this.timer = setInterval(() => {
            this.updateTime();
        }, 1000);

        // 2. Store Subscription (Reactivity)
        this._unsubscribe = dashboardStore.subscribe((state) => {
            // Edit Mode Sync
            if (this.isEditing !== state.isEditing) {
                this.isEditing = state.isEditing;
                this.render();
            }

            // Content Sync
            if (this._itemId) {
                const item = state.items.find(i => i.id === this._itemId);
                if (item && item.content) {
                    try {
                        const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                        if (data.widgetId === 'clock') {
                            this._config = { ...this._config, ...data };
                            // Force immediate update of display
                            this.updateTime();
                        }
                    } catch (e) { }
                }
            }
        });

        // 3. i18n Subscription
        this._unsubscribeI18n = i18n.subscribe(() => {
            this.updateTime();
        });
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
        if (this.timer) clearInterval(this.timer);
    }

    updateTime() {
        if (!this.timeEl || !this.dateEl) return;
        const now = new Date();

        // Time Options
        const opts: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: this._config.hour12
        };

        let timeZone = undefined;
        if (this._config.timezone && this._config.timezone !== 'local') {
            timeZone = this._config.timezone;
        }

        // Use current locale for proper localization
        const currentLocale = i18n.getLocale().code;

        try {
            const formatter = new Intl.DateTimeFormat(currentLocale, {
                ...opts,
                timeZone
            });

            const parts = formatter.formatToParts(now);

            const timeHTML = parts.map(p => {
                if (p.type === 'dayPeriod') {
                    // Clean up just in case (uppercase, remove dots)
                    const val = p.value.toUpperCase().replace(/\./g, '').trim();
                    return `<span class="ampm">${val}</span>`;
                }
                return p.value;
            }).join('');

            this.timeEl.innerHTML = timeHTML;

        } catch (e) {
            // Fallback
            this.timeEl.textContent = now.toLocaleTimeString();
        }

        // Date Logic (Keep existing, but ensure timezone)
        if (this._config.showDate) {
            const dateOpts: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone
            };
            this.dateEl.textContent = now.toLocaleDateString(currentLocale, dateOpts);
            this.dateEl.style.display = 'block';
        } else {
            this.dateEl.style.display = 'none';
        }
    }

    render() {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    background: var(--surface);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    
                    color: var(--text-main);
                    border-radius: var(--radius);
                    box-sizing: border-box;
                    padding: 8%; /* Percentage padding */
                    user-select: none;
                    position: relative;
                    container-type: inline-size; /* Enable CQ */
                }
                .time {
                    font-size: clamp(1.5rem, 22cqi, 5rem); /* Proportional scaling */
                    font-weight: 700;
                    letter-spacing: -0.05em;
                    line-height: 1;
                    font-variant-numeric: tabular-nums;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    white-space: nowrap;
                }
                .date {
                    font-size: clamp(0.6rem, 7cqi, 1.4rem); /* Proportional scaling */
                    color: var(--text-dim);
                    margin-top: 4%;
                    font-weight: 500;
                    white-space: nowrap;
                }
            </style>
            
            <div class="time">--:--:--</div>
            <div class="date">-- --</div>
        `;

        this.timeEl = this.shadowRoot.querySelector('.time');
        this.dateEl = this.shadowRoot.querySelector('.date');
    }
}

customElements.define('widget-clock', ClockWidget);
