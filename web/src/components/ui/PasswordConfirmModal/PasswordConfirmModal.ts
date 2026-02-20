import { template } from './PasswordConfirmModal.template';
import { i18n } from '../../../services/i18n';
// @ts-ignore
import css from './PasswordConfirmModal.css' with { type: 'text' };

export class PasswordConfirmModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private titleText: string = i18n.t('general.confirm');
    private messageText: string = i18n.t('general.please_enter_password');
    private resolvePromise: ((value: string | null) => void) | null = null;
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
        const passwordInput = this.shadowRoot!.getElementById('password-confirm') as HTMLInputElement;
        const inputGroup = this.shadowRoot!.querySelector('.password-input-group');
        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;

        const close = (password: string | null) => {
            if (this.resolvePromise) {
                this.resolvePromise(password);
                this.resolvePromise = null;
            }
            this.dialog?.close();
            if (passwordInput) passwordInput.value = '';
        };

        const validateAndConfirm = () => {
            const val = passwordInput?.value || '';
            if (val.trim() === '') {
                // Use Toast instead of inline error
                // @ts-ignore
                if (window.notifier) {
                    // @ts-ignore
                    window.notifier.show(i18n.t('notifier.password_required'), 'error');
                }

                if (inputGroup) {
                    inputGroup.classList.remove('shake');
                    void (inputGroup as HTMLElement).offsetWidth; // Trigger reflow
                    inputGroup.classList.add('shake');
                }
                passwordInput?.focus();
                return;
            }
            close(val);
        };

        if (closeBtn) closeBtn.onclick = () => close(null);
        if (confirmBtn) confirmBtn.onclick = () => validateAndConfirm();

        // Confirm on Enter
        if (passwordInput) {
            passwordInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    validateAndConfirm();
                }
            };

            passwordInput.oninput = () => {
                if (inputGroup) {
                    inputGroup.classList.remove('shake');
                }
            };
        }

        // Close on backdrop click
        if (this.dialog) {
            this.dialog.onclick = (e) => {
                if (e.target === this.dialog) close(null);
            };
        }
    }

    /**
     * Opens the modal and returns a promise that resolves to the password if confirmed, null otherwise.
     */
    async prompt(title: string, message: string): Promise<string | null> {
        this.titleText = title;
        this.messageText = message;
        this.render();
        this.dialog?.showModal();

        const passwordInput = this.shadowRoot!.getElementById('password-confirm') as HTMLInputElement;
        if (passwordInput) {
            passwordInput.value = '';
            setTimeout(() => passwordInput.focus(), 50);
        }

        return new Promise<string | null>((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            title: this.titleText,
            message: this.messageText
        })}
        `;
        this.setupDynamicListeners();
    }
}

if (!customElements.get('password-confirm-modal')) {
    customElements.define('password-confirm-modal', PasswordConfirmModal);
}
