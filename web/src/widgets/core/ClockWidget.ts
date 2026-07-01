
import { i18n } from '../../services/i18n';
import { dashboardStore } from '../../store/dashboardStore';

class ClockWidget extends HTMLElement {
    private timer?: ReturnType<typeof setInterval>;
    private timeEl: HTMLElement | null = null;
    private dateEl: HTMLElement | null = null;
    private cityEl: HTMLElement | null = null;
    private _unsubscribe: (() => void) | null = null;
    private _unsubscribeI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }


    private isEditing: boolean = false;
    private _config: { timezone: string, hour12: boolean, showDate: boolean, showCity: boolean, city: string, showSeconds: boolean } = { timezone: 'local', hour12: false, showDate: true, showCity: true, city: '', showSeconds: false };
    private _itemId: number = 0;

    static get observedAttributes() {
        return ['item-id', 'content', 'mode'];
    }

    attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
        if (name === 'item-id') {
            this._itemId = parseInt(newValue);
            this.syncFromStore();
        }
        if (name === 'content') {
            try {
                const data = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
                if (data && typeof data === 'object') {
                    this._config = { ...this._config, ...data };
                    this.updateTime();
                }
            } catch (e) { }
        }
    }

    private _lastState: any = null;

    private syncFromStore() {
        if (!this._itemId) return;
        const state = dashboardStore.getState();
        if (this._lastState && this._lastState === state) return;
        this._lastState = state;
        const item = state.items.find(i => i.id === this._itemId);
        if (item && item.content) {
            try {
                const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                if (data.widgetId === 'clock') {
                    this._config = { ...this._config, ...data };
                    this.updateTime();
                }
            } catch (e) { }
        }
    }

    connectedCallback() {
        this.render();
        this.updateTime();

        this.timer = setInterval(() => {
            this.updateTime();
        }, 1000);

        if (this._itemId) {
            this.syncFromStore();
        }

        this._unsubscribe = dashboardStore.subscribe((state) => {
            if (this.isEditing !== state.isEditing) {
                this.isEditing = state.isEditing;
                this.render();
            }
            this.syncFromStore();
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

    private _lastTimeHTML = '';
    private _lastDateStr = '';

    updateTime() {
        if (!this.timeEl || !this.dateEl || !this.cityEl) return;
        const now = new Date();

        // Time Options
        const opts: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: this._config.hour12
        };

        if (this._config.showSeconds !== false) {
            opts.second = '2-digit';
        }

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

            if (this._lastTimeHTML !== timeHTML) {
                this.timeEl.innerHTML = timeHTML;
                this._lastTimeHTML = timeHTML;
            }

        } catch (e) {
            // Fallback
            const fallback = now.toLocaleTimeString();
            if (this._lastTimeHTML !== fallback) {
                this.timeEl.textContent = fallback;
                this._lastTimeHTML = fallback;
            }
        }

        // Date Logic (Keep existing, but ensure timezone)
        if (this._config.showDate) {
            const dateOpts: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone
            };
            const dateStr = now.toLocaleDateString(currentLocale, dateOpts);
            if (this._lastDateStr !== dateStr) {
                this.dateEl.textContent = dateStr;
                this._lastDateStr = dateStr;
            }
            this.dateEl.style.display = 'block';
        } else {
            this.dateEl.style.display = 'none';
        }

        if (!this.shadowRoot) return;
        const contentEl = this.shadowRoot.querySelector('#clock-content') as HTMLElement;
        const emptyEl = this.shadowRoot.querySelector('#empty-state') as HTMLElement;

        // Blank State Logic
        if (!this._config.city) {
            if (contentEl) contentEl.style.display = 'none';
            if (emptyEl) {
                emptyEl.style.display = 'flex';
                const emptyText = emptyEl.querySelector('.state-text');
                if (emptyText) emptyText.textContent = i18n.t('widget.clock.no_location') || 'Choose Location';
            }
            return;
        } else {
            if (contentEl) contentEl.style.display = 'flex';
            if (emptyEl) emptyEl.style.display = 'none';
        }

        // City Logic
        if (this._config.showCity !== false && this._config.city) {
            this.cityEl.textContent = this._config.city;
            this.cityEl.style.display = 'block';
            this.cityEl.style.marginBottom = '2%';
        } else {
            this.cityEl.style.display = 'none';
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
                    color: var(--text-main);
                    box-sizing: border-box;
                    padding: 8%; /* Percentage padding */
                    user-select: none;
                    position: relative;
                    container-type: inline-size; /* Enable CQ */
                }
                #clock-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%; height: 100%;
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
                .city {
                    font-size: clamp(0.6rem, 8cqi, 1.4rem);
                    color: var(--text-main);
                    font-weight: 600;
                    letter-spacing: -0.01em;
                    white-space: nowrap;
                    text-transform: capitalize;
                    text-align: center;
                }
                .state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; height:100%; width:100%; opacity:.5; }
                .state-icon { width:clamp(28px,18cqi,56px); height:clamp(28px,18cqi,56px); }
                .state-icon svg { width:100%; height:100%; }
                .state-text { font-size:clamp(.6rem,5cqi,.85rem); color:var(--text-dim); text-align:center; }
            </style>
            
            <div id="clock-content">
                <div class="city"></div>
                <div class="time">--:--:--</div>
                <div class="date">-- --</div>
            </div>
            
            <div id="empty-state" class="state" style="display: none;">
                <div class="state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>
                <span class="state-text"></span>
            </div>
        `;

        this.timeEl = this.shadowRoot.querySelector('.time');
        this.dateEl = this.shadowRoot.querySelector('.date');
        this.cityEl = this.shadowRoot.querySelector('.city');

        // Reset dirty check cache since the DOM was just wiped out
        this._lastTimeHTML = '';
        this._lastDateStr = '';
        this.updateTime();
    }
}

customElements.define('widget-clock', ClockWidget);
