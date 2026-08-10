import { i18n } from '../../../services/i18n';

/**
 * Appearance controls (border color grid + border width segmented control).
 * Extracted here because it was duplicated verbatim in the generic form and the
 * docker form. Depends on i18n, so it is verified visually rather than via
 * snapshot.
 */
export const appearanceControlsTemplate = (
    premiumColors: string[],
    color: string,
    borderWidth: number
): string => {
    const isCustom = !premiumColors.includes(color) && color !== '';

    return `
            <div class="field-group" style="margin-top: 12px; border-top: 1px solid var(--border); padding-top: 16px;">
                <label>${i18n.t('bookmark.border_color') || 'Border Color'}</label>
                <div class="premium-color-grid">
                    ${premiumColors.map(c => `
                        <div class="premium-color-swatch ${color === c ? 'active' : ''}"
                            style="background-color: ${c}"
                            data-color="${c}">
                            ${color === c ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>' : ''}
                        </div>
                    `).join('')}

                    <div class="premium-color-swatch premium-color-swatch--custom ${isCustom ? 'active' : ''}"
                        style="background-color: ${isCustom ? color : 'transparent'}">
                        <svg viewBox="0 0 24 24" style="z-index: 5; fill: white; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); pointer-events: none;">
                            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                        </svg>
                        <app-color-picker class="premium-swatch-picker" id="widget-borderColor" trigger-opacity="0" value="${isCustom ? color : '#e8520e'}"></app-color-picker>
                    </div>
                </div>
            </div>

            <div class="field-group" style="margin-top: 20px;">
                <label>${i18n.t('bookmark.border_width') || 'Border Width'}</label>
                <div class="segmented-control">
                    <button type="button" class="border-width-btn ${borderWidth === 1 ? 'active' : ''}" data-width="1">
                        <div style="height: 1px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                        <span>${i18n.t('general.thin') || 'Thin'}</span>
                    </button>
                    <button type="button" class="border-width-btn ${borderWidth === 2 ? 'active' : ''}" data-width="2">
                        <div style="height: 2px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                        <span>${i18n.t('general.regular') || 'Regular'}</span>
                    </button>
                    <button type="button" class="border-width-btn ${borderWidth === 3 ? 'active' : ''}" data-width="3">
                        <div style="height: 3px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                        <span>${i18n.t('general.thick') || 'Thick'}</span>
                    </button>
                </div>
            </div>
            `;
};
