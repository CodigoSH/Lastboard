import { layout } from './IconSelectionModal.template';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import css from './IconSelectionModal.css' with { type: 'text' };
import '../IconPicker/IconPicker'; // Ensure IconPicker is registered

export class IconSelectionModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private resolvePromise: ((value: string | null) => void) | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
    }

    connectedCallback() {
        this.render();
        this.setupHandlers();
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${layout()}
        `;
        this.dialog = this.shadowRoot!.getElementById('icon-modal') as HTMLDialogElement;
    }

    setupHandlers() {
        const closeBtn = this.shadowRoot!.getElementById('close-btn');
        closeBtn?.addEventListener('click', () => this.close(null));

        // Prevent closing on backdrop click (user must select or click X)
        // this.dialog?.addEventListener('click', (e) => {
        //     if (e.target === this.dialog) {
        //         this.close(null);
        //     }
        // });

        // Listen for icon selection from the child component
        this.shadowRoot!.addEventListener('icon-selected', (e: Event) => {
            const customEvent = e as CustomEvent;
            this.close(customEvent.detail.iconName);
        });
    }

    async open(): Promise<string | null> {
        if (!this.dialog) return null;

        this.dialog.showModal();

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    close(iconName: string | null) {
        if (this.dialog && this.dialog.open) {
            this.dialog.close();
            // Animation handling could go here if we want to wait for it
        }

        if (this.resolvePromise) {
            this.resolvePromise(iconName);
            this.resolvePromise = null;
        }
    }
}

if (!customElements.get('icon-selection-modal')) {
    customElements.define('icon-selection-modal', IconSelectionModal);
}
