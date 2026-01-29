
import { dashboardStore } from '../../../store/dashboardStore';
import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';

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
            newContent.timezone = tzInput?.value || 'local';
            newContent.hour12 = h12Input?.checked || false;
            newContent.showDate = dateInput?.checked || false;
        } else if (widgetId === 'telemetry') {
            const intervalInput = this.shadowRoot?.getElementById('telemetry-interval') as HTMLSelectElement;
            newContent.interval = intervalInput ? parseInt(intervalInput.value) : 1000;
        }

        // TODO: Add other widget forms here (e.g. Telemetry settings?)

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
                            <input type="text" id="clock-tz" value="${tz}" placeholder="local"/>
                            <button id="clock-auto-tz" class="btn-ghost">${i18n.t('widget.clock.auto_detect')}</button>
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
                        <select id="telemetry-interval" class="select-input">
                            <option value="1000" ${interval === 1000 ? 'selected' : ''}>1s</option>
                            <option value="2000" ${interval === 2000 ? 'selected' : ''}>2s</option>
                            <option value="5000" ${interval === 5000 ? 'selected' : ''}>5s</option>
                            <option value="10000" ${interval === 10000 ? 'selected' : ''}>10s</option>
                        </select>
                    </div>
                `;
            }
            return '<p>No configuration available for this widget.</p>';
        };


        this.shadowRoot.innerHTML = `
            <style>
                :host { display: contents; }
                dialog {
                    background: var(--surface-solid, #1e1e23);
                    color: var(--text-main, #fff);
                    border: 1px solid var(--border, #333);
                    border-radius: 12px;
                    padding: 24px;
                    width: 500px;
                    max-width: 90vw;
                    backdrop-filter: blur(20px);
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                dialog::backdrop {
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border);
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                }
                .modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                }
                .modal-close {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-dim);
                    padding: 8px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                }
                .modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: rotate(90deg);
                    color: #ff4757;
                    border-color: rgba(255, 71, 87, 0.3);
                }
                
                .field-group { margin-bottom: 16px; }
                .field-group.row-aligned {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                }
                .field-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; }
                .field-group.row-aligned label { margin-bottom: 0; }
                .field-group small { display: block; margin-top: 4px; color: var(--text-dim); font-size: 0.8rem; }
                
                .input-row { display: flex; gap: 8px; }
                input[type="text"], .select-input {
                    flex: 1;
                    background: rgba(0,0,0,0.2);
                    border: 1px solid var(--border);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                }
                .select-input {
                    cursor: pointer;
                    appearance: none;
                    background-image: url('data:image/svg+xml;utf8,<svg fill="white" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
                    background-repeat: no-repeat;
                    background-position: right 8px center;
                    padding-right: 32px;
                    width: 120px;
                    background-color: rgba(255, 255, 255, 0.05);
                }
                .select-input option {
                    background: var(--surface-solid, #1e1e23);
                    color: white;
                    padding: 8px;
                }
                .select-input:focus, input[type="text"]:focus {
                    border-color: var(--accent);
                    outline: none;
                    background-color: rgba(255, 255, 255, 0.1);
                }
                
                .check-row { display: flex; align-items: center; gap: 10px; cursor: pointer; }
                .check-row input { width: 18px; height: 18px; cursor: pointer; }
                .check-row label { margin: 0; cursor: pointer; }

                .btn-ghost {
                    background: transparent;
                    border: 1px solid var(--accent);
                    color: var(--accent);
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .btn-ghost:hover { background: var(--accent); color: white; }

                .actions {
                    display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;
                }
                .btn-save {
                    background: var(--accent);
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                }

            </style>
            <dialog id="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${i18n.t('widget.config.title')}</h3>
                    <button class="modal-close" id="close-btn">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="content">
                    ${renderForm()}
                </div>
                <div class="actions">
                    ${['clock', 'telemetry'].includes(widgetId) ? `<button class="btn-save" id="save-btn">${i18n.t('general.save')}</button>` : ''}
                </div>
            </dialog>
        `;

        this.dialog = this.shadowRoot.querySelector('dialog');

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
