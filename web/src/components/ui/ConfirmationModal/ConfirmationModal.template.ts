interface ConfirmationModalData {
    isOpen: boolean;
    title: string;
    message: string;
}

import { i18n } from '../../../services/i18n';

export const template = ({ isOpen, title, message }: ConfirmationModalData) => `
    <div class="modal-overlay ${isOpen ? 'modal-overlay--active' : ''}" id="modal-overlay">
        <div class="modal-content">
            <h3 class="modal-title">${title}</h3>
            <p class="modal-message">${message}</p>
            <div class="modal-actions">
                <button class="btn-cancel" id="btn-cancel">${i18n.t('general.cancel')}</button>
                <button class="btn-confirm" id="btn-confirm">${i18n.t('general.confirm')}</button>
            </div>
        </div>
    </div>
`;
