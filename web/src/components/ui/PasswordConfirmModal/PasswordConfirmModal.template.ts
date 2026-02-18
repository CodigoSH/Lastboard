interface PasswordConfirmModalData {
    title: string;
    message: string;
}

import { i18n } from '../../../services/i18n';

export const template = ({ title, message }: PasswordConfirmModalData) => `
    <dialog id="modal">
        <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="modal-message">${message}</p>
        
        <div class="password-input-group">
            <label for="password-confirm">${i18n.t('auth.password')}</label>
            <input type="password" id="password-confirm" class="password-input" placeholder="••••••••" autocomplete="current-password">
        </div>

        <div class="modal-actions">
            <app-button variant="danger" id="btn-confirm">${i18n.t('general.confirm')}</app-button>
        </div>
    </dialog>
`;
