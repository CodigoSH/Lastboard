

import { dashboardStore } from '../../../store/dashboardStore';
import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';
import '../Select/Select';
import type { AppSelect } from '../Select/Select';
import type { SelectOption } from '../Select/Select.template';
import '../ColorPicker/ColorPicker';
import css from './WidgetConfigModal.css' with { type: 'text' };
import { appearanceControlsTemplate } from './WidgetConfigModal.template';
import { setupPasswordToggles } from '../../../services/passwordToggle';
import { API_PRESETS, getPreset } from '../../../widgets/apiPresets';

const ICON_EDIT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
const esc = (s: string): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

// Cache to avoid repeated queries
const timezoneCache = new Map<string, string>();

// Function to get timezone from coordinates using TimeAPI
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

// Function to get timezone from city name
async function getCityTimezone(city: string): Promise<string> {
    if (!city || city.trim() === '') return 'local';

    const normalized = city.toLowerCase().trim();

    // Check cache primero
    if (timezoneCache.has(normalized)) {
        return timezoneCache.get(normalized)!;
    }

    try {
        // 1. Geocoding con Nominatim (OpenStreetMap)
        // No User-Agent header: it is a forbidden header name, so the browser
        // drops it silently and setting it only looked like we identified
        // ourselves. From a page, Nominatim identifies the caller by Referer,
        // which the browser sends on its own.
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);

        if (!geocodeResponse.ok) throw new Error('Geocoding failed');

        const geocodeData = await geocodeResponse.json();
        if (!Array.isArray(geocodeData) || geocodeData.length === 0) {
            return 'local';
        }

        const { lat, lon } = geocodeData[0];

        // 2. Get timezone from coordinates
        const timezone = await getTimezoneFromCoords(parseFloat(lat), parseFloat(lon));

        // Save to cache
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
    private _selectedColor: string = '#333333';
    private _selectedBorderWidth: number = 1;

    private readonly premiumColors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#64748b', '#f8fafc', '#1e293b', '#333333'
    ];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        setupPasswordToggles(this.shadowRoot!);
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners(); // Initial setup
    }

    open(item: GridItem) {
        this.currentItem = item;

        // Init Appearance State
        let content: any = {};
        try {
            content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
        } catch (e) {
            console.error('Failed to parse content', e);
        }
        this._selectedColor = content.borderColor || '';
        this._selectedBorderWidth = content.borderWidth || 1;

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
            } else if (widgetId === 'telemetry') {
                // "At least one" guard: prevent deselecting all metric toggles
                this.shadowRoot.querySelectorAll('.metric-toggle').forEach(toggle => {
                    toggle.addEventListener('change', () => {
                        const all = Array.from(
                            this.shadowRoot!.querySelectorAll<HTMLInputElement>('.metric-toggle')
                        );
                        const checked = all.filter(cb => cb.checked);
                        if (checked.length === 0) {
                            // Re-check the one that was just unchecked
                            (toggle as HTMLInputElement).checked = true;
                        }
                    });
                });
            } else if (widgetId === 'docker') {
                this.setupDockerEvents();
            } else if (widgetId === 'api') {
                const methodSel = this.shadowRoot.getElementById('api-method') as AppSelect | null;
                if (methodSel) methodSel.options = [
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                ];
                const refreshSel = this.shadowRoot.getElementById('api-refresh') as AppSelect | null;
                if (refreshSel) refreshSel.options = [
                    { value: '30', label: '30s' },
                    { value: '60', label: '1m' },
                    { value: '300', label: '5m' },
                    { value: '600', label: '10m' },
                ];

                const presetSel = this.shadowRoot.getElementById('api-preset') as AppSelect | null;
                if (presetSel) {
                    // Advanced first, then presets grouped under category headers.
                    const catOrder = ['media', 'network', 'infra', 'files', 'downloads', 'dev'];
                    const opts: SelectOption[] = [
                        { value: '', label: i18n.t('widget.api.preset_custom') || 'Advanced (custom)' },
                    ];
                    for (const cat of catOrder) {
                        const inCat = API_PRESETS.filter(p => p.category === cat);
                        if (!inCat.length) continue;
                        opts.push({ value: '', label: i18n.t('widget.api.cat.' + cat), header: true });
                        for (const p of inCat) opts.push({ value: p.id, label: p.name });
                    }
                    presetSel.options = opts;
                    // The list is long enough that scanning it is slower than
                    // typing the service name. Same wording as the status page
                    // search, which does the same job.
                    presetSel.searchable = true;
                    presetSel.searchPlaceholder = i18n.t('monitor.search_placeholder');
                }

                const applyPresetUI = (id: string) => {
                    const simple = this.shadowRoot!.getElementById('api-simple') as HTMLElement | null;
                    const advanced = this.shadowRoot!.getElementById('api-advanced') as HTMLElement | null;
                    const p = getPreset(id);
                    if (simple) simple.style.display = p ? 'block' : 'none';
                    if (advanced) advanced.style.display = p ? 'none' : 'block';
                    if (p) {
                        const keyLabel = this.shadowRoot!.getElementById('api-key-label');
                        const keyHint = this.shadowRoot!.getElementById('api-key-hint');
                        const keyGroup = this.shadowRoot!.getElementById('api-key-group') as HTMLElement | null;
                        const baseInput = this.shadowRoot!.getElementById('api-baseurl') as HTMLInputElement | null;
                        if (keyLabel) keyLabel.textContent = i18n.t(p.keyLabelKey);
                        if (keyHint) keyHint.textContent = p.keyHintKey ? i18n.t(p.keyHintKey) : '';
                        if (keyGroup) keyGroup.style.display = p.needsKey ? 'block' : 'none';
                        if (baseInput) baseInput.placeholder = p.urlPlaceholder;

                        // Third field: only the presets that address a specific
                        // node/entity/page ask for it.
                        const extraGroup = this.shadowRoot!.getElementById('api-extra-group') as HTMLElement | null;
                        const extraLabel = this.shadowRoot!.getElementById('api-extra-label');
                        const extraHint = this.shadowRoot!.getElementById('api-extra-hint');
                        const extraInput = this.shadowRoot!.getElementById('api-extra') as HTMLInputElement | null;
                        if (extraGroup) extraGroup.style.display = p.extraLabelKey ? 'block' : 'none';
                        if (extraLabel && p.extraLabelKey) extraLabel.textContent = i18n.t(p.extraLabelKey);
                        if (extraHint) extraHint.textContent = p.extraHintKey ? i18n.t(p.extraHintKey) : '';
                        if (extraInput) extraInput.placeholder = p.extraPlaceholder || '';
                    }
                };
                if (presetSel) {
                    presetSel.addEventListener('change', (e: any) => applyPresetUI(e.detail));
                    applyPresetUI(presetSel.value || '');
                }
            }
        }

        // Appearance Controls Listeners
        this.shadowRoot.querySelectorAll('.premium-color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const el = e.currentTarget as HTMLElement;
                if (el.classList.contains('premium-color-swatch--custom')) return; // handled by input

                this._selectedColor = el.dataset.color!;
                this.updateAppearanceUI();
            });
        });

        const colorInput = this.shadowRoot.getElementById('widget-borderColor') as HTMLInputElement;
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                this._selectedColor = (e.target as HTMLInputElement).value;
                this.updateAppearanceUI();
            });
        }

        this.shadowRoot.querySelectorAll('.border-width-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const el = e.currentTarget as HTMLElement;
                this._selectedBorderWidth = parseInt(el.dataset.width!);
                this.updateAppearanceUI();
            });
        });
    }

    private updateAppearanceUI() {
        if (!this.shadowRoot) return;

        // Update Swatches
        this.shadowRoot.querySelectorAll('.premium-color-swatch').forEach(swatch => {
            const el = swatch as HTMLElement;
            const color = el.dataset.color;
            const isCustom = el.classList.contains('premium-color-swatch--custom');

            if (color) {
                // Preset
                if (color === this._selectedColor) {
                    el.classList.add('active');
                    if (!el.querySelector('svg')) {
                        el.innerHTML += '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>';
                    }
                } else {
                    el.classList.remove('active');
                    const svg = el.querySelector('svg');
                    if (svg) svg.remove();
                }
            } else if (isCustom) {
                // Custom
                const isCustomColor = !this.premiumColors.includes(this._selectedColor) && this._selectedColor !== '';
                el.classList.toggle('active', isCustomColor);

                const svg = el.querySelector('svg');
                if (svg) svg.style.fill = isCustomColor ? '#fff' : 'rgba(255,255,255,0.4)';

                const input = this.shadowRoot?.getElementById('widget-borderColor') as HTMLInputElement;
                if (input && isCustomColor) input.value = this._selectedColor;

                if (isCustomColor) el.style.backgroundColor = this._selectedColor;
                else el.style.backgroundColor = '#333';
            }
        });

        // Update Width Buttons
        this.shadowRoot.querySelectorAll('.border-width-btn').forEach(btn => {
            const w = parseInt((btn as HTMLElement).dataset.width!);
            btn.classList.toggle('active', w === this._selectedBorderWidth);
        });
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
            const cityDisplayInput = this.shadowRoot?.getElementById('clock-show-city') as HTMLInputElement;
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
            newContent.showCity = cityDisplayInput?.checked ?? true;
            newContent.showSeconds = (this.shadowRoot?.getElementById('clock-seconds') as HTMLInputElement)?.checked ?? true;

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
            const forecastInput = this.shadowRoot?.getElementById('weather-forecast') as HTMLInputElement;
            const daysInput = this.shadowRoot?.getElementById('weather-days') as HTMLInputElement;

            newContent.city = cityInput?.value || '';
            newContent.latitude = parseFloat(latInput?.value) || 0;
            newContent.longitude = parseFloat(lonInput?.value) || 0;
            newContent.showForecast = forecastInput?.checked || false;
            newContent.forecastDays = parseInt(daysInput?.value) || 5;
            delete newContent.unit;
        } else if (widgetId === 'notepad') {
            const textInput = this.shadowRoot?.getElementById('notepad-text') as HTMLTextAreaElement;
            newContent.text = textInput ? textInput.value : '';
        } else if (widgetId === 'markdown') {
            const textInput = this.shadowRoot?.getElementById('markdown-text') as HTMLTextAreaElement;
            newContent.text = textInput ? textInput.value : '';
        } else if (widgetId === 'api') {
            const val = (id: string) => (this.shadowRoot?.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)?.value ?? '';
            newContent.title = val('api-title').trim();
            const presetId = val('api-preset');

            if (presetId) {
                // Guided preset: compose the whole config from base URL + key.
                const preset = getPreset(presetId);
                const base = val('api-baseurl').trim();
                const key = val('api-key');
                const extra = val('api-extra').trim();
                if (preset) {
                    const cfg = preset.build(base, key, extra);
                    newContent.preset = presetId;
                    newContent.baseUrl = base;
                    newContent.apiKey = key;
                    newContent.apiExtra = extra;
                    newContent.url = cfg.url;
                    newContent.method = cfg.method || 'GET';
                    newContent.headers = cfg.headers || {};
                    newContent.arrayPath = cfg.arrayPath || '';
                    newContent.mappings = cfg.mappings || [];
                    newContent.refreshSec = cfg.refreshSec || 60;
                }
            } else {
                // Advanced (manual).
                const headers: Record<string, string> = {};
                val('api-headers').split('\n').forEach(line => {
                    const i = line.indexOf(':');
                    if (i > 0) {
                        const k = line.slice(0, i).trim();
                        if (k) headers[k] = line.slice(i + 1).trim();
                    }
                });
                const mappings: { label: string; path: string; format?: string }[] = [];
                val('api-fields').split('\n').forEach(line => {
                    if (!line.trim()) return;
                    const eq = line.indexOf('=');
                    if (eq < 0) return;
                    const label = line.slice(0, eq).trim();
                    let rest = line.slice(eq + 1).trim();
                    let format: string | undefined;
                    const pipe = rest.lastIndexOf('|');
                    if (pipe >= 0) {
                        format = rest.slice(pipe + 1).trim().toLowerCase() || undefined;
                        rest = rest.slice(0, pipe).trim();
                    }
                    if (rest) mappings.push({ label, path: rest, format });
                });
                newContent.preset = '';
                newContent.url = val('api-url').trim();
                newContent.method = val('api-method') || 'GET';
                newContent.headers = headers;
                newContent.arrayPath = val('api-array').trim();
                newContent.mappings = mappings;
                newContent.refreshSec = parseInt(val('api-refresh')) || 60;
            }
        } else if (widgetId === 'telemetry') {
            const intervalInput = this.shadowRoot?.getElementById('telemetry-interval') as HTMLSelectElement;
            newContent.interval = intervalInput ? parseInt(intervalInput.value) : 5000;

            // Collect selected metrics (guarantee at least one)
            const allKeys = ['cpu', 'ram', 'temp'];
            const selected = allKeys.filter(k =>
                (this.shadowRoot?.getElementById(`metric-${k}`) as HTMLInputElement)?.checked
            );
            newContent.metrics = selected.length > 0 ? selected : allKeys;

            // Auto-resize grid cell based on metric count
            const sizeMap: Record<number, { w: number; h: number }> = {
                1: { w: 1, h: 1 },
                2: { w: 2, h: 1 },
                3: { w: 3, h: 1 }
            };
            const newSize = sizeMap[newContent.metrics.length] ?? { w: 3, h: 1 };

            // Persist appearance + content, then resize
            newContent.borderColor = this._selectedColor;
            newContent.borderWidth = this._selectedBorderWidth;
            await dashboardStore.updateItem({
                id: this.currentItem!.id,
                content: JSON.stringify(newContent),
                w: newSize.w,
                h: newSize.h
            });
            this.close();
            return; // Skip the generic updateItem below
        }

        if (this.currentItem.type === 'section') {
            const titleInput = this.shadowRoot?.getElementById('section-title') as HTMLInputElement;
            newContent.title = titleInput ? titleInput.value : '';
            // Remove name if present (legacy)
            delete newContent.name;
        }

        // Persist Appearance
        newContent.borderColor = this._selectedColor;
        newContent.borderWidth = this._selectedBorderWidth;

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
            const renderAppearanceControls = () => appearanceControlsTemplate(this.premiumColors, this._selectedColor, this._selectedBorderWidth);

            if (!this.currentItem) return { general: '', customization: '' };

            // --- CLOCK ---
            if (widgetId === 'clock') {
                const city = content.city || '';
                const h12 = content.hour12 || false;
                const showDate = content.showDate !== false;
                const showCity = content.showCity !== false;

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

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${h12 ? 'checked' : ''} />
                        <label for="clock-12h">${i18n.t('widget.clock.use_12h')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${showDate ? 'checked' : ''} />
                        <label for="clock-date">${i18n.t('widget.clock.show_date')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-show-city" ${showCity ? 'checked' : ''} />
                        <label for="clock-show-city">${i18n.t('widget.clock.show_city')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-seconds" ${content.showSeconds === true ? 'checked' : ''} />
                        <label for="clock-seconds">${i18n.t('widget.clock.show_seconds')}</label>
                    </div>
                `;

                const customizationTab = ``;

                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

                // --- WEATHER ---
            } else if (widgetId === 'weather') {
                const city = content.city || '';
                const lat = content.latitude || '';
                const lon = content.longitude || '';
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
                            <input type="number" id="weather-lat" value="${lat}" placeholder="${i18n.t('general.latitude')}" step="0.0001" />
                            <input type="number" id="weather-lon" value="${lon}" placeholder="${i18n.t('general.longitude')}" step="0.0001" />
                        </div>
                    </div>

                    <div class="field-group check-row" style="margin-top: 16px;">
                        <input type="checkbox" id="weather-forecast" ${showForecast ? 'checked' : ''} />
                        <label for="weather-forecast">${i18n.t('widget.weather.show_forecast')}</label>
                    </div>

                    <div class="field-group row-aligned" id="weather-days-row" ${!showForecast ? 'style="display:none; margin-top: 16px;"' : 'style="margin-top: 16px;"'}>
                        <label>${i18n.t('widget.weather.forecast_days')}</label>
                        <div class="stepper-wrap">
                            <button type="button" class="stepper-btn" id="weather-days-dec">&minus;</button>
                            <input type="number" id="weather-days" value="${forecastDays}" min="1" max="6" />
                            <button type="button" class="stepper-btn" id="weather-days-inc">+</button>
                        </div>
                    </div>
                `;

                const customizationTab = ``;

                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

                // --- TELEMETRY ---
            } else if (widgetId === 'telemetry') {
                const interval = content.interval || 5000;
                const activeMetrics: string[] = Array.isArray(content.metrics) ? content.metrics : ['cpu', 'ram', 'temp'];

                const metricDef = [
                    { key: 'cpu', label: i18n.t('widget.telemetry.cpu'), icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>` },
                    { key: 'ram', label: i18n.t('widget.telemetry.ram'), icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="2" y="7" width="20" height="10" rx="1"/><line x1="6" y1="17" x2="6" y2="20"/><line x1="10" y1="17" x2="10" y2="20"/><line x1="14" y1="17" x2="14" y2="20"/><line x1="18" y1="17" x2="18" y2="20"/><line x1="5" y1="10" x2="5" y2="14"/><line x1="9" y1="10" x2="9" y2="14"/><line x1="13" y1="10" x2="13" y2="14"/></svg>` },
                    { key: 'temp', label: i18n.t('widget.telemetry.temp'), icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>` }
                ];

                const metricsRows = metricDef.map(m => `
                    <div class="metric-toggle-row">
                        <span class="metric-toggle-icon">${m.icon}</span>
                        <span class="metric-toggle-label">${m.label}</span>
                        <label class="toggle-switch">
                            <input type="checkbox" class="metric-toggle" id="metric-${m.key}" ${activeMetrics.includes(m.key) ? 'checked' : ''} data-metric="${m.key}" />
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                `).join('');

                const generalTab = `
                    <div class="field-group">
                        <label>${i18n.t('widget.telemetry.metrics') || 'Metrics'}</label>
                        <div class="metric-toggles">${metricsRows}</div>
                        <small>${i18n.t('widget.telemetry.metrics_hint') || 'At least one metric must remain active.'}</small>
                    </div>
                    <div class="field-group row-aligned">
                        <label>${i18n.t('widget.telemetry.update_interval')}</label>
                        <app-select id="telemetry-interval" value="${interval}"></app-select>
                    </div>
                `;

                const customizationTab = ``;

                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

                // --- SECTION ---
            } else if (widgetId === 'notepad') {
                const generalTab = `
                    <div style="text-align: center; padding: 32px 20px; color: var(--text-dim);">
                        <p>${i18n.t('widget.config.check_personalize')} </p>
                            </div>
                                `;

                const customizationTab = ``;
                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

            } else if (widgetId === 'markdown') {
                const generalTab = `
                    <div style="text-align: center; padding: 32px 20px; color: var(--text-dim);">
                        <p>${i18n.t('widget.config.check_personalize')}</p>
                    </div>
                `;

                const customizationTab = ``;
                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

                // --- API ---
            } else if (widgetId === 'api') {
                const title = content.title || '';
                const url = content.url || '';
                const method = content.method || 'GET';
                const refreshSec = content.refreshSec || 60;
                const arrayPath = content.arrayPath || '';
                const preset = content.preset || '';
                const baseUrl = content.baseUrl || '';
                const apiKey = content.apiKey || '';
                const apiExtra = content.apiExtra || '';
                const headersText = Object.entries(content.headers || {})
                    .map(([k, v]) => `${k}: ${v}`).join('\n');
                const fieldsText = (Array.isArray(content.mappings) ? content.mappings : [])
                    .map((m: any) => `${m.label || ''} = ${m.path || ''}${m.format ? ' | ' + m.format : ''}`).join('\n');

                const generalTab = `
                    <div class="field-group row-aligned">
                        <label>${i18n.t('widget.api.preset_label') || 'Service'}</label>
                        <app-select id="api-preset" value="${esc(preset)}"></app-select>
                    </div>
                    <div class="field-group">
                        <label>${i18n.t('widget.api.title_label') || 'Title'}</label>
                        <input type="text" id="api-title" value="${esc(title)}" placeholder="Pi-hole" />
                    </div>

                    <div id="api-simple" style="display:${preset ? 'block' : 'none'}">
                        <div class="field-group">
                            <label>${i18n.t('widget.api.base_url_label') || 'Base URL'}</label>
                            <input type="text" id="api-baseurl" value="${esc(baseUrl)}" placeholder="http://10.0.0.5:8080" />
                            <small>${i18n.t('widget.api.base_url_hint') || 'Just the address of the service — the rest is filled in for you.'}</small>
                        </div>
                        <div class="field-group" id="api-key-group">
                            <label id="api-key-label">${i18n.t('widget.api.key_apikey') || 'API Key'}</label>
                            <input type="text" id="api-key" value="${esc(apiKey)}" spellcheck="false" placeholder="" />
                            <small id="api-key-hint"></small>
                        </div>
                        <div class="field-group" id="api-extra-group" style="display:none">
                            <label id="api-extra-label"></label>
                            <input type="text" id="api-extra" value="${esc(apiExtra)}" spellcheck="false" placeholder="" />
                            <small id="api-extra-hint"></small>
                        </div>
                    </div>

                    <div id="api-advanced" style="display:${preset ? 'none' : 'block'}">
                        <div class="field-group">
                            <label>${i18n.t('widget.api.url_label') || 'Endpoint URL'}</label>
                            <input type="text" id="api-url" value="${esc(url)}" placeholder="http://10.0.0.5/admin/api.php?summary" />
                            <small>${i18n.t('widget.api.url_hint') || 'The server fetches this JSON URL for you (reaches private IPs, no CORS).'}</small>
                        </div>
                        <div class="field-group row-aligned">
                            <label>${i18n.t('widget.api.method_label') || 'Method'}</label>
                            <app-select id="api-method" value="${method}"></app-select>
                        </div>
                        <div class="field-group">
                            <label>${i18n.t('widget.api.headers_label') || 'Headers'}</label>
                            <textarea id="api-headers" rows="2" spellcheck="false" placeholder="X-Api-Key: your-token">${esc(headersText)}</textarea>
                            <small>${i18n.t('widget.api.headers_hint') || 'One per line, "Name: value".'}</small>
                        </div>
                        <div class="field-group">
                            <label>${i18n.t('widget.api.array_label') || 'List array (optional)'}</label>
                            <input type="text" id="api-array" value="${esc(arrayPath)}" placeholder="queue.records" />
                            <small>${i18n.t('widget.api.array_hint') || 'Fill to show a LIST: path to an array. Then the fields below are relative to each item. Leave empty for metrics.'}</small>
                        </div>
                        <div class="field-group">
                            <label>${i18n.t('widget.api.fields_label') || 'Fields'}</label>
                            <textarea id="api-fields" rows="4" spellcheck="false" placeholder="Queries = dns_queries_today | number&#10;Blocked = ads_percentage_today | percent">${esc(fieldsText)}</textarea>
                            <small>${i18n.t('widget.api.fields_hint') || 'One per line: "Label = path". Path is dot/bracket (a.b[0].c). Optional "| number|bytes|percent".'}</small>
                        </div>
                        <div class="field-group row-aligned">
                            <label>${i18n.t('widget.api.refresh_label') || 'Refresh'}</label>
                            <app-select id="api-refresh" value="${refreshSec}"></app-select>
                        </div>
                    </div>
                `;

                const customizationTab = ``;
                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

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

                const customizationTab = ``; // Section customization tab is empty by default, only appearance controls are added.

                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };
            } else if (widgetId === 'docker') {
                return this.renderDockerForm(content);
            }

            return {
                general: `<p>${i18n.t('widget.config.no_config')}</p>`, customization: ''
            };
        };


        const formData = renderForm();

        this.shadowRoot.innerHTML = `
            <style>${css}</style>
            <dialog id="modal" aria-label="${i18n.t('widget.add_title') || 'Widget'}">
                <div class="modal-header">
                    <div class="integrated-tabs">
                        <button class="tab-btn active" data-tab="general">${i18n.t('general.general')}</button>
                        <button class="tab-btn" data-tab="customization">${i18n.t('general.customization')}</button>
                    </div>
                    <button class="modal-close" id="close-btn" aria-label="${i18n.t('general.close')}">
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
                    ${(['clock', 'telemetry', 'weather', 'notepad', 'markdown', 'docker', 'api'].includes(widgetId) || this.currentItem?.type === 'section') ? `<app-button variant="primary" id="save-btn">${i18n.t('general.save')}</app-button>` : ''}
                </div>
                <div id="docker-host-overlay" class="docker-overlay" style="display: none;"></div>
            </dialog>
        `;

        this.dialog = this.shadowRoot.querySelector('dialog');

        // Init Selects (if any in DOM)
        const telSelect = this.shadowRoot.getElementById('telemetry-interval') as AppSelect | null;
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
                <button class="city-result" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${esc(r.name)}">
                    <span class="city-name">${esc(r.name)}</span>
                    <span class="city-detail">${esc([r.admin1, r.country].filter(Boolean).join(', '))}</span>
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
                <button class="city-result" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${esc(r.name)}">
                    <span class="city-name">${esc(r.name)}</span>
                    <span class="city-detail">${esc([r.admin1, r.country].filter(Boolean).join(', '))}</span>
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

    private refreshDockerContent() {
        if (!this.shadowRoot || !this.currentItem) return;
        const generalTab = this.shadowRoot.getElementById('tab-general');
        if (!generalTab) return;

        const content = typeof this.currentItem.content === 'string'
            ? JSON.parse(this.currentItem.content)
            : this.currentItem.content;

        const formData = this.renderDockerForm(content);
        generalTab.innerHTML = formData.general;
        this.setupDockerEvents();
    }

    private setupDockerEvents() {
        if (!this.shadowRoot) return;
        const root = this.shadowRoot;

        root.getElementById('docker-show-add-btn')?.addEventListener('click', () => {
            this.showDockerHostForm(null);
        });
        root.querySelectorAll('.host-action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id) {
                    this.showDockerHostForm(id);
                }
            });
        });
        root.querySelectorAll('.host-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (!id) return;

                const confirmationModal = document.querySelector('confirmation-modal') as any;
                let confirmed = false;
                if (confirmationModal) {
                    confirmed = await confirmationModal.confirm(
                        i18n.t('general.delete') || 'Delete',
                        i18n.t('docker.delete_host_confirm') || 'Are you sure you want to delete this host?'
                    );
                } else {
                    confirmed = confirm(i18n.t('general.are_you_sure') || 'Are you sure?');
                }

                if (confirmed) {
                    let content = typeof this.currentItem!.content === 'string'
                        ? JSON.parse(this.currentItem!.content)
                        : { ...this.currentItem!.content };
                    content.hosts = (content.hosts || []).filter((h: any) => h.id !== id);

                    this.currentItem!.content = JSON.stringify(content);
                    this.refreshDockerContent();
                }
            });
        });
    }

    private showDockerHostForm(hostId: string | null) {
        if (!this.shadowRoot || !this.currentItem) return;
        const overlay = this.shadowRoot.getElementById('docker-host-overlay');
        if (!overlay) return;

        const content = typeof this.currentItem.content === 'string'
            ? JSON.parse(this.currentItem.content)
            : this.currentItem.content;

        const hosts = content.hosts || [];
        const editingHost = hostId ? hosts.find((h: any) => h.id === hostId) || { type: 'local' } : { type: 'local' };
        
        overlay.innerHTML = `
            <div class="modal-header" style="border-radius: var(--radius) var(--radius) 0 0; border-bottom: 1px solid var(--border);">
                <h3 class="modal-title" style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-main);">${hostId ? (i18n.t('general.edit') || 'Edit') : (i18n.t('docker.add_new_host') || 'Add Host')}</h3>
                <button class="modal-close" id="docker-cancel-overlay-btn" title="${i18n.t('general.close') || 'Close'}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div style="padding: 24px; display: flex; flex-direction: column; flex: 1; overflow-y: auto;">
                <div class="field-group">
                    <label>${i18n.t('docker.host_name') || 'Host Name'}</label>
                    <input type="text" id="docker-name" value="${esc(editingHost.name || '')}" placeholder="${i18n.t('docker.host_name_placeholder')}" />
                </div>
                <div class="field-group" style="margin-top: 12px;">
                    <label>${i18n.t('docker.host_type') || 'Connection Type'}</label>
                    <app-select id="docker-type" value="${editingHost.type}"></app-select>
                </div>
                <div class="field-group" id="docker-url-row" style="margin-top: 12px; ${editingHost.type === 'local' ? 'display: none;' : ''}">
                    <label>${i18n.t('docker.host_url') || 'Agent URL'}</label>
                    <input type="text" id="docker-url" value="${esc(editingHost.url || '')}" placeholder="192.168.1.100:2375" />
                </div>
                <div class="field-group" id="docker-token-row" style="margin-top: 12px; ${editingHost.type === 'agent' ? '' : 'display: none;'}">
                    <label>${i18n.t('docker.host_token') || 'Agent Token'}</label>
                    <div class="pw-wrap">
                        <input type="password" id="docker-token" value="${esc(editingHost.token || '')}" placeholder="${i18n.t('docker.host_token_placeholder')}" />
                        <button type="button" class="pw-toggle" aria-label="Toggle token visibility">
                            <svg style="display:none" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                            <svg style="display:block" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="docker-form-actions" style="margin-top: auto; padding-top: 24px;">
                    <app-button variant="primary" id="docker-save-overlay-btn" style="flex: 1;">${i18n.t('general.save')}</app-button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';

        const typeSelect = this.shadowRoot.getElementById('docker-type') as AppSelect | null;
        if (typeSelect) {
            typeSelect.options = [
                { value: 'local', label: i18n.t('docker.host_type_local') || 'Local socket' },
                { value: 'agent', label: i18n.t('docker.host_type_agent') || 'Remote Agent' },
                { value: 'tcp', label: i18n.t('docker.host_type_tcp') || 'Remote TCP' },
                { value: 'tls', label: i18n.t('docker.host_type_tls') || 'Remote TLS' }
            ];

            const toggle = (val?: string) => {
                const t = val || typeSelect.value;
                const url = this.shadowRoot!.getElementById('docker-url-row');
                const token = this.shadowRoot!.getElementById('docker-token-row');
                if (url) url.style.display = t === 'local' ? 'none' : '';
                if (token) token.style.display = t === 'agent' ? '' : 'none';
            };
            typeSelect.addEventListener('change', (e: Event) => toggle((e as CustomEvent).detail.value));
            toggle();
        }

        this.shadowRoot.getElementById('docker-cancel-overlay-btn')?.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        this.shadowRoot.getElementById('docker-save-overlay-btn')?.addEventListener('click', () => {
            const name = (this.shadowRoot!.getElementById('docker-name') as HTMLInputElement).value.trim();
            const type = (this.shadowRoot!.getElementById('docker-type') as AppSelect).value;
            const urlInput = this.shadowRoot!.getElementById('docker-url') as HTMLInputElement;
            const url = urlInput ? urlInput.value.trim() : '';
            const tokenInput = this.shadowRoot!.getElementById('docker-token') as HTMLInputElement;
            const token = tokenInput ? tokenInput.value.trim() : '';

            if (!name) return;

            let currentContent = typeof this.currentItem!.content === 'string'
                ? JSON.parse(this.currentItem!.content)
                : { ...this.currentItem!.content };

            if (!currentContent.hosts) currentContent.hosts = [];

            if (hostId) {
                currentContent.hosts = currentContent.hosts.map((h: any) =>
                    h.id === hostId ? { ...h, name, type, url, token } : h
                );
            } else {
                currentContent.hosts.push({
                    id: 'h_' + Math.random().toString(36).slice(2, 8),
                    name, type, url, token
                });
            }

            this.currentItem!.content = JSON.stringify(currentContent);
            overlay.style.display = 'none';
            this.refreshDockerContent();
        });
    }

    private renderDockerForm(content: any) {
        const renderAppearanceControls = () => appearanceControlsTemplate(this.premiumColors, this._selectedColor, this._selectedBorderWidth);

        const hosts = content.hosts || [];
        let generalTab = '';

        const hostsList = hosts.length > 0
            ? hosts.map((h: any) => `
                <div class="host-item">
                    <div class="host-info">
                        <span class="host-name">${esc(h.name)}</span>
                        <span class="host-tag">${h.type === 'local' ? i18n.t('docker.host_type_local') : i18n.t('docker.host_type_' + h.type)}</span>
                    </div>
                    <div class="host-actions">
                        <button class="host-action-btn edit" data-id="${h.id}" title="${i18n.t('general.edit')}">
                            ${ICON_EDIT}
                        </button>
                        <button class="host-action-btn delete" data-id="${h.id}" title="${i18n.t('general.delete')}">
                            ${ICON_TRASH}
                        </button>
                    </div>
                </div>
            `).join('')
            : `<p class="no-hosts" style="color: var(--text-dim); text-align: center; padding: 12px;">${i18n.t('docker.no_hosts_configured') || 'No hosts found'}</p>`;

        generalTab = `
            <div class="field-group">
                <label>${i18n.t('docker.hosts') || 'Docker Hosts'}</label>
                <div class="hosts-list">${hostsList}</div>
                <app-button variant="ghost" id="docker-show-add-btn" style="width: 100%; margin-top: 12px;">${i18n.t('docker.add_new_host') || 'Add Host'}</app-button>
            </div>
        `;

        return { general: generalTab, customization: renderAppearanceControls() };
    }
}

customElements.define('widget-config-modal', WidgetConfigModal);
