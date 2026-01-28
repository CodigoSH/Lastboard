interface ConfirmationModalData {
    isOpen: boolean;
    title: string;
    message: string;
}

import { i18n } from '../../../services/i18n';

export const template = ({ isOpen, title, message }: ConfirmationModalData) => `
    <div class="modal-overlay ${isOpen ? 'modal-overlay--active' : ''}" id="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" id="modal-close">
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
            <p class="modal-message">${message}</p>
            <div class="modal-actions">
                <button class="btn-confirm" id="btn-confirm">${i18n.t('general.confirm')}</button>
            </div>
        </div>
    </div>
`;
