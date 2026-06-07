import { i18n } from '../../../services/i18n';

/**
 * Markup for the dashboard reorder modal. The list items HTML and the stylesheet
 * are injected by the component. Depends on i18n, so it is verified visually
 * rather than via snapshot.
 */
export const dashboardManagerTemplate = (itemsHtml: string, css: string): string => `
            <style>${css}</style>
            <div class="overlay" id="overlay">
                <div class="sheet">
                    <div class="header">
                        <span class="header-title">${i18n.t('dashboard.manage_order')}</span>
                        <button class="btn-close" id="btn-close" aria-label="Close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="list" id="list">
                        ${itemsHtml}
                    </div>
                    <div class="footer">
                        <button class="btn-cancel" id="btn-cancel">${i18n.t('general.cancel')}</button>
                        <button class="btn-save" id="btn-save">${i18n.t('dashboard.save_order')}</button>
                    </div>
                </div>
            </div>
        `;
