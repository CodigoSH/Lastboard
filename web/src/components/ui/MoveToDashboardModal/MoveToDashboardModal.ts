import { template } from './MoveToDashboardModal.template';
import { Dashboard } from '../../../types';
import css from './MoveToDashboardModal.css' with { type: 'text' };

/**
 * Shared dashboard picker for the "Move to…" action. Call pick() with the list
 * of candidate dashboards; it resolves to the chosen dashboard id, or null if
 * the user dismissed the dialog.
 */
export class MoveToDashboardModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private dashboards: Dashboard[] = [];
    private resolvePromise: ((value: number | null) => void) | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    pick(dashboards: Dashboard[], currentId: number | null): Promise<number | null> {
        this.dashboards = dashboards.filter(d => d.id !== currentId);
        this.render();
        this.setupListeners();
        return new Promise<number | null>((resolve) => {
            this.resolvePromise = resolve;
            this.dialog?.showModal();
        });
    }

    private resolve(value: number | null) {
        if (this.resolvePromise) {
            this.resolvePromise(value);
            this.resolvePromise = null;
        }
        this.dialog?.close();
    }

    private setupListeners() {
        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;
        const closeBtn = this.shadowRoot!.getElementById('modal-close');
        if (closeBtn) closeBtn.onclick = () => this.resolve(null);

        if (this.dialog) {
            // Backdrop click and Escape both dismiss without a selection.
            this.dialog.onclick = (e) => {
                if (e.target === this.dialog) this.resolve(null);
            };
            this.dialog.oncancel = () => this.resolve(null);

            const list = this.shadowRoot!.querySelector('.dash-list');
            if (list) {
                (list as HTMLElement).onclick = (e) => {
                    const option = (e.target as HTMLElement).closest('.dash-option') as HTMLElement | null;
                    if (!option) return;
                    const id = parseInt(option.dataset.id || '', 10);
                    if (!Number.isNaN(id)) this.resolve(id);
                };
            }
        }
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template(this.dashboards)}
        `;
    }
}

if (!customElements.get('move-to-dashboard-modal')) {
    customElements.define('move-to-dashboard-modal', MoveToDashboardModal);
}
