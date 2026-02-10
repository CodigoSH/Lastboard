
import { i18n } from '../../services/i18n';
import { dashboardStore } from '../../store/dashboardStore';

// --- Cache ---
const weatherCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 min

// --- Types ---
interface WeatherConfig {
    widgetId: string;
    latitude: number;
    longitude: number;
    city: string;
    unit: 'celsius' | 'fahrenheit';
    showForecast: boolean;
    forecastDays: number;
}

const DEFAULT_CONFIG: WeatherConfig = {
    widgetId: 'weather',
    latitude: 0,
    longitude: 0,
    city: '',
    unit: 'celsius',
    showForecast: false,
    forecastDays: 5
};

// --- WMO Weather Code → SVG Icon ---
function getWeatherIcon(code: number): string {
    if (code === 0) {
        // Clear sky
        return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="32" cy="32" r="11"/>
            <line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/>
            <line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/>
            <line x1="13.6" y1="13.6" x2="19.3" y2="19.3"/><line x1="44.7" y1="44.7" x2="50.4" y2="50.4"/>
            <line x1="13.6" y1="50.4" x2="19.3" y2="44.7"/><line x1="44.7" y1="19.3" x2="50.4" y2="13.6"/>
        </svg>`;
    }
    if (code <= 2) {
        // Partly cloudy
        return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="24" cy="20" r="8"/>
            <line x1="24" y1="5" x2="24" y2="9"/><line x1="9" y1="20" x2="13" y2="20"/>
            <line x1="13.3" y1="9.3" x2="16.2" y2="12.2"/><line x1="34.7" y1="9.3" x2="31.8" y2="12.2"/>
            <line x1="13.3" y1="30.7" x2="16.2" y2="27.8"/>
            <path d="M22 46 Q22 38 30 38 Q30 30 40 30 Q50 30 50 38 Q56 38 56 44 Q56 50 50 50 L26 50 Q22 50 22 46Z"/>
        </svg>`;
    }
    if (code === 3) {
        // Overcast
        return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 42 Q14 34 22 34 Q22 24 34 24 Q46 24 46 34 Q54 34 54 42 Q54 48 46 48 L20 48 Q14 48 14 42Z"/>
            <path d="M10 36 Q10 30 16 30 Q16 24 24 24" opacity="0.35"/>
        </svg>`;
    }
    if (code === 45 || code === 48) {
        // Fog
        return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M16 30 Q16 22 24 22 Q24 14 36 14 Q48 14 48 22 Q54 22 54 30 Q54 36 48 36 L22 36 Q16 36 16 30Z"/>
            <line x1="14" y1="42" x2="50" y2="42" opacity="0.5"/>
            <line x1="18" y1="48" x2="46" y2="48" opacity="0.35"/>
            <line x1="22" y1="54" x2="42" y2="54" opacity="0.2"/>
        </svg>`;
    }
    if (code >= 51 && code <= 57) {
        // Drizzle
        return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 34 Q14 26 22 26 Q22 18 34 18 Q46 18 46 26 Q54 26 54 34 Q54 40 46 40 L20 40 Q14 40 14 34Z"/>
            <line x1="24" y1="46" x2="22" y2="52" opacity="0.6"/><line x1="34" y1="46" x2="32" y2="52" opacity="0.6"/>
            <line x1="44" y1="46" x2="42" y2="52" opacity="0.6"/>
        </svg>`;
    }
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
        // Rain
        return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 32 Q14 24 22 24 Q22 16 34 16 Q46 16 46 24 Q54 24 54 32 Q54 38 46 38 L20 38 Q14 38 14 32Z"/>
            <line x1="22" y1="44" x2="18" y2="54"/><line x1="32" y1="44" x2="28" y2="54"/>
            <line x1="42" y1="44" x2="38" y2="54"/><line x1="50" y1="44" x2="48" y2="50" opacity="0.5"/>
        </svg>`;
    }
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
        // Snow
        return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 32 Q14 24 22 24 Q22 16 34 16 Q46 16 46 24 Q54 24 54 32 Q54 38 46 38 L20 38 Q14 38 14 32Z"/>
            <circle cx="24" cy="48" r="2" fill="currentColor" stroke="none"/>
            <circle cx="34" cy="46" r="2" fill="currentColor" stroke="none"/>
            <circle cx="44" cy="50" r="2" fill="currentColor" stroke="none"/>
            <circle cx="30" cy="54" r="2" fill="currentColor" stroke="none"/>
        </svg>`;
    }
    if (code >= 95) {
        // Thunderstorm
        return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 30 Q14 22 22 22 Q22 14 34 14 Q46 14 46 22 Q54 22 54 30 Q54 36 46 36 L20 36 Q14 36 14 30Z"/>
            <polyline points="35,38 28,48 36,48 29,58" stroke-width="2.5"/>
        </svg>`;
    }
    // Fallback
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M14 40 Q14 32 22 32 Q22 22 34 22 Q46 22 46 32 Q54 32 54 40 Q54 46 46 46 L20 46 Q14 46 14 40Z"/>
    </svg>`;
}

// --- WMO Code → i18n description key ---
function getWeatherDescription(code: number): string {
    const map: Record<number, string> = {
        0: 'clear_sky', 1: 'mainly_clear', 2: 'partly_cloudy', 3: 'overcast',
        45: 'fog', 48: 'fog',
        51: 'light_drizzle', 53: 'drizzle', 55: 'heavy_drizzle',
        56: 'freezing_drizzle', 57: 'freezing_drizzle',
        61: 'light_rain', 63: 'rain', 65: 'heavy_rain',
        66: 'freezing_rain', 67: 'freezing_rain',
        71: 'light_snow', 73: 'snow', 75: 'heavy_snow', 77: 'snow_grains',
        80: 'light_showers', 81: 'showers', 82: 'heavy_showers',
        85: 'snow_showers', 86: 'heavy_snow_showers',
        95: 'thunderstorm', 96: 'thunderstorm_hail', 99: 'thunderstorm_hail'
    };
    return i18n.t(`widget.weather.${map[code] || 'unknown'}`);
}

function formatTemp(value: number, unit: 'celsius' | 'fahrenheit'): string {
    if (unit === 'fahrenheit') return `${Math.round(value * 9 / 5 + 32)}°F`;
    return `${Math.round(value)}°C`;
}

async function fetchWeatherData(lat: number, lon: number): Promise<any> {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,wind_speed_10m_max&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API error');
    const data = await res.json();
    weatherCache.set(key, { data, timestamp: Date.now() });
    return data;
}

// =============================================================
// WeatherWidget Custom Element
// =============================================================
class WeatherWidget extends HTMLElement {
    private _config: WeatherConfig = { ...DEFAULT_CONFIG };
    private _itemId: number = 0;
    private _unsubscribe: (() => void) | null = null;
    private _unsubscribeI18n: (() => void) | undefined;
    private _weatherData: any = null;
    private _refreshTimer: any = null;
    private _loading = false;
    private _error = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['item-id']; }

    attributeChangedCallback(name: string, _old: string, val: string) {
        if (name === 'item-id') this._itemId = parseInt(val);
    }

    connectedCallback() {
        this.render();
        this.loadWeather();

        this._refreshTimer = setInterval(() => this.loadWeather(), CACHE_DURATION);

        this._unsubscribe = dashboardStore.subscribe((state) => {
            if (!this._itemId) return;
            const item = state.items.find((i: any) => i.id === this._itemId);
            if (!item?.content) return;
            try {
                const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                if (data.widgetId !== 'weather') return;

                const oldLat = this._config.latitude;
                const oldLon = this._config.longitude;
                this._config = { ...DEFAULT_CONFIG, ...data };

                if (oldLat !== this._config.latitude || oldLon !== this._config.longitude) {
                    this.loadWeather();
                } else {
                    this.updateDisplay();
                }
            } catch (_) { }
        });

        this._unsubscribeI18n = i18n.subscribe(() => this.updateDisplay());
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
        if (this._refreshTimer) clearInterval(this._refreshTimer);
    }

    // ── Data ──
    private async loadWeather() {
        if (!this._config.latitude && !this._config.longitude) {
            this._loading = false;
            this._error = false;
            this.updateDisplay();
            return;
        }
        this._loading = true;
        this._error = false;
        this.updateDisplay();

        try {
            this._weatherData = await fetchWeatherData(this._config.latitude, this._config.longitude);
            this._loading = false;
        } catch (_) {
            this._loading = false;
            this._error = true;
        }
        this.updateDisplay();
    }

    // ── Render ──
    private updateDisplay() {
        const el = this.shadowRoot?.querySelector('.weather-body');
        if (!el) { this.render(); return; }

        // No location
        if (!this._config.latitude && !this._config.longitude) {
            el.innerHTML = this.emptyState(getWeatherIcon(0), i18n.t('widget.weather.no_location'));
            return;
        }
        // Loading
        if (this._loading) {
            el.innerHTML = this.emptyState(getWeatherIcon(3), i18n.t('general.loading'), true);
            return;
        }
        // Error
        if (this._error || !this._weatherData) {
            el.innerHTML = this.emptyState(getWeatherIcon(-1), i18n.t('general.error'));
            return;
        }

        const cur = this._weatherData.current_weather;
        const daily = this._weatherData.daily;
        const u = this._config.unit || 'celsius';

        if (this._config.showForecast && daily) {
            el.innerHTML = this.forecastView(cur, daily, u);
        } else {
            el.innerHTML = this.simpleView(cur, daily, u);
        }
    }

    private emptyState(icon: string, text: string, loading = false): string {
        return `<div class="state"><div class="state-icon${loading ? ' pulse' : ''}">${icon}</div><span class="state-text">${text}</span></div>`;
    }

    private simpleView(cur: any, daily: any, u: 'celsius' | 'fahrenheit'): string {
        return `
            <div class="icon-main">${getWeatherIcon(cur.weathercode)}</div>
            <div class="temp-main">${formatTemp(cur.temperature, u)}</div>
            <div class="desc">${getWeatherDescription(cur.weathercode)}</div>
            ${daily ? `<div class="minmax"><span class="hi">${formatTemp(daily.temperature_2m_max[0], u)}</span><span class="lo">${formatTemp(daily.temperature_2m_min[0], u)}</span></div>` : ''}
            ${this._config.city ? `<div class="city">${this._config.city}</div>` : ''}
        `;
    }

    private forecastView(cur: any, daily: any, u: 'celsius' | 'fahrenheit'): string {
        const locale = i18n.getLocale().code;
        const n = Math.min(this._config.forecastDays || 5, daily.time.length - 1);
        let cards = '';
        for (let i = 1; i <= n; i++) {
            const d = new Date(daily.time[i] + 'T00:00:00');
            const day = d.toLocaleDateString(locale, { weekday: 'short' });
            const fullDate = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
            const desc = getWeatherDescription(daily.weathercode[i]);
            const hi = formatTemp(daily.temperature_2m_max[i], u);
            const lo = formatTemp(daily.temperature_2m_min[i], u);
            const sunrise = daily.sunrise?.[i]?.split('T')[1] || '';
            const sunset = daily.sunset?.[i]?.split('T')[1] || '';
            const wind = daily.wind_speed_10m_max?.[i] != null ? `${Math.round(daily.wind_speed_10m_max[i])} km/h` : '';

            cards += `<div class="fc-day">
                <span class="fc-name">${day}</span>
                <span class="fc-icon">${getWeatherIcon(daily.weathercode[i])}</span>
                <span class="fc-temp">${hi}</span>
                <div class="fc-tooltip">
                    <div class="tt-date">${fullDate}</div>
                    <div class="tt-desc">${desc}</div>
                    <div class="tt-row"><span class="tt-label">${i18n.t('widget.weather.max_min')}</span><span>${hi} / ${lo}</span></div>
                    ${sunrise ? `<div class="tt-row"><span class="tt-label">${i18n.t('widget.weather.sunrise')}</span><span>${sunrise}</span></div>` : ''}
                    ${sunset ? `<div class="tt-row"><span class="tt-label">${i18n.t('widget.weather.sunset')}</span><span>${sunset}</span></div>` : ''}
                    ${wind ? `<div class="tt-row"><span class="tt-label">${i18n.t('widget.weather.wind')}</span><span>${wind}</span></div>` : ''}
                </div>
            </div>`;
        }
        return `
            <div class="fc-header">
                <div class="fc-h-icon">${getWeatherIcon(cur.weathercode)}</div>
                <div class="fc-h-info">
                    <div class="fc-h-temp">${formatTemp(cur.temperature, u)}</div>
                    <div class="fc-h-desc">${getWeatherDescription(cur.weathercode)}</div>
                </div>
                ${this._config.city ? `<div class="fc-h-city">${this._config.city}</div>` : ''}
            </div>
            <div class="minmax compact"><span class="hi">${formatTemp(daily.temperature_2m_max[0], u)}</span><span class="lo">${formatTemp(daily.temperature_2m_min[0], u)}</span></div>
            <div class="fc-row">${cards}</div>
        `;
    }

    render() {
        if (!this.shadowRoot) return;
        this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="weather-body"></div>`;
        this.updateDisplay();
    }
}

