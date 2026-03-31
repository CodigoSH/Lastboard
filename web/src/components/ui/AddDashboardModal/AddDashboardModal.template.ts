import { i18n } from '../../../services/i18n';

export const template = ({ name, error }: { name: string; error: string }) => `
    <dialog id="modal">
        <div class="modal-header">
            <div class="modal-title">${i18n.t('dashboard.modal_title')}</div>
            <button class="modal-close" id="modal-close" type="button">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        
        <div class="modal-body">
            <div class="form-group">
                <label for="dashboard-name">${i18n.t('dashboard.name_label') || 'Name'}</label>
                <input type="text" id="dashboard-name" value="${name}" autofocus autocomplete="off" />
                <div class="error-message ${error ? 'visible' : ''}">${error}</div>
            </div>
        </div>
        
        <div class="actions">
            <button type="button" class="btn btn-primary" id="confirm-btn">${i18n.t('dashboard.create')}</button>
        </div>
    </dialog>
`;
