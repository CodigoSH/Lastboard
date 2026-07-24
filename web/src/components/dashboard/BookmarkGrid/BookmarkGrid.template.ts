/**
 * BookmarkGrid Component Template
 */

import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';

const ICON_EDIT = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
const ICON_MOVE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;

const esc = (s: string): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const safeUrl = (url: string): string => {
    if (!url) return '#';
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed === '#') return esc(url);
    return '#';
};

// DEEP CASCADE REMOVED per strict request.
// Only strict coordinate rendering is used.


export const template = ({ bookmarks, isEditing, isLoading, isSearching, isTouchDevice, maxCols = 12 }: { bookmarks: GridItem[], isEditing: boolean, isLoading: boolean, isSearching?: boolean, isTouchDevice?: boolean, maxCols?: number }) => {
    const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];

    if (isLoading && safeBookmarks.length === 0) {
        return renderSkeletons(maxCols);
    }

    const getChildren = (parentId: number) => safeBookmarks.filter(b => b.parent_id === parentId);

    const rootItems = isTouchDevice
        ? safeBookmarks  // Filtered to type=bookmark only by applyFilters()
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

            const borderColorStyle = (data.borderColor && data.borderColor !== '#333333' && !isEditing) ? `border-color: ${data.borderColor} !important;` : '';
            const borderWidthStyle = (data.borderWidth !== undefined && !isEditing) ? `border-width: ${data.borderWidth}px !important;` : '';

            return `
            <fieldset class="bookmark-grid__section"
               data-id="${b.id}"
               data-orig-x="${b.x}" data-orig-y="${b.y}"
               draggable="${isEditing && !isTouchDevice}"
               style="--x: ${vPos.x}; --y: ${vPos.y}; --w: ${clampedW}; --h: ${displayH}; ${borderColorStyle} ${borderWidthStyle}">
               ${title ? `<legend class="section-title">${esc(title)}</legend>` : ''}
               <div class="bookmark-grid__nested-content" style="width: 100%; height: 100%;">
                   ${renderBookmarks(children, isEditing, true, clampedW, isTouchDevice)}
               </div>
               ${isEditing ? `
                <div class="bookmark-actions">
                    <button class="action-btn btn-move" title="${i18n.t('bookmark.move')}">${ICON_MOVE}</button>
                    <button class="action-btn btn-edit" title="${i18n.t('general.edit')}">${ICON_EDIT}</button>
                    <button class="action-btn btn-delete" title="${i18n.t('general.delete')}">${ICON_TRASH}</button>
                </div>
                <div class="resize-handle"></div>
               ` : ''}
            </fieldset>`;
        }

        return renderBookmarkCard(b, data, isEditing, vPos, clampedW, displayH, isTouchDevice);
    }).join('')}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
    `;
};

function renderBookmarkCard(b: GridItem, data: any, isEditing: boolean, vPos: { x: number; y: number }, clampedW: number, displayH: number = 0, isTouchDevice: boolean = false) {
    const finalH = displayH || b.h || 1;

    if (b.type === 'widget') {
        const widgetId = data.widgetId;
        const tagMap: Record<string, string> = {
            'clock': 'widget-clock',
            'notepad': 'widget-notepad',
            'telemetry': 'widget-telemetry',
            'weather': 'widget-weather',
            'markdown': 'widget-markdown',
            'docker': 'widget-docker'
        };
        const tagName = tagMap[widgetId] || 'div';
        const rawContent = data.text || '';
        const dataContent = rawContent.replace(/"/g, '&quot;');

        const borderColorStyle = (data.borderColor && data.borderColor !== '#333333' && !isEditing) ? `border-color: ${data.borderColor} !important;` : '';
        const borderWidthStyle = (data.borderWidth !== undefined && !isEditing) ? `border-width: ${data.borderWidth}px !important;` : '';

        return `
        <div class="bookmark-grid__card"
            draggable="${isEditing && !isTouchDevice}"
            data-id="${b.id}"
            data-type="${b.type}"
            data-orig-x="${b.x}" data-orig-y="${b.y}"
            ${!isTouchDevice ? `style="--x: ${vPos.x}; --y: ${vPos.y}; --w: ${clampedW}; --h: ${finalH}; ${borderColorStyle} ${borderWidthStyle}"` : ''}>

            <${tagName}
                item-id="${b.id}"
                data-editing="${isEditing}"
                ${widgetId === 'notepad' ? `content="${dataContent}"` : ''}
            ></${tagName}>

            ${isEditing ? `
            <div class="bookmark-actions">
                 <button class="action-btn btn-move" title="${i18n.t('bookmark.move')}">${ICON_MOVE}</button>
                 ${['clock', 'telemetry', 'weather', 'notepad', 'markdown', 'docker'].includes(widgetId) ? `<button class="action-btn btn-edit" title="${i18n.t('general.edit')}">${ICON_EDIT}</button>` : ''}
                 <button class="action-btn btn-delete" title="${i18n.t('general.delete')}">${ICON_TRASH}</button>
            </div>
            ${['clock', 'telemetry', 'weather'].includes(widgetId) ? '' : '<div class="resize-handle"></div>'}
            ` : ''}
        </div>
    `;
    }

    const icon = data.icon || '';
    const isIconUrl = icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:');
    const iconHtml = isIconUrl
        ? `<img src="${esc(icon)}" alt="${esc(data.label)}" class="bookmark-grid__icon-img" draggable="false" />`
        : (icon ? esc(icon) : `<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`);

    const hrefAttr = isEditing ? 'role="button"' : `href="${safeUrl(data.url)}" target="_blank" rel="noopener noreferrer"`;

    const vPosStyle = !isTouchDevice ? `--x: ${vPos.x}; --y: ${vPos.y}; --w: ${clampedW}; --h: ${finalH};` : '';
    const borderColorStyle = (data.borderColor && data.borderColor !== '#333333' && !isEditing) ? `border-color: ${data.borderColor} !important;` : '';
    const labelPosClass = data.labelPos === 'top' ? 'label-top' : (data.labelPos === 'section' ? 'label-section' : (data.labelPos === 'off' ? 'label-off' : ''));

    return `
        <a ${hrefAttr} class="bookmark-grid__card ${labelPosClass}"
           draggable="${isEditing && !isTouchDevice}"
           data-id="${b.id}"
           data-type="${b.type}"
           data-orig-x="${b.x}" data-orig-y="${b.y}"
           style="${vPosStyle} ${borderColorStyle} ${(data.borderWidth !== undefined && !isEditing) ? `border-width: ${data.borderWidth}px !important;` : ''}">
            
            ${isEditing ? `
                <div class="bookmark-actions">
                    <button class="action-btn btn-move" title="${i18n.t('bookmark.move')}">${ICON_MOVE}</button>
                    <button class="action-btn btn-edit" title="${i18n.t('general.edit')}">${ICON_EDIT}</button>
                    <button class="action-btn btn-delete" title="${i18n.t('general.delete')}">${ICON_TRASH}</button>
                </div>
            ` : ''}

            <div class="bookmark-grid__icon-container">
                ${iconHtml}
            </div>
            <span class="bookmark-grid__label">${esc(data.label) || 'Bookmark'}</span>
            
            ${isEditing && b.type === 'section' ? '<div class="resize-handle"></div>' : ''}
            
            ${data.statusCheck ? `
                <div class="status-indicator ${b.status ? `status-${b.status}` : ''} ${data.statusPos ? `status-pos-${data.statusPos}` : ''}" 
                     title="${b.status === 'up' ? i18n.t('status.online') : (b.status === 'down' ? i18n.t('status.unreachable') : (b.status === 'pending' ? i18n.t('status.checking') : i18n.t('general.pinging')))}">
                </div>
            ` : ''}
        </a>
    `;
}

function renderBookmarks(bookmarks: GridItem[], isEditing: boolean, _isNested: boolean = false, parentCols: number = 12, isTouchDevice: boolean = false) {
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

        return renderBookmarkCard(b, data, isEditing, vPos, clampedW, displayH, isTouchDevice);
    }).join('');
}

function renderSkeletons(maxCols: number) {
    const skeletons = Array(8).fill(null);
    return `
        <style>
            .skeleton {
                background: var(--surface);
                pointer-events: none;
                animation: skeleton-shimmer 1.5s infinite linear;
                background: linear-gradient(
                    90deg,
                    var(--surface) 25%,
                    var(--border) 50%,
                    var(--surface) 75%
                );
                background-size: 200% 100%;
            }
            .skeleton-icon {
                width: 40px;
                height: 40px;
                background: var(--border);
                border-radius: 50%;
                margin-bottom: 12px;
            }
            .skeleton-text {
                width: 60%;
                height: 8px;
                background: var(--border);
                border-radius: 4px;
            }
            @keyframes skeleton-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        </style>
        ${skeletons.map((_, i) => `
            <div class="bookmark-grid__card skeleton" style="--x: ${(i % maxCols) + 1}; --y: ${Math.floor(i / maxCols) + 1}; --w: 1; --h: 1;">
                <div class="skeleton-icon"></div>
                <div class="skeleton-text"></div>
            </div>
        `).join('')}
    `;
}
