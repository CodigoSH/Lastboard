/**
 * IconPicker Component Template
 */

import { IconInfo } from '../../../services/iconService';
import { i18n } from '../../../services/i18n';

interface IconPickerData {
    icons: IconInfo[];
    selectedIcon: string;
    searchQuery: string;
    isLoading: boolean;
}

// Static layout shell
export const layoutContainer = () => `
    <div class="icon-picker">
        <div class="icon-picker__header">
            <div class="icon-picker__search">
                <div class="icon-picker__search-container">
                    <div class="icon-picker__search-preview" id="icon-preview">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-dim);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <input type="text"
                           id="icon-search"
                           class="icon-picker__search-input"
                           placeholder="URL del icono *" />
                </div>
                <button class="icon-picker__upload-btn" id="icon-upload-btn" title="Subir icono">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </button>
                <input type="file" id="icon-upload-input" accept="image/*" style="display: none;" />
            </div>
        </div>

        <div id="grid-container" class="icon-picker__grid"></div>
    </div>
`;


export const gridTemplate = (icons: IconInfo[], selectedIcon: string, isLoading: boolean) => {
    if (isLoading) {
        return `<div class="icon-picker__loading">${i18n.t('general.loading')}</div>`;
    }

    if (icons.length === 0) {
        return `<div class="icon-picker__empty">${i18n.t('general.no_icons')}</div>`;
    }

    // Group icons by provider
    const grouped = icons.reduce((acc, icon) => {
        if (!acc[icon.provider]) acc[icon.provider] = [];
        acc[icon.provider].push(icon);
        return acc;
    }, {} as Record<string, IconInfo[]>);

    let html = '';

    for (const [provider, providerIcons] of Object.entries(grouped)) {
        html += `
            <div class="icon-picker__group">
                <div class="icon-picker__group-header">${provider}</div>
                <div class="icon-picker__group-grid">
                    ${providerIcons.map(icon => `
                        <div class="icon-picker__item ${selectedIcon === icon.url ? 'icon-picker__item--selected' : ''}"
                             data-iconurl="${icon.url}"
                             data-iconname="${icon.name}"
                             title="${icon.name}">
                            ${icon.format === 'svg' ? `<span class="icon-picker__badge badge-svg">SVG</span>` : ''}
                            ${icon.format === 'webp' ? `<span class="icon-picker__badge badge-webp">WEBP</span>` : ''}
                            <img src="${icon.url}" alt="${icon.name}" loading="lazy" />
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    return html;
};
