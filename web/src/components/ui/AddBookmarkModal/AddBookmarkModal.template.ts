/**
 * AddBookmarkModal Template
 */

interface AddBookmarkModalData {
    isOpen: boolean;
    isEditMode: boolean;
    title: string;
    url: string;
    protocol: string;
    selectedIcon: string | null;
    color: string;
    statusPosition: string;
    checkStatus: boolean;
    labelPosition: string;
    visibleTouch: boolean;
    borderWidth: number;
}

import { i18n } from '../../../services/i18n';

const premiumColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#64748b', '#f8fafc', '#1e293b', '#333333'
];

const renderAppearanceControls = (color: string, borderWidth: number) => {
    // Check if color is in presets (ignoring case usually, but here exact strings)
    const isCustom = !premiumColors.includes(color) && color !== '';

    return `
    <div class="form-group" style="margin-top: 12px;">
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
                 style="background-color: ${isCustom ? color : '#333'}">
                 <svg viewBox="0 0 24 24" style="z-index: 5; fill: white; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                 </svg>
                 <input type="color" class="premium-swatch-picker" id="bookmark-borderColor" name="borderColor" value="${isCustom ? color : '#0078D4'}">
            </div>
        </div>
    </div>

    <div class="form-group" style="margin-top: 20px;">
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

export const template = ({
    isOpen,
    isEditMode,
    title,
    url,
    protocol,
    selectedIcon,
    color,
    statusPosition,
    checkStatus,
    labelPosition,
    visibleTouch,
    borderWidth
}: AddBookmarkModalData) => `
    <dialog id="modal">
        <div class="modal-header">
            <div class="integrated-tabs">
                <button class="tab-btn active" data-tab="general">${i18n.t('general.general')}</button>
                <button class="tab-btn" data-tab="customization">${i18n.t('general.customization')}</button>
            </div>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        
        <div class="tab-container">
            <form class="modal-form" id="bookmark-form">
                <!-- TAB: GENERAL -->
                <div id="tab-general" class="tab-content active">
                    <div class="form-row" style="display: flex; gap: 12px; align-items: flex-end;">
                        <!-- Icon Box (Independent) -->
                        <div class="form-group" style="width: 42px;">
                            <button type="button" class="independent-icon-btn" id="icon-trigger-btn" title="${i18n.t('bookmark.icon')}">
                                ${selectedIcon ?
        `<img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${selectedIcon}.png" alt="icon" style="width: 24px; height: 24px; object-fit: contain;">` :
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`
    }
                            </button>
                        </div>

                        <!-- Title Field -->
                        <div class="form-group" style="flex: 1;">
                            <label for="bookmark-label">${i18n.t('bookmark.label')}</label>
                            <div class="input-group">
                                <!-- Label Position Dropdown -->
                                <div class="icon-dropdown">
                                    <button type="button" class="icon-dropdown-btn" id="label-pos-btn" title="Label Position" style="position: relative;">
                                        ${labelPosition === 'top' ?
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 8 h8" /><path d="M12 13 v2" /></svg>` :
        labelPosition === 'section' ?
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M7 4 h10" stroke-width="4" /></svg>` :
            labelPosition === 'off' ?
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>` :
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 16 h8" /><path d="M12 9 v2" /></svg>`
    }
                                        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                                            <path d="M7 10l5 5 5-5z" />
                                        </svg>
                                    </button>
                                    <input type="hidden" name="labelPos" id="bookmark-labelPos" value="${labelPosition}">
                                </div>
                                <input type="text" id="bookmark-label" name="label" placeholder="${i18n.t('bookmark.placeholder_label')}" value="${title}" required />
                            </div>
                        </div>
                    </div>

                    <!-- URL Field -->
                    <div class="form-group" style="margin-top: 12px;">
                        <label for="bookmark-url">${i18n.t('bookmark.url')}</label>
                        <div class="input-group">
                            <!-- Status Monitor Dropdown -->
                            <div class="icon-dropdown">
                                <button type="button" class="icon-dropdown-btn" id="status-pos-btn" title="Status Position" style="position: relative;">
                                    ${checkStatus ?
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" />
                                         ${statusPosition.includes('top') ? '<circle cx="16" cy="8" r="2" fill="currentColor"/>' : '<circle cx="16" cy="16" r="2" fill="currentColor"/>'}
                                         </svg>` :
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /></svg>`
    }
                                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                                        <path d="M7 10l5 5 5-5z" />
                                    </svg>
                                </button>
                                <input type="hidden" name="statusPos" id="bookmark-statusPos" value="${checkStatus ? statusPosition : 'off'}">
                            </div>

                            <!-- Protocol Dropdown -->
                            <div class="icon-dropdown protocol-dropdown">
                                <button type="button" class="icon-dropdown-btn" id="protocol-btn" title="Protocol" style="position: relative; justify-content: space-between; padding: 0 8px;">
                                    <span id="protocol-text" style="font-size: 13px; font-weight: 500;">${protocol}</span>
                                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="opacity: 0.7;">
                                        <path d="M7 10l5 5 5-5z" />
                                    </svg>
                                </button>
                                <input type="hidden" name="protocol" id="bookmark-protocol" value="${protocol}">
                            </div>

                            <input type="text" id="bookmark-url" name="url" placeholder="google.com" value="${url}" required />
                        </div>
                    </div>
                    
                    <!-- Touch Visibility -->
                    <div class="form-group" style="margin-top: 12px;">
                        <div class="input-group">
                            <div class="icon-dropdown">
                                <button type="button" class="icon-dropdown-btn" id="touch-pos-btn" style="position: relative;">
                                    ${visibleTouch ?
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /></svg>` :
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /><path d="M5 5l14 14" opacity="0.7" /></svg>`
    }
                                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                                        <path d="M7 10l5 5 5-5z" />
                                    </svg>
                                </button>
                                <input type="hidden" name="visibleTouch" id="bookmark-visibleTouch" value="${visibleTouch ? 'on' : 'off'}">
                            </div>
                            <div class="fake-input" style="flex: 1; padding: 0 14px;">
                                ${i18n.t('bookmark.visible_touch')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB: CUSTOMIZATION -->
                <div id="tab-customization" class="tab-content">
                    <!-- Appearance Controls -->
                    ${renderAppearanceControls(color, borderWidth)}
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">${i18n.t('general.save')}</button>
                </div>
            </form>
        </div>
        
        <icon-selection-modal id="icon-modal-component"></icon-selection-modal>

        <!-- Dropdown Menu Overlay -->
        <div id="menu-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;">
            <!-- Label Position Menu -->
            <div class="dropdown-menu" id="label-pos-menu">
                <div class="dropdown-item ${labelPosition === 'bottom' ? 'selected' : ''}" data-pos="bottom" title="Label Below">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 16 h8" /><path d="M12 9 v2" /></svg>
                </div>
                <div class="dropdown-item ${labelPosition === 'top' ? 'selected' : ''}" data-pos="top" title="Label Above">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="16" height="14" rx="2" stroke-opacity="0.5" /><path d="M8 8 h8" /><path d="M12 13 v2" /></svg>
                </div>
                <div class="dropdown-item ${labelPosition === 'section' ? 'selected' : ''}" data-pos="section" title="Section Style">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M7 4 h10" stroke-width="4" /></svg>
                </div>
                <div class="dropdown-item ${labelPosition === 'off' ? 'selected' : ''}" data-pos="off" title="Hidden (No Name)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>
                </div>
            </div>

            <!-- Status Position Menu -->
            <div class="dropdown-menu" id="status-pos-menu">
                <div class="dropdown-item ${!checkStatus ? 'selected' : ''}" data-status-pos="off" title="Off">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /></svg>
                </div>
                <div class="dropdown-item ${statusPosition === 'top-left' ? 'selected' : ''}" data-status-pos="top-left" title="Top Left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
                </div>
                <div class="dropdown-item ${statusPosition === 'top-right' ? 'selected' : ''}" data-status-pos="top-right" title="Top Right">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="16" cy="8" r="2" fill="currentColor"/></svg>
                </div>
                <div class="dropdown-item ${statusPosition === 'bottom-left' ? 'selected' : ''}" data-status-pos="bottom-left" title="Bottom Left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="8" cy="16" r="2" fill="currentColor"/></svg>
                </div>
                <div class="dropdown-item ${statusPosition === 'bottom-right' ? 'selected' : ''}" data-status-pos="bottom-right" title="Bottom Right">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="16" cy="16" r="2" fill="currentColor"/></svg>
                </div>
            </div>

            <!-- Protocol Menu -->
            <div class="dropdown-menu" id="protocol-menu" style="width: 85px;">
                <div class="dropdown-item ${protocol === 'http://' ? 'selected' : ''}" data-protocol="http://" title="HTTP">
                    <span style="font-size: 13px;">http://</span>
                </div>
                <div class="dropdown-item ${protocol === 'https://' ? 'selected' : ''}" data-protocol="https://" title="HTTPS">
                    <span style="font-size: 13px;">https://</span>
                </div>
            </div>

            <!-- Touch Visibility Menu -->
            <div class="dropdown-menu" id="touch-pos-menu">
                <div class="dropdown-item ${visibleTouch ? 'selected' : ''}" data-touch="on" title="Visible">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /></svg>
                </div>
                <div class="dropdown-item ${!visibleTouch ? 'selected' : ''}" data-touch="off" title="Hidden">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /><path d="M5 5l14 14" opacity="0.7" /></svg>
                </div>
            </div>


        </div>
    </dialog>
`;
