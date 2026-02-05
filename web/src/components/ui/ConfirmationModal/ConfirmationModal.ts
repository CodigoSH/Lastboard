import { template } from './ConfirmationModal.template';
import { i18n } from '../../../services/i18n';
// @ts-ignore
import css from './ConfirmationModal.css' with { type: 'text' };

export class ConfirmationModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private titleText: string = 'Confirm Action';
    private messageText: string = 'Are you sure?';
    private resolvePromise: ((value: boolean) => void) | null = null;
    private _unsubscribeI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this._unsubscribeI18n = i18n.subscribe(() => {
            if (this.dialog?.open) this.render();
        });
    }

    disconnectedCallback() {
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    private setupDynamicListeners() {
        const closeBtn = this.shadowRoot!.getElementById('modal-close');
        const confirmBtn = this.shadowRoot!.getElementById('btn-confirm');
        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;

        const close = (result: boolean) => {
            if (this.resolvePromise) {
                this.resolvePromise(result);
                this.resolvePromise = null;
            }
            this.dialog?.close();
        };

        if (closeBtn) closeBtn.onclick = () => close(false);
        if (confirmBtn) confirmBtn.onclick = () => close(true);

        // Close on backdrop click
        if (this.dialog) {
            this.dialog.onclick = (e) => {
                if (e.target === this.dialog) close(false);
            };
        }
    }

    /**
     * Opens the modal and returns a promise that resolves to true if confirmed, false otherwise.
     */
    async confirm(title: string, message: string): Promise<boolean> {
        this.titleText = title;
        this.messageText = message;
        this.render();
        this.dialog?.showModal();

        return new Promise<boolean>((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            isOpen: true,
            title: this.titleText,
            message: this.messageText
        })}
        `;
        this.setupDynamicListeners();
    }
}

if (!customElements.get('confirmation-modal')) {
    customElements.define('confirmation-modal', ConfirmationModal);
}
