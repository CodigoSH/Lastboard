/**
 * BookmarkGrid Component Template
 */

import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';

const esc = (s: string): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const safeUrl = (url: string): string => {
    if (!url) return '#';
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed === '#') return esc(url);
    return '#';
};

// DEEP CASCADE REMOVED per strict request.
// Only strict coordinate rendering is used.


export const template = ({ bookmarks, isEditing, isSearching, isTouchDevice, maxCols = 12 }: { bookmarks: GridItem[], isEditing: boolean, isSearching?: boolean, isTouchDevice?: boolean, maxCols?: number }) => {
    const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];
    const getChildren = (parentId: number) => safeBookmarks.filter(b => b.parent_id === parentId);

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
        const isSection = b.type === 'section';

        // STRICT COORDINATE RENDERING
        const vPos = { x: b.x || 1, y: b.y || 1 };
        const clampedW = Math.min(b.w || 1, maxCols);
        let displayH = b.h || 1;

        if (isSection) {
            const children = getChildren(b.id);
            const title = (data.title || '').trim();

            return `
            <fieldset class="bookmark-grid__section"
               data-id="${b.id}"
               data-orig-x="${b.x}" data-orig-y="${b.y}"
               draggable="${isEditing}"
               style="--x: ${vPos.x}; --y: ${vPos.y}; --w: ${clampedW}; --h: ${displayH};">
               ${title ? `<legend class="section-title">${esc(title)}</legend>` : ''}
               <div class="bookmark-grid__nested-content" style="width: 100%; height: 100%;">
                   ${renderBookmarks(children, isEditing, true, clampedW)}
               </div>
               ${isEditing ? `
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${i18n.t('general.edit')}">✎</button>
                    <button class="action-btn btn-delete" title="${i18n.t('general.delete')}">🗑</button>
                </div>
                <div class="resize-handle"></div>
               ` : ''}
            </fieldset>`;
        }

        return renderBookmarkCard(b, data, isEditing, vPos, clampedW, displayH);
    }).join('')}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
    `;
};

function renderBookmarkCard(b: GridItem, data: any, isEditing: boolean, vPos: { x: number; y: number }, clampedW: number, displayH: number = 0) {
    const finalH = displayH || b.h || 1;

    if (b.type === 'widget') {
        const widgetId = data.widgetId;
        const tagMap: Record<string, string> = {
            'clock': 'widget-clock',
            'notepad': 'widget-notepad',
            'telemetry': 'widget-telemetry'
        };
        const tagName = tagMap[widgetId] || 'div';
        const rawContent = data.text || '';
        const dataContent = rawContent.replace(/"/g, '&quot;');

        return `
        <div class="bookmark-grid__card"
            draggable="${isEditing}"
            data-id="${b.id}"
            data-type="${b.type}"
            data-orig-x="${b.x}" data-orig-y="${b.y}"
            style="--x: ${vPos.x}; --y: ${vPos.y}; --w: ${clampedW}; --h: ${finalH}; cursor: ${isEditing ? 'move' : 'default'};">

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
        ? `<img src="${esc(icon)}" alt="${esc(data.label)}" class="bookmark-grid__icon-img" draggable="false" />`
        : (icon ? esc(icon) : `<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`);

    const hrefAttr = isEditing ? 'role="button"' : `href="${safeUrl(data.url)}" target="_blank"`;

    return `
        <a ${hrefAttr} class="bookmark-grid__card"
           draggable="${isEditing}"
           data-id="${b.id}"
           data-type="${b.type}"
           data-orig-x="${b.x}" data-orig-y="${b.y}"
           style="--x: ${vPos.x}; --y: ${vPos.y}; --w: ${clampedW}; --h: ${finalH};">
            
            ${isEditing ? `
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${i18n.t('general.edit')}">✎</button>
                    <button class="action-btn btn-delete" title="${i18n.t('general.delete')}">🗑</button>
                </div>
            ` : ''}

            <div class="bookmark-grid__icon-container">
                ${iconHtml}
            </div>
            <span class="bookmark-grid__label">${esc(data.label) || 'Bookmark'}</span>
            
            ${isEditing && b.type === 'section' ? '<div class="resize-handle"></div>' : ''}
            
            ${data.statusCheck ? `
                <div class="status-indicator ${b.status ? `status-${b.status}` : ''}" 
                     title="${b.status === 'up' ? i18n.t('status.online') : (b.status === 'down' ? i18n.t('status.unreachable') : (b.status === 'pending' ? i18n.t('status.checking') : i18n.t('general.pinging')))}">
                </div>
            ` : ''}
        </a>
    `;
}

function renderBookmarks(bookmarks: GridItem[], isEditing: boolean, isNested: boolean = false, parentCols: number = 12) {
    // Strictly render children at their relative coordinates
    return bookmarks.map(b => {
        let data: any = {};
        try {
            data = typeof b.content === 'string' ? JSON.parse(b.content) : b.content;
        } catch (e) {
            console.error('Failed to parse content for item (nested)', b.id, e);
        }

        const vPos = { x: b.x || 1, y: b.y || 1 };
        const displayH = b.h || 1;
        const clampedW = Math.min(b.w || 1, parentCols);

        return renderBookmarkCard(b, data, isEditing, vPos, clampedW, displayH);
    }).join('');
}
