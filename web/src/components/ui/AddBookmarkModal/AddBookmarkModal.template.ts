/**
 * AddBookmarkModal Template
 */

interface AddBookmarkModalData {
    isOpen: boolean;
    isEditMode: boolean;

}

import { i18n } from '../../../services/i18n';

export const template = ({ isOpen, isEditMode }: AddBookmarkModalData) => `
    <div class="modal-overlay ${isOpen ? 'modal-overlay--active' : ''}" id="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">${isEditMode ? i18n.t('bookmark.edit') : i18n.t('bookmark.add')}</h2>
                <button class="modal-close" id="modal-close">×</button>
            </div>
            <form class="modal-form" id="bookmark-form">
                <div class="form-group">
                    <label for="bookmark-label">${i18n.t('bookmark.label')}</label>
                    <input type="text" id="bookmark-label" name="label" placeholder="${i18n.t('bookmark.placeholder_label')}" required />
                </div>
                <div class="form-group">
                    <label for="bookmark-url">${i18n.t('bookmark.url')}</label>
                    <input type="url" id="bookmark-url" name="url" placeholder="${i18n.t('bookmark.placeholder_url')}" required />
                </div>
                <div class="form-group">
                    <label>${i18n.t('bookmark.icon')}</label>
                    <div id="icon-picker-container"></div>
                </div>
                <div class="form-group checkbox-group" style="flex-direction: row; align-items: center; gap: 8px;">
                    <input type="checkbox" id="bookmark-status" name="statusCheck" />
                    <label for="bookmark-status" style="margin: 0; cursor: pointer;">${i18n.t('bookmark.monitor_status')}</label>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" id="btn-cancel">${i18n.t('general.cancel')}</button>
                    <button type="submit" class="btn-submit">${i18n.t('general.save')}</button>
                </div>
            </form>
        </div>
    </div>
`;
