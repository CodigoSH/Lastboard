import { template, type ConfirmationToggle } from './ConfirmationModal.template';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { i18n } from '../../../services/i18n';
import css from './ConfirmationModal.css' with { type: 'text' };
import { isBackdropClick } from '../../../services/dialogBackdrop';

export class ConfirmationModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private titleText: string = i18n.t('general.confirm_action');
    private messageText: string = i18n.t('general.are_you_sure');
    private toggle: ConfirmationToggle | null = null;
    private toggleOn = false;
    private resolvePromise: ((value: boolean) => void) | null = null;
    private _unsubscribeI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
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

        const toggleBox = this.shadowRoot!.getElementById('cm-toggle') as HTMLInputElement | null;
        if (toggleBox && this.toggle) {
            const toggle = this.toggle;
            toggleBox.onchange = () => {
                this.toggleOn = toggleBox.checked;
                const text = this.shadowRoot!.getElementById('cm-message');
                if (text) text.textContent = this.toggleOn ? toggle.messageOn : this.messageText;
            };
        }

        if (closeBtn) closeBtn.onclick = () => close(false);
        if (confirmBtn) confirmBtn.onclick = () => close(true);

        // Close on backdrop click
        if (this.dialog) {
            this.dialog.onclick = (e) => {
                if (isBackdropClick(this.dialog!, e)) close(false);
            };
            // Escape triggers the native 'cancel' event; resolve the promise so
            // the awaiting caller doesn't hang after the dialog closes itself.
            this.dialog.oncancel = () => close(false);
        }
    }

    /**
     * Opens the modal and returns a promise that resolves to true if confirmed, false otherwise.
     */
    async confirm(title: string, message: string): Promise<boolean> {
        return (await this.ask(title, message, null)).confirmed;
    }

    /** The same, with a switch the person may turn on; says whether it was on when they confirmed. */
    async confirmWithToggle(title: string, message: string, toggle: ConfirmationToggle): Promise<{ confirmed: boolean; on: boolean }> {
        return this.ask(title, message, toggle);
    }

    private async ask(title: string, message: string, toggle: ConfirmationToggle | null): Promise<{ confirmed: boolean; on: boolean }> {
        this.titleText = title;
        this.messageText = message;
        this.toggle = toggle;
        this.toggleOn = false;
        this.render();
        this.dialog?.showModal();

        const confirmed = await new Promise<boolean>((resolve) => {
            this.resolvePromise = resolve;
        });
        return { confirmed, on: confirmed && this.toggleOn };
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            title: this.titleText,
            message: this.messageText,
            toggle: this.toggle,
            toggleOn: this.toggleOn,
        })}
        `;
        this.setupDynamicListeners();
    }
}

if (!customElements.get('confirmation-modal')) {
    customElements.define('confirmation-modal', ConfirmationModal);
}
