import { i18n } from '../../../services/i18n';
import { escapeHtml } from '../../../services/escape';
import { Dashboard } from '../../../types';

/**
 * A picker listing the dashboards an item can be moved to (the current board is
 * already filtered out by the caller). Shared by desktop edit-mode and the
 * mobile reorder sheet.
 */
export const template = (dashboards: Dashboard[]) => `
    <dialog class="dialog-base" id="modal" aria-labelledby="mv-title">
        <div class="modal-header">
            <h3 class="modal-title" id="mv-title">${i18n.t('bookmark.move_to')}</h3>
            <button class="modal-close" id="modal-close" aria-label="${i18n.t('general.close')}">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        ${dashboards.length === 0
        ? `<p class="modal-empty">${i18n.t('bookmark.move_no_targets')}</p>`
        : `<ul class="dash-list scroll-when-settled scroll-when-settled">
                ${dashboards.map(d => `
                    <li>
                        <button class="dash-option" data-id="${d.id}">
                            <span class="dash-name">${escapeHtml(d.name)}</span>
                            <svg class="dash-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </li>`).join('')}
              </ul>`}
    </dialog>
`;