// =============================================================
// Styles
// =============================================================
const CSS = `
:host {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--text-main);
    box-sizing: border-box;
    padding: 6%;
    user-select: none;
    position: relative;
    container-type: inline-size;
    overflow: visible;
}
.weather-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%; height: 100%;
    gap: 3%;
}

/* ── State (empty / loading / error) ── */
.state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; height:100%; opacity:.5; }
.state-icon { width:clamp(28px,18cqi,56px); height:clamp(28px,18cqi,56px); }
.state-icon svg { width:100%; height:100%; }
.state-text { font-size:clamp(.6rem,5cqi,.85rem); color:var(--text-dim); text-align:center; }
.pulse { animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:.8} }

/* ── Simple view ── */
.icon-main { width:clamp(32px,22cqi,72px); height:clamp(32px,22cqi,72px); color:var(--accent); }
.icon-main svg { width:100%; height:100%; }
.temp-main {
    font-size: clamp(1.4rem,18cqi,4rem);
    font-weight: 700;
    letter-spacing: -.03em;
    line-height: 1;
}
.desc {
    font-size: clamp(.55rem,5.5cqi,.95rem);
    color: var(--text-dim);
    text-transform: capitalize;
}
.minmax {
    display: flex;
    gap: clamp(8px,4cqi,20px);
    font-size: clamp(.6rem,5cqi,.9rem);
    font-weight: 500;
}
.minmax.compact { font-size: clamp(.5rem,4cqi,.8rem); }
.hi::before { content:"\\2191 "; opacity:.6; }
.lo { color: var(--text-dim); }
.lo::before { content:"\\2193 "; opacity:.6; }
.city {
    font-size: clamp(.85rem,7.5cqi,1.3rem);
    color: var(--text-main);
    font-weight: 700;
    margin-top: 1%;
}

/* ── Forecast header ── */
.fc-header {
    display: flex;
    align-items: center;
    gap: clamp(6px,3cqi,14px);
    width: 100%;
}
.fc-h-icon { width:clamp(26px,12cqi,44px); height:clamp(26px,12cqi,44px); color:var(--accent); flex-shrink:0; }
.fc-h-icon svg { width:100%; height:100%; }
.fc-h-info { flex:1; min-width:0; }
.fc-h-temp { font-size:clamp(.9rem,9cqi,2rem); font-weight:700; letter-spacing:-.03em; line-height:1.1; }
.fc-h-desc { font-size:clamp(.45rem,3.5cqi,.75rem); color:var(--text-dim); text-transform:capitalize; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-h-city { font-size:clamp(.7rem,5.5cqi,1.1rem); color:var(--text-main); font-weight:700; text-align:right; flex-shrink:0; }

/* ── Forecast row ── */
.fc-row {
    display: flex;
    justify-content: space-evenly;
    width: 100%;
    border-top: 1px solid var(--border);
    padding-top: 4%;
    margin-top: auto;
}
.fc-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(2px,1.5cqi,5px);
    position: relative;
    cursor: default;
}
.fc-name { font-size:clamp(.45rem,3cqi,.7rem); color:var(--text-dim); text-transform:capitalize; font-weight:500; }
.fc-icon { width:clamp(14px,7cqi,26px); height:clamp(14px,7cqi,26px); }
.fc-icon svg { width:100%; height:100%; }
.fc-temp { font-size:clamp(.45rem,3.5cqi,.8rem); font-weight:600; }

/* ── Forecast tooltip ── */
.fc-tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface-solid, #fff);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,.15));
    padding: 12px 14px;
    min-width: 180px;
    z-index: 100;
    pointer-events: none;
}
.fc-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--border);
}
.fc-day:hover .fc-tooltip {
    display: block;
}
.fc-day:hover {
    z-index: 101;
}
.tt-date {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 6px;
    text-transform: capitalize;
}
.tt-desc {
    font-size: 11px;
    color: var(--text-dim);
    text-transform: capitalize;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
}
.tt-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    padding: 2px 0;
    color: var(--text-main);
}
.tt-label {
    color: var(--text-dim);
    margin-right: 12px;
}
`;

customElements.define('widget-weather', WeatherWidget);
