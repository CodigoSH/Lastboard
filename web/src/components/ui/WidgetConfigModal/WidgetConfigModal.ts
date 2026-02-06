
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
            headers: { 'User-Agent': 'Kashboard/1.0' }
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

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    open(item: GridItem) {
        this.currentItem = item;
        this.render();
        if (this.dialog) this.dialog.showModal();
    }

    close() {
        if (this.dialog) this.dialog.close();
        this.currentItem = null;
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

            // Consultar zona horaria de forma asíncrona
            const timezone = await getCityTimezone(city);

            newContent.city = city;
            newContent.timezone = timezone;
            newContent.hour12 = h12Input?.checked || false;
            newContent.showDate = dateInput?.checked || false;

            // Restore button state
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = i18n.t('general.save');
            }
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
            if (!this.currentItem) return '';
            if (widgetId === 'clock') {
                const city = content.city || '';
                const h12 = content.hour12 || false;
                const showDate = content.showDate !== false; // default true if undefined

                return `
                    <div class="field-group">
                        <label>${i18n.t('widget.clock.city')}</label>
                        <input type="text" id="clock-city" value="${esc(city)}" placeholder="${i18n.t('widget.clock.city_placeholder')}"/>
                        <small>${i18n.t('widget.clock.city_desc')}</small>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${h12 ? 'checked' : ''} />
                        <label for="clock-12h">${i18n.t('widget.clock.use_12h')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${showDate ? 'checked' : ''} />
                        <label for="clock-date">${i18n.t('widget.clock.show_date')}</label>
                    </div>
                `;
            } else if (widgetId === 'telemetry') {
                const interval = content.interval || 1000;

                return `
                    <div class="field-group row-aligned">
                        <label>${i18n.t('widget.telemetry.update_interval')}</label>
                        <app-select id="telemetry-interval" value="${interval}"></app-select>
                    </div>
                `;
            } else if (this.currentItem.type === 'section') {
                const title = content.title || '';
                return `
                    <div class="field-group">
                        <label>${i18n.t('bookmark.label')}</label>
                        <div class="input-row">
                            <input type="text" id="section-title" value="${esc(title)}" placeholder="${i18n.t('section.placeholder_title')}" />
                        </div>
                        <small>${i18n.t('section.leave_empty')}</small>
                    </div>
                `;
            }
            return `<p>${i18n.t('widget.config.no_config')}</p>`;
        };


        const getTitle = () => {
            if (this.currentItem?.type === 'section') {
                return i18n.t('section.edit_title');
            }
            return i18n.t('widget.config.title');
        };

        this.shadowRoot.innerHTML = `
            <style>${css}</style>
            <dialog id="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${getTitle()}</h3>
                    <button class="modal-close" id="close-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="content">
                    ${renderForm()}
                </div>
                <div class="actions">
                    ${['clock', 'telemetry'].includes(widgetId) || this.currentItem?.type === 'section' ? `<app-button variant="primary" id="save-btn">${i18n.t('general.save')}</app-button>` : ''}
                </div>
            </dialog>
        `;

        this.dialog = this.shadowRoot.querySelector('dialog');

        // Init Selects
        const telSelect = this.shadowRoot.getElementById('telemetry-interval') as any;
        if (telSelect) {
            telSelect.options = [
                { value: '1000', label: '1s' },
                { value: '2000', label: '2s' },
                { value: '5000', label: '5s' },
                { value: '10000', label: '10s' }
            ];
        }

        // Bindings
        this.shadowRoot.getElementById('close-btn')?.addEventListener('click', () => this.close());
        this.shadowRoot.getElementById('save-btn')?.addEventListener('click', () => this.save());
    }
}

customElements.define('widget-config-modal', WidgetConfigModal);
