/**
 * IconPicker Component Template
 */

import { IconInfo } from '../../../services/iconService';

interface IconPickerData {
    icons: IconInfo[];
    selectedIcon: string;
    searchQuery: string;
    isLoading: boolean;
}

// Static layout shell
export const layoutContainer = () => `
    <div class="icon-picker">
        <div id="selected-container"></div>

        <div class="icon-picker__search">
            <input type="text"
                   id="icon-search"
                   class="icon-picker__search-input"
                   placeholder="Search icons..." />
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
        <span class="icon-picker__selected-name">${selectedIcon}</span>
    </div>
` : '';

export const gridTemplate = (icons: IconInfo[], selectedIcon: string, isLoading: boolean) => {
    if (isLoading) {
        return `<div class="icon-picker__loading">Loading icons...</div>`;
    }

    if (icons.length === 0) {
        return `<div class="icon-picker__empty">No icons found</div>`;
    }

    return icons.map(icon => `
        <div class="icon-picker__item ${selectedIcon === icon.name ? 'icon-picker__item--selected' : ''}"
             data-icon="${icon.name}"
             title="${icon.name}">
            <img src="${icon.url}" alt="${icon.name}" loading="lazy" />
        </div>
    `).join('');
};
