/**
 * AddBookmarkModal Template
 */

interface AddBookmarkModalData {
    isOpen: boolean;
    isEditMode: boolean;

}

import { i18n } from '../../../services/i18n';

export const template = ({ isOpen, isEditMode }: AddBookmarkModalData) => `
    <dialog id="modal">
        <div class="modal-header">
            <h2 class="modal-title">${isEditMode ? i18n.t('bookmark.edit') : i18n.t('bookmark.add')}</h2>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
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

            <!-- Status Check & Touch Visibility on same row -->
            <div class="visibility-row">
                <div class="checkbox-group">
                    <label for="bookmark-status">${i18n.t('bookmark.monitor_status')}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bookmark-status" name="statusCheck" />
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="checkbox-group">
                    <label for="bookmark-touch">${i18n.t('bookmark.visible_touch')}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bookmark-touch" name="visibleTouch" checked />
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="form-actions">
                <app-button type="submit" variant="primary" class="btn-submit">${i18n.t('general.save')}</app-button>
            </div>
        </form>
    </dialog>
`;
