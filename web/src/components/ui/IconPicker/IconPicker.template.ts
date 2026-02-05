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
            <div id="selected-container"></div>
            <div class="icon-picker__search">
                <input type="text"
                       id="icon-search"
                       class="icon-picker__search-input"
                       placeholder="${i18n.t('general.search')}" />
            </div>
        </div>

        <div id="grid-container" class="icon-picker__grid"></div>
    </div>
`;

// Dynamic parts
export const selectedIconTemplate = (selectedIcon: string) => selectedIcon ? `
    <div class="icon-picker__selected">
        <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${selectedIcon}.png"
             alt="${selectedIcon}"
             class="icon-picker__preview" />
    </div>
` : `
    <div class="icon-picker__placeholder">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
    </div>
`;

export const gridTemplate = (icons: IconInfo[], selectedIcon: string, isLoading: boolean) => {
    if (isLoading) {
        return `<div class="icon-picker__loading">${i18n.t('general.loading')}</div>`;
    }

    if (icons.length === 0) {
        return `<div class="icon-picker__empty">${i18n.t('general.no_icons')}</div>`;
    }

    return icons.map(icon => `
        <div class="icon-picker__item ${selectedIcon === icon.name ? 'icon-picker__item--selected' : ''}"
             data-icon="${icon.name}"
             title="${icon.name}">
            <img src="${icon.url}" alt="${icon.name}" loading="lazy" />
        </div>
    `).join('');
};
