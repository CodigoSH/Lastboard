/** An optional switch under the message; while it is on, the message says what that changes. */
export interface ConfirmationToggle {
    label: string;
    messageOn: string;
}

interface ConfirmationModalData {
    title: string;
    message: string;
    toggle?: ConfirmationToggle | null;
    toggleOn?: boolean;
}

import { i18n } from '../../../services/i18n';
import { escapeHtml } from '../../../services/escape';

export const template = ({ title, message, toggle, toggleOn }: ConfirmationModalData) => `
    <dialog class="dialog-base" id="modal" aria-labelledby="cm-title">
        <div class="modal-header">
            <h3 class="modal-title" id="cm-title">${escapeHtml(title)}</h3>
            <button class="modal-close" id="modal-close" aria-label="${i18n.t('general.close')}">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="modal-message" id="cm-message" aria-live="polite">${escapeHtml(toggle && toggleOn ? toggle.messageOn : message)}</p>
        ${toggle ? `<label class="modal-switch"><input type="checkbox" id="cm-toggle"${toggleOn ? ' checked' : ''}><span>${escapeHtml(toggle.label)}</span></label>` : ''}
        <div class="modal-actions">
            <app-button variant="danger" id="btn-confirm">${i18n.t('general.confirm')}</app-button>
        </div>
    </dialog>
`;
