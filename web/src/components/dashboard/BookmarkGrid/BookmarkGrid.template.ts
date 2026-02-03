/**
 * BookmarkGrid Component Template
 */

import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';

export const template = ({ bookmarks, isEditing, isSearching, isTouchDevice }: { bookmarks: GridItem[], isEditing: boolean, isSearching?: boolean, isTouchDevice?: boolean }) => {
    // Ensure bookmarks is always an array
    const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];

    // Helper to find children
    const getChildren = (parentId: number) => safeBookmarks.filter(b => b.parent_id === parentId);

    // Root items: 
    // - Mobile: Show only leaves (bookmarks/widgets), ignore sections to prevent duplication (since sections render children too, or we just want flat leaves)
    // - Search: Show everything (flat)
    // - Desktop: Hierarchy (Roots only)
    const rootItems = isTouchDevice
        ? safeBookmarks.filter(b => b.type !== 'section')
        : (isSearching ? safeBookmarks : safeBookmarks.filter(b => !b.parent_id));

    return `
    ${rootItems.map(b => {
        let data: any = {};
        try {
            data = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
        } catch (e) {
            console.error('Failed to parse content for item', b.id, e);
        }
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
                    <button class="action-btn btn-delete" title="${i18n.t('general.delete')}">🗑</button>
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
    // Check for Widget Type
    if (b.type === 'widget') {
        // Data should look like { widgetId: 'clock', ... } or similar.
        // Actually, if we follow the creation logic, we'll store the widget registry ID in 'content.widgetId' 
        // OR we just set b.type = 'widget' but we need to know WHICH widget.
        // Let's assume content: { widgetId: 'clock', ...otherProps }

        // Fix: If no widgetId in content, fallback or error?
        // We might use a helper to look it up.

        const widgetId = data.widgetId;
        // Dynamic tag mapping
        const tagMap: Record<string, string> = {
            'clock': 'widget-clock',
            'notepad': 'widget-notepad',
            'telemetry': 'widget-telemetry'
        };

        // Fallback or Registry Lookup (we could import registry here too, but simple map is safer for now? 
        // No, imports are cheap).
        // Let's assume we mapped it.
        const tagName = tagMap[widgetId] || 'div';

        // For Notepad, we pass 'content' attribute. For others, maybe specific props.
        // We serialize `content` (which includes widgetId and other data) back to string 
        // or pass specific properties.
        // Provide item-id for persisting
        const rawContent = data.text || '';
        // ESCAPE DOUBLE QUOTES to prevent breaking the HTML attribute
        const dataContent = rawContent.replace(/"/g, '&quot;');

        return `
            <div class="bookmark-grid__card"
                draggable="${isEditing}"
                data-id="${b.id}"
                data-type="${b.type}"
                style="--x: ${b.x}; --y: ${b.y}; --w: ${b.w}; --h: ${b.h}; cursor: ${isEditing ? 'move' : 'default'};">
                
                <${tagName} 
                    item-id="${b.id}"
                    ${widgetId === 'notepad' ? `content="${dataContent}"` : ''}
                ></${tagName}>

                ${isEditing ? `
                <div class="bookmark-actions">
                     ${['clock', 'telemetry'].includes(widgetId) ? `<button class="action-btn btn-edit" title="${i18n.t('general.edit')}">✎</button>` : ''}
                     <button class="action-btn btn-delete" title="${i18n.t('general.delete')}">🗑</button>
                </div>
                ${['clock', 'telemetry'].includes(widgetId) ? '' : '<div class="resize-handle"></div>'}
                ` : ''}
            </div>
         `;
    }

    const icon = data.icon || '';
    const isIconUrl = icon.startsWith('http') || icon.startsWith('/');
    const iconHtml = isIconUrl
        ? `<img src="${icon}" alt="${data.label}" class="bookmark-grid__icon-img" draggable="false" />`
        : (icon || `<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`);

    const hrefAttr = isEditing ? 'role="button"' : `href="${data.url || '#'}" target="_blank"`;

    return `
        <a ${hrefAttr} class="bookmark-grid__card"
           draggable="${isEditing}"
           data-id="${b.id}"
           data-type="${b.type}"
           style="--x: ${b.x || 'auto'}; --y: ${b.y || 'auto'}; --w: ${b.w || 1}; --h: ${b.h || 1};">
            
            ${isEditing ? `
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${i18n.t('general.edit')}">✎</button>
                    <button class="action-btn btn-delete" title="${i18n.t('general.delete')}">🗑</button>
                </div>
            ` : ''}

            <div class="bookmark-grid__icon-container">
                ${iconHtml}
            </div>
            <span class="bookmark-grid__label">${data.label || 'Bookmark'}</span>
            
            ${isEditing && b.type === 'section' ? '<div class="resize-handle"></div>' : ''}
            
            ${data.statusCheck ? `
                <div class="status-indicator" title="${i18n.t('general.pinging')}"></div>
            ` : ''}
        </a>
    `;
}

function renderBookmarks(bookmarks: GridItem[], isEditing: boolean, isNested: boolean = false) {
    return bookmarks.map(b => {
        let data: any = {};
        try {
            data = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
        } catch (e) {
            console.error('Failed to parse content for item (nested)', b.id, e);
        }
        return renderBookmarkCard(b, data, isEditing);
    }).join('');
}
