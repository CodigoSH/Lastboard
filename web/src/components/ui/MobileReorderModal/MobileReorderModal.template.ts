import { i18n } from '../../../services/i18n';

/**
 * Markup for the mobile reorder / visibility bottom sheet. The body (the two
 * sections: visible + hidden) and the stylesheet are injected by the component.
 * Depends on i18n, so it is verified visually rather than via snapshot.
 */
export const mobileReorderTemplate = (bodyHtml: string, css: string): string => `
            <style>${css}</style>
            <div class="overlay" id="overlay">
                <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="mr-title">
                    <div class="header">
                        <span class="header-title" id="mr-title">${i18n.t('mobile_reorder.title') || 'Reorder for mobile'}</span>
                        <button class="btn-close" id="btn-close" aria-label="${i18n.t('mobile_reorder.cancel') || 'Cancel'}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="list" id="list">
                        ${bodyHtml}
                    </div>
                    <div class="footer">
                        <button class="btn-cancel" id="btn-cancel">${i18n.t('mobile_reorder.cancel') || 'Cancel'}</button>
                        <button class="btn-save" id="btn-save">${i18n.t('mobile_reorder.save') || 'Save changes'}</button>
                    </div>
                </div>
            </div>
        `;
