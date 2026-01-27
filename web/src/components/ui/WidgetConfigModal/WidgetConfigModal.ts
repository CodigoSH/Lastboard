
import { dashboardStore } from '../../../store/dashboardStore';
import { GridItem } from '../../../types';

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
                        <label>Timezone</label>
                        <div class="input-row">
                            <input type="text" id="clock-tz" value="${tz}" placeholder="local"/>
                            <button id="clock-auto-tz" class="btn-ghost">Auto Detect</button>
                        </div>
                        <small>e.g. America/New_York, UTC, or 'local'</small>
                    </div>
                    
                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${h12 ? 'checked' : ''} />
                        <label for="clock-12h">Use 12-Hour Format</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${showDate ? 'checked' : ''} />
                        <label for="clock-date">Show Date</label>
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
                h3 { margin: 0 0 20px 0; font-size: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom:12px; }
                
                .field-group { margin-bottom: 16px; }
                .field-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; }
                .field-group small { display: block; margin-top: 4px; color: var(--text-dim); font-size: 0.8rem; }
                
                .input-row { display: flex; gap: 8px; }
                input[type="text"] {
                    flex: 1;
                    background: rgba(0,0,0,0.2);
                    border: 1px solid var(--border);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
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
                .btn-cancel {
                    background: transparent;
                    color: var(--text-dim);
                    border: none;
                    cursor: pointer;
                    padding: 8px 12px;
                }
                .btn-cancel:hover { color: white; }
            </style>
            <dialog id="modal">
                <h3>Configure Widget</h3>
                <div class="content">
                    ${renderForm()}
                </div>
                <div class="actions">
                    <button class="btn-cancel" id="cancel-btn">Cancel</button>
                    ${widgetId === 'clock' ? '<button class="btn-save" id="save-btn">Save</button>' : ''}
                </div>
            </dialog>
        `;

        this.dialog = this.shadowRoot.querySelector('dialog');

        // Bindings
        this.shadowRoot.getElementById('cancel-btn')?.addEventListener('click', () => this.close());
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
