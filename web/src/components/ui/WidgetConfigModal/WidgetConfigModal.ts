
import { dashboardStore } from '../../../store/dashboardStore';
import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';
import '../Select/Select';
// @ts-ignore
import css from './WidgetConfigModal.css' with { type: 'text' };

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
            const tzInput = this.shadowRoot?.getElementById('clock-tz') as HTMLInputElement;
            const h12Input = this.shadowRoot?.getElementById('clock-12h') as HTMLInputElement;
            const dateInput = this.shadowRoot?.getElementById('clock-date') as HTMLInputElement;

            newContent.timezone = tzInput?.value || 'local';
            newContent.hour12 = h12Input?.checked || false;
            newContent.showDate = dateInput?.checked || false;
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
                const tz = content.timezone || 'local';
                const h12 = content.hour12 || false;
                const showDate = content.showDate !== false; // default true if undefined

                return `
                    <div class="field-group">
                        <label>${i18n.t('widget.clock.timezone')}</label>
                        <div class="input-row">
                            <input type="text" id="clock-tz" value="${esc(tz)}" placeholder="local"/>
                            <app-button variant="primary" id="clock-auto-tz">${i18n.t('widget.clock.auto_detect')}</app-button>
                        </div>
                        <small>${i18n.t('widget.clock.timezone_desc')}</small>
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

        // Auto-TZ Logic
        const autoTz = this.shadowRoot.getElementById('clock-auto-tz');
        if (autoTz) {
            autoTz.addEventListener('click', () => {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const input = this.shadowRoot?.getElementById('clock-tz') as HTMLInputElement;
                if (input) input.value = tz;
            });
        }
    }
}

customElements.define('widget-config-modal', WidgetConfigModal);
