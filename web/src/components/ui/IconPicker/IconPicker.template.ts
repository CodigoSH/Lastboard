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

export const template = ({ icons, selectedIcon, searchQuery, isLoading }: IconPickerData) => `
    <div class="icon-picker">
        ${selectedIcon ? `
            <div class="icon-picker__selected">
                <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${selectedIcon}.png"
                     alt="${selectedIcon}"
                     class="icon-picker__preview" />
                <span class="icon-picker__selected-name">${selectedIcon}</span>
            </div>
        ` : ''}

        <div class="icon-picker__search">
            <input type="text"
                   id="icon-search"
                   class="icon-picker__search-input"
                   placeholder="Search icons..."
                   value="${searchQuery}" />
        </div>

        ${searchQuery.trim() ? `
            <div class="icon-picker__grid">
                ${isLoading ? `
                    <div class="icon-picker__loading">Loading icons...</div>
                ` : icons.length === 0 ? `
                    <div class="icon-picker__empty">No icons found</div>
                ` : icons.map(icon => `
                    <div class="icon-picker__item ${selectedIcon === icon.name ? 'icon-picker__item--selected' : ''}"
                         data-icon="${icon.name}"
                         title="${icon.name}">
                        <img src="${icon.url}" alt="${icon.name}" loading="lazy" />
                    </div>
                `).join('')}
            </div>
        ` : ''}
    </div>
`;
