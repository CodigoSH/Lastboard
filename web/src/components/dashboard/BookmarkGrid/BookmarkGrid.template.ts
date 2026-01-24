/**
 * BookmarkGrid Component Template
 */

import { GridItem } from '../../../types';

export const template = ({ bookmarks, isEditing }: { bookmarks: GridItem[], isEditing: boolean }) => {
    // Ensure bookmarks is always an array
    const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];

    return `
    ${safeBookmarks.map(b => {
        const data = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
        const isGroup = b.type === 'group';

        if (isGroup) {
            return `
            <div class="bookmark-grid__group" 
               draggable="${isEditing}"
               data-id="${b.id}"
               style="--x: ${b.x}; --y: ${b.y}; --w: ${b.w}; --h: ${b.h};">
               <div class="bookmark-grid__group-header">${data.name || 'Group'}</div>
            </div>`;
        }

        // Determine if icon is a URL or SVG
        const icon = data.icon || '';
        const isIconUrl = icon.startsWith('http') || icon.startsWith('/');
        const iconHtml = isIconUrl
            ? `<img src="${icon}" alt="${data.label}" class="bookmark-grid__icon-img" />`
            : (icon || `<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`);

        return `
        <a href="${data.url || '#'}" class="bookmark-grid__card" target="_blank"
           draggable="${isEditing}"
           data-id="${b.id}"
           style="--x: ${b.x || 'auto'}; --y: ${b.y || 'auto'}; --w: ${b.w || 1}; --h: ${b.h || 1}; aspect-ratio: ${b.w || 1} / ${b.h || 1};">
            <div class="bookmark-grid__icon-container">
                ${iconHtml}
            </div>
            <span class="bookmark-grid__label">${data.label || 'Bookmark'}</span>
            ${isEditing ? '<div class="resize-handle"></div>' : ''}
        </a>
    `;
    }).join('')}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
`;
};
