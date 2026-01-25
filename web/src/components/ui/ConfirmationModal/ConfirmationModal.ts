import { template } from './ConfirmationModal.template';
// @ts-ignore
import css from './ConfirmationModal.css' with { type: 'text' };

export class ConfirmationModal extends HTMLElement {
    private isOpen: boolean = false;
    private titleText: string = 'Confirm Action';
    private messageText: string = 'Are you sure?';
    private resolvePromise: ((value: boolean) => void) | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
    }

    setupListeners() {
        // We re-render on open, so we need to re-attach listeners or attach to shadow root
        // But shadow root contents are replaced.
        // Better to attach to shadow root once and use delegation?
        // Or re-attach after render. 
        // Let's use simple delegation on shadowRoot.
    }

    private setupDynamicListeners() {
        const cancelBtn = this.shadowRoot!.getElementById('btn-cancel');
        const confirmBtn = this.shadowRoot!.getElementById('btn-confirm');
        const overlay = this.shadowRoot!.getElementById('modal-overlay');

        const close = (result: boolean) => {
            if (this.resolvePromise) {
                this.resolvePromise(result);
                this.resolvePromise = null;
            }
            this.isOpen = false;
            this.render();
        };

        if (cancelBtn) cancelBtn.onclick = () => close(false);
        if (overlay) overlay.onclick = (e) => {
            if (e.target === overlay) close(false);
        };
        if (confirmBtn) confirmBtn.onclick = () => close(true);
    }

    /**
     * Opens the modal and returns a promise that resolves to true if confirmed, false otherwise.
     */
    async confirm(title: string, message: string): Promise<boolean> {
        this.titleText = title;
        this.messageText = message;
        this.isOpen = true;
        this.render();

        return new Promise<boolean>((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            isOpen: this.isOpen,
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
