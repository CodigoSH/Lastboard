

import { dashboardStore } from '../../../store/dashboardStore';
import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';
import '../Select/Select';
// @ts-ignore
import css from './WidgetConfigModal.css' with { type: 'text' };

// Caché para evitar consultas repetidas
const timezoneCache = new Map<string, string>();

// Función para obtener zona horaria desde coordenadas usando TimeAPI
async function getTimezoneFromCoords(lat: number, lon: number): Promise<string> {
    try {
        const response = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`);
        if (!response.ok) throw new Error('TimeAPI failed');
        const data = await response.json();
        return data.timeZone || 'local';
    } catch (error) {
        console.error('[Timezone] TimeAPI error:', error);
        return 'local';
    }
}

// Función para obtener zona horaria desde nombre de ciudad
async function getCityTimezone(city: string): Promise<string> {
    if (!city || city.trim() === '') return 'local';

    const normalized = city.toLowerCase().trim();

    // Check cache primero
    if (timezoneCache.has(normalized)) {
        return timezoneCache.get(normalized)!;
    }

    try {
        // 1. Geocoding con Nominatim (OpenStreetMap)
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl, {
            headers: { 'User-Agent': 'Lastboard/1.0' }
        });

        if (!geocodeResponse.ok) throw new Error('Geocoding failed');

        const geocodeData = await geocodeResponse.json();
        if (geocodeData.length === 0) {
            return 'local';
        }

        const { lat, lon } = geocodeData[0];

        // 2. Obtener timezone desde coordenadas
        const timezone = await getTimezoneFromCoords(parseFloat(lat), parseFloat(lon));

        // Guardar en caché
        timezoneCache.set(normalized, timezone);

        return timezone;

    } catch (error) {
        console.error('[Timezone] Error resolving city:', city, error);
        return 'local';
    }
}

class WidgetConfigModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private currentItem: GridItem | null = null;
    private _clockSelectedLat: number | null = null;
    private _clockSelectedLon: number | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners(); // Initial setup
    }

    open(item: GridItem) {
        this.currentItem = item;
        this.render();

        // Re-bind listeners after render
        this.setupEventListeners();

        if (this.dialog) {
            this.dialog.showModal();
            // Reset to general tab
            this.switchTab('general');
        }
    }

    close() {
        if (this.dialog) this.dialog.close();
        this.currentItem = null;
    }

    private setupEventListeners() {
        if (!this.shadowRoot) return;

        // Tab Switching
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = (e.currentTarget as HTMLElement).dataset.tab;
                if (tabName) this.switchTab(tabName);
            });
        });

        // Close button
        this.shadowRoot.getElementById('close-btn')?.addEventListener('click', () => this.close());

        // Save button
        this.shadowRoot.getElementById('save-btn')?.addEventListener('click', () => this.save());

        // Widget-specific bindings
        if (this.currentItem) {
            const content = typeof this.currentItem.content === 'string'
                ? JSON.parse(this.currentItem.content)
                : this.currentItem.content;
            const widgetId = content.widgetId;

            if (widgetId === 'clock') {
                const clockSearchBtn = this.shadowRoot.getElementById('clock-search-btn');
                if (clockSearchBtn) {
                    clockSearchBtn.addEventListener('click', () => this.searchClockCity());
                }
            } else if (widgetId === 'weather') {
                const weatherSearchBtn = this.shadowRoot.getElementById('weather-search-btn');
                if (weatherSearchBtn) {
                    weatherSearchBtn.addEventListener('click', () => this.searchWeatherCity());
                }

                const forecastCheck = this.shadowRoot.getElementById('weather-forecast') as HTMLInputElement;
                const daysRow = this.shadowRoot.getElementById('weather-days-row');
                if (forecastCheck && daysRow) {
                    forecastCheck.addEventListener('change', () => {
                        daysRow.style.display = forecastCheck.checked ? '' : 'none';
                    });
                }

                // Stepper
                const daysInput = this.shadowRoot.getElementById('weather-days') as HTMLInputElement;
                const decBtn = this.shadowRoot.getElementById('weather-days-dec');
                const incBtn = this.shadowRoot.getElementById('weather-days-inc');
                if (daysInput && decBtn && incBtn) {
                    decBtn.addEventListener('click', () => {
                        const v = parseInt(daysInput.value) || 1;
                        if (v > 1) daysInput.value = String(v - 1);
                    });
                    incBtn.addEventListener('click', () => {
                        const v = parseInt(daysInput.value) || 1;
                        if (v < 6) daysInput.value = String(v + 1);
                    });
                }
            }
        }
    }

    private switchTab(tabName: string) {
        if (!this.shadowRoot) return;

        // Update Buttons
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabName);
        });

        // Update Content
        this.shadowRoot.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    private async save() {
        if (!this.currentItem) return;

        // Parse existing content
        const oldContent = typeof this.currentItem.content === 'string'
            ? JSON.parse(this.currentItem.content)
            : this.currentItem.content;

        const widgetId = oldContent.widgetId;
        let newContent = { ...oldContent };

        if (widgetId === 'clock') {
            const cityInput = this.shadowRoot?.getElementById('clock-city') as HTMLInputElement;
            const h12Input = this.shadowRoot?.getElementById('clock-12h') as HTMLInputElement;
            const dateInput = this.shadowRoot?.getElementById('clock-date') as HTMLInputElement;
            const saveBtn = this.shadowRoot?.getElementById('save-btn') as any;

            const city = cityInput?.value || '';

            // Show loading state
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = i18n.t('general.loading');
            }

            // Use stored coordinates from search, or fall back to Nominatim
            let timezone = 'local';
            if (this._clockSelectedLat != null && this._clockSelectedLon != null) {
                timezone = await getTimezoneFromCoords(this._clockSelectedLat, this._clockSelectedLon);
            } else if (city) {
                timezone = await getCityTimezone(city);
            }

            newContent.city = city;
            newContent.timezone = timezone;
            newContent.hour12 = h12Input?.checked || false;
            newContent.showDate = dateInput?.checked || false;

            // Reset stored coords
            this._clockSelectedLat = null;
            this._clockSelectedLon = null;

            // Restore button state
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = i18n.t('general.save');
            }
        } else if (widgetId === 'weather') {
            const cityInput = this.shadowRoot?.getElementById('weather-city') as HTMLInputElement;
            const latInput = this.shadowRoot?.getElementById('weather-lat') as HTMLInputElement;
            const lonInput = this.shadowRoot?.getElementById('weather-lon') as HTMLInputElement;
            const unitInput = this.shadowRoot?.getElementById('weather-fahrenheit') as HTMLInputElement;
            const forecastInput = this.shadowRoot?.getElementById('weather-forecast') as HTMLInputElement;
            const daysInput = this.shadowRoot?.getElementById('weather-days') as HTMLInputElement;

            newContent.city = cityInput?.value || '';
            newContent.latitude = parseFloat(latInput?.value) || 0;
            newContent.longitude = parseFloat(lonInput?.value) || 0;
            newContent.unit = unitInput?.checked ? 'fahrenheit' : 'celsius';
            newContent.showForecast = forecastInput?.checked || false;
            newContent.forecastDays = parseInt(daysInput?.value) || 5;
        } else if (widgetId === 'telemetry') {
            const intervalInput = this.shadowRoot?.getElementById('telemetry-interval') as HTMLSelectElement;
            newContent.interval = intervalInput ? parseInt(intervalInput.value) : 1000;
        }

        if (this.currentItem.type === 'section') {
            const titleInput = this.shadowRoot?.getElementById('section-title') as HTMLInputElement;
            newContent.title = titleInput ? titleInput.value : '';
            // Remove name if present (legacy)
            delete newContent.name;
        }

        // Optimistic / Store update
        await dashboardStore.updateItem({
            id: this.currentItem.id,
            content: JSON.stringify(newContent)
        });

        this.close();
    }

    render() {
        if (!this.shadowRoot) return;

        // Parse content to pre-fill
        let content: any = {};
        let widgetId = '';
        if (this.currentItem) {
            content = typeof this.currentItem.content === 'string'
                ? JSON.parse(this.currentItem.content)
                : this.currentItem.content;
            widgetId = content.widgetId;
        }

        const esc = (s: string): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const renderForm = () => {
            if (!this.currentItem) return { general: '', customization: '' };

            // --- CLOCK ---
            if (widgetId === 'clock') {
                const city = content.city || '';
                const h12 = content.hour12 || false;
                const showDate = content.showDate !== false;

                const generalTab = `
                    <div class="field-group">
                        <label>${i18n.t('widget.clock.city')}</label>
                        <div class="input-row">
                            <input type="text" id="clock-city" value="${esc(city)}" placeholder="${i18n.t('widget.clock.city_placeholder')}"/>
                            <app-button variant="ghost" id="clock-search-btn">${i18n.t('widget.weather.search')}</app-button>
                        </div>
                        <small>${i18n.t('widget.clock.city_desc')}</small>
                    </div>

                    <div class="field-group" id="clock-results-container" style="display:none;">
                        <label>${i18n.t('widget.weather.results')}</label>
                        <div id="clock-results" class="weather-results"></div>
                    </div>
                `;

                const customizationTab = `
                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${h12 ? 'checked' : ''} />
                        <label for="clock-12h">${i18n.t('widget.clock.use_12h')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${showDate ? 'checked' : ''} />
                        <label for="clock-date">${i18n.t('widget.clock.show_date')}</label>
                    </div>
                `;

                return { general: generalTab, customization: customizationTab };

                // --- WEATHER ---
            } else if (widgetId === 'weather') {
                const city = content.city || '';
                const lat = content.latitude || '';
                const lon = content.longitude || '';
                const isFahrenheit = content.unit === 'fahrenheit';
                const showForecast = content.showForecast || false;
                const forecastDays = content.forecastDays || 5;

                const generalTab = `
                    <div class="field-group">
                        <label>${i18n.t('widget.weather.city')}</label>
                        <div class="input-row">
                            <input type="text" id="weather-city" value="${esc(city)}" placeholder="${i18n.t('widget.weather.city_placeholder')}"/>
                            <app-button variant="ghost" id="weather-search-btn">${i18n.t('widget.weather.search')}</app-button>
                        </div>
                        <small>${i18n.t('widget.weather.city_desc')}</small>
                    </div>

                    <div class="field-group" id="weather-results-container" style="display:none;">
                        <label>${i18n.t('widget.weather.results')}</label>
                        <div id="weather-results" class="weather-results"></div>
                    </div>

                    <div class="field-group">
                        <label>${i18n.t('widget.weather.coordinates')}</label>
                        <div class="input-row">
                            <input type="number" id="weather-lat" value="${lat}" placeholder="Lat" step="0.0001" />
                            <input type="number" id="weather-lon" value="${lon}" placeholder="Lon" step="0.0001" />
                        </div>
                    </div>
                `;

                const customizationTab = `
                    <div class="field-group check-row">
                        <input type="checkbox" id="weather-fahrenheit" ${isFahrenheit ? 'checked' : ''} />
                        <label for="weather-fahrenheit">${i18n.t('widget.weather.use_fahrenheit')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="weather-forecast" ${showForecast ? 'checked' : ''} />
                        <label for="weather-forecast">${i18n.t('widget.weather.show_forecast')}</label>
                    </div>

                    <div class="field-group row-aligned" id="weather-days-row" ${!showForecast ? 'style="display:none;"' : ''}>
                        <label>${i18n.t('widget.weather.forecast_days')}</label>
                        <div class="stepper-wrap">
                            <button type="button" class="stepper-btn" id="weather-days-dec">&minus;</button>
                            <input type="number" id="weather-days" value="${forecastDays}" min="1" max="6" />
                            <button type="button" class="stepper-btn" id="weather-days-inc">+</button>
                        </div>
                    </div>
                `;

                return { general: generalTab, customization: customizationTab };

                // --- TELEMETRY ---
            } else if (widgetId === 'telemetry') {
                const interval = content.interval || 1000;

                const generalTab = `
                    <p style="color: var(--text-dim); font-size: 13px; margin-bottom: 16px;">This widget displays real-time system metrics.</p>
                `;

                const customizationTab = `
                    <div class="field-group row-aligned">
                        <label>${i18n.t('widget.telemetry.update_interval')}</label>
                        <app-select id="telemetry-interval" value="${interval}"></app-select>
                    </div>
                `;

                return { general: generalTab, customization: customizationTab };

                // --- SECTION ---
            } else if (this.currentItem.type === 'section') {
                const title = content.title || '';

                const generalTab = `
                    <div class="field-group">
                        <label>${i18n.t('bookmark.label')}</label>
                        <div class="input-row">
                            <input type="text" id="section-title" value="${esc(title)}" placeholder="${i18n.t('section.placeholder_title')}" />
                        </div>
                        <small>${i18n.t('section.leave_empty')}</small>
                    </div>
                `;

                const customizationTab = `
                    <p style="color: var(--text-dim); font-size: 13px;">${i18n.t('general.no_options')}</p>
                `;

                return { general: generalTab, customization: customizationTab };
            }

            return { general: `<p>${i18n.t('widget.config.no_config')}</p>`, customization: '' };
        };


        const getTitle = () => {
            if (this.currentItem?.type === 'section') {
                return i18n.t('section.edit_title');
            }
            return i18n.t('widget.config.title');
        };

        const formData = renderForm();

        this.shadowRoot.innerHTML = `
            <style>${css}</style>
            <dialog id="modal">
                <div class="modal-header">
                    <div class="integrated-tabs">
                        <button class="tab-btn active" data-tab="general">${i18n.t('general.general')}</button>
                        <button class="tab-btn" data-tab="customization">${i18n.t('general.customization')}</button>
                    </div>
                    <button class="modal-close" id="close-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                
                <div class="tab-container">
                    <div class="content">
                         <!-- TAB: GENERAL -->
                        <div id="tab-general" class="tab-content active">
                            ${formData.general}
                        </div>

                         <!-- TAB: CUSTOMIZATION -->
                        <div id="tab-customization" class="tab-content">
                            ${formData.customization}
                        </div>
                    </div>
                </div>

                <div class="actions">
                    ${['clock', 'telemetry', 'weather'].includes(widgetId) || this.currentItem?.type === 'section' ? `<app-button variant="primary" id="save-btn">${i18n.t('general.save')}</app-button>` : ''}
                </div>
            </dialog>
        `;

        this.dialog = this.shadowRoot.querySelector('dialog');

        // Init Selects (if any in DOM)
        const telSelect = this.shadowRoot.getElementById('telemetry-interval') as any;
        if (telSelect) {
            telSelect.options = [
                { value: '1000', label: '1s' },
                { value: '2000', label: '2s' },
                { value: '5000', label: '5s' },
                { value: '10000', label: '10s' }
            ];
        }
    }

    private async searchClockCity() {
        const cityInput = this.shadowRoot?.getElementById('clock-city') as HTMLInputElement;
        const resultsContainer = this.shadowRoot?.getElementById('clock-results-container') as HTMLElement;
        const resultsEl = this.shadowRoot?.getElementById('clock-results') as HTMLElement;
        if (!cityInput || !resultsContainer || !resultsEl) return;

        const query = cityInput.value.trim();
        if (!query) return;

        resultsEl.innerHTML = `<div class="search-loading">${i18n.t('general.loading')}</div>`;
        resultsContainer.style.display = '';

        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=${i18n.getLocale().code}`);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                resultsEl.innerHTML = `<div class="search-empty">${i18n.t('general.no_icons')}</div>`;
                return;
            }

            resultsEl.innerHTML = data.results.map((r: any) => `
                <button class="city-result" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.name}">
                    <span class="city-name">${r.name}</span>
                    <span class="city-detail">${[r.admin1, r.country].filter(Boolean).join(', ')}</span>
                </button>
            `).join('');

            resultsEl.querySelectorAll('.city-result').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lat = parseFloat(btn.getAttribute('data-lat') || '0');
                    const lon = parseFloat(btn.getAttribute('data-lon') || '0');
                    const name = btn.getAttribute('data-name') || '';

                    (this.shadowRoot?.getElementById('clock-city') as HTMLInputElement).value = name;
                    this._clockSelectedLat = lat;
                    this._clockSelectedLon = lon;

                    resultsContainer.style.display = 'none';
                });
            });
        } catch (_) {
            resultsEl.innerHTML = `<div class="search-empty">${i18n.t('general.error')}</div>`;
        }
    }

    private async searchWeatherCity() {
        const cityInput = this.shadowRoot?.getElementById('weather-city') as HTMLInputElement;
        const resultsContainer = this.shadowRoot?.getElementById('weather-results-container') as HTMLElement;
        const resultsEl = this.shadowRoot?.getElementById('weather-results') as HTMLElement;
        if (!cityInput || !resultsContainer || !resultsEl) return;

        const query = cityInput.value.trim();
        if (!query) return;

        resultsEl.innerHTML = `<div class="search-loading">${i18n.t('general.loading')}</div>`;
        resultsContainer.style.display = '';

        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=${i18n.getLocale().code}`);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                resultsEl.innerHTML = `<div class="search-empty">${i18n.t('general.no_icons')}</div>`;
                return;
            }

            resultsEl.innerHTML = data.results.map((r: any) => `
                <button class="city-result" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.name}">
                    <span class="city-name">${r.name}</span>
                    <span class="city-detail">${[r.admin1, r.country].filter(Boolean).join(', ')}</span>
                </button>
            `).join('');

            resultsEl.querySelectorAll('.city-result').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lat = parseFloat(btn.getAttribute('data-lat') || '0');
                    const lon = parseFloat(btn.getAttribute('data-lon') || '0');
                    const name = btn.getAttribute('data-name') || '';

                    (this.shadowRoot?.getElementById('weather-lat') as HTMLInputElement).value = lat.toString();
                    (this.shadowRoot?.getElementById('weather-lon') as HTMLInputElement).value = lon.toString();
                    (this.shadowRoot?.getElementById('weather-city') as HTMLInputElement).value = name;

                    resultsContainer.style.display = 'none';
                });
            });
        } catch (_) {
            resultsEl.innerHTML = `<div class="search-empty">${i18n.t('general.error')}</div>`;
        }
    }
}

customElements.define('widget-config-modal', WidgetConfigModal);
