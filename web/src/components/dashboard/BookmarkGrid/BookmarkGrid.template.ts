/**
 * BookmarkGrid Component Template
 */

import { GridItem } from '../../../types';

export const template = ({ bookmarks, isEditing }: { bookmarks: GridItem[], isEditing: boolean }) => {
    // Ensure bookmarks is always an array
    const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];

    // Helper to find children
    const getChildren = (parentId: number) => safeBookmarks.filter(b => b.parent_id === parentId);

    // Root items only
    const rootItems = safeBookmarks.filter(b => !b.parent_id);

    return `
    ${rootItems.map(b => {
        const data = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
        const isSection = b.type === 'section'; // RESIZABLE BOX

        if (isSection) {
            // SECTION: Resizable Box, No Title, Container
            const children = getChildren(b.id);
            return `
            <div class="bookmark-grid__section"
               data-id="${b.id}"
               draggable="${isEditing}"
               style="--x: ${b.x}; --y: ${b.y}; --w: ${b.w}; --h: ${b.h};">
               <div class="bookmark-grid__nested-content">
                   ${renderBookmarks(children, isEditing, true)}
               </div>
               ${isEditing ? `
                <div class="bookmark-actions">
                    <button class="action-btn btn-delete" title="Delete">🗑</button>
                </div>
                <div class="resize-handle"></div>
               ` : ''}
            </div>`;
        }

        // Standard Bookmark
        return renderBookmarkCard(b, data, isEditing);
    }).join('')}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
`;
};

// ... renderBookmarkCard stays mostly the same ...
function renderBookmarkCard(b: GridItem, data: any, isEditing: boolean) {
    const icon = data.icon || '';
    const isIconUrl = icon.startsWith('http') || icon.startsWith('/');
    const iconHtml = isIconUrl
        ? `<img src="${icon}" alt="${data.label}" class="bookmark-grid__icon-img" />`
        : (icon || `<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`);

    const hrefAttr = isEditing ? 'role="button"' : `href="${data.url || '#'}" target="_blank"`;

    return `
        <a ${hrefAttr} class="bookmark-grid__card"
           draggable="${isEditing}"
           data-id="${b.id}"
           style="--x: ${b.x || 'auto'}; --y: ${b.y || 'auto'}; --w: ${b.w || 1}; --h: ${b.h || 1};">
            
            ${isEditing ? `
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="Edit">✎</button>
                    <button class="action-btn btn-delete" title="Delete">🗑</button>
                </div>
            ` : ''}

            <div class="bookmark-grid__icon-container">
                ${iconHtml}
            </div>
            <span class="bookmark-grid__label">${data.label || 'Bookmark'}</span>
            
            ${isEditing && b.type === 'section' ? '<div class="resize-handle"></div>' : ''}
            
            ${data.statusCheck ? `
                <div class="status-indicator" title="Pinging..."></div>
            ` : ''}
        </a>
    `;
}

function renderBookmarks(bookmarks: GridItem[], isEditing: boolean, isNested: boolean = false) {
    return bookmarks.map(b => {
        const data = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
        return renderBookmarkCard(b, data, isEditing);
    }).join('');
}
