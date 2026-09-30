import { template } from './BackupModal.template';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { i18n } from '../../../services/i18n';
import { escapeHtml } from '../../../services/escape';
import { setupPasswordToggles } from '../../../services/passwordToggle';
import css from './BackupModal.css' with { type: 'text' };

/**
 * Asks how a backup should leave the server: as it is, or sealed under a
 * password chosen here. The password is optional; leaving it empty downloads
 * the plain file, and the warning above the fields says what that file holds.
 */
export class BackupModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private resolvePromise: ((value: string | null) => void) | null = null;
    private _unsubscribeI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
        setupPasswordToggles(this.shadowRoot!);
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
        const password = this.shadowRoot!.getElementById('backup-password') as HTMLInputElement;
        const confirm = this.shadowRoot!.getElementById('backup-password-confirm') as HTMLInputElement;
        const note = this.shadowRoot!.getElementById('backup-note');
        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;

        const close = (value: string | null) => {
            if (this.resolvePromise) {
                this.resolvePromise(value);
                this.resolvePromise = null;
            }
            this.dialog?.close();
            if (password) password.value = '';
            if (confirm) confirm.value = '';
            if (note) note.hidden = true;
        };

        const submit = () => {
            const value = password?.value || '';
            if (value !== (confirm?.value || '')) {
                if (window.notifier) window.notifier.show(i18n.t('backup.password_mismatch'), 'error');
                confirm?.focus();
                return;
            }
            close(value);
        };

        if (closeBtn) closeBtn.onclick = () => close(null);
        if (confirmBtn) confirmBtn.onclick = () => submit();

        // A password is only being chosen once something is typed; the plain
        // download has nothing to lose, so nothing to warn about.
        if (password && note) {
            password.oninput = () => { note.hidden = password.value === ''; };
        }
        for (const input of [password, confirm]) {
            if (!input) continue;
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                }
            };
        }

        if (this.dialog) {
            this.dialog.onclick = (e) => {
                if (e.target === this.dialog) close(null);
            };
            this.dialog.oncancel = () => close(null);
        }
    }

    /**
     * Opens the dialog. Resolves to null when cancelled, to an empty string for
     * the plain file, or to the password to protect it with.
     */
    async prompt(): Promise<string | null> {
        this.render();
        this.dialog?.showModal();
        const password = this.shadowRoot!.getElementById('backup-password') as HTMLInputElement;
        setTimeout(() => password?.focus(), 50);

        return new Promise<string | null>((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
                title: escapeHtml(i18n.t('action.download_backup')),
                warning: escapeHtml(i18n.t('backup.warn_plain')),
                noRecovery: escapeHtml(i18n.t('backup.warn_no_recovery')),
                passwordLabel: escapeHtml(i18n.t('backup.password_label')),
                confirmLabel: escapeHtml(i18n.t('settings.confirm_password')),
                action: escapeHtml(i18n.t('action.download_backup')),
            })}
        `;
        this.setupDynamicListeners();
    }
}

if (!customElements.get('backup-modal')) {
    customElements.define('backup-modal', BackupModal);
}
