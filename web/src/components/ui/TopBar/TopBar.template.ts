/**
 * TopBar Component Template
 */

interface TopBarData {
    title: string;
    editMode: boolean;
    searchActive: boolean;
    addMenuActive: boolean;
    drawerOpen: boolean;
    searchQuery: string;
    isDemo?: boolean;
    currentDashboardId?: number | null;
    projectLogo?: string;
    isTouchDevice?: boolean;
    monitoringOn?: boolean;
    proxmoxOn?: boolean;
    proxmoxOpen?: boolean;
    dockerOn?: boolean;
    dockerOpen?: boolean;
    monitorOpen?: boolean;
}

import { i18n } from '../../../services/i18n';
import { escapeHtml, safeImageSrc } from '../../../services/escape';
import { accessAllows } from '../../../services/access';
import type { User } from '../../../types';
import '../DashboardSwitcher/DashboardSwitcher';

export const template = ({ title, editMode, selectMode, selectedCount, searchActive, addMenuActive, drawerOpen, searchQuery, updateAvailable, isDemo, projectLogo, monitoringOn, monitorOpen, proxmoxOn, proxmoxOpen, dockerOn, dockerOpen, user }: TopBarData & { user?: User | null, updateAvailable?: boolean, selectMode?: boolean, selectedCount?: number }) => {
    // Edit mode, the settings drawer and the status page are exclusive: each one
    // takes over the UI, so while any of them is active every unrelated control
    // is greyed out and only the one that leads back out stays clickable.
    // A full-screen page locks the bar behind it. Proxmox was missing here,
    // which left the board's own search live under the page's one — two search
    // boxes, one of them filtering a board nobody could see.
    const locked = editMode || drawerOpen || monitorOpen || proxmoxOpen || dockerOpen;
    // What the account may not do is left out, not greyed: the server decides
    // every route, this only keeps the bar from offering what would be refused.
    const may = (cap: string) => accessAllows(user, cap);
    return `
    <div class="top-bar">
        <div style="display: flex; align-items: center; gap: 8px;">
            <a class="top-bar__brand" href="/">
                <img src="${safeImageSrc(projectLogo || '/images/logo.png')}" class="top-bar__logo" alt="" aria-hidden="true">
                <div class="top-bar__title">${escapeHtml(title)}</div>
            </a>
            ${isDemo ? `<div class="top-bar__demo-badge">${i18n.t('general.demo_mode')}</div>` : ''}
        </div>
        <div class="top-bar__actions">
            <!-- Offline Indicator -->
            <offline-badge></offline-badge>

            <!-- Select / bulk-move (edit mode only) -->
            ${editMode ? (selectMode ? `
            <div class="tb-bulk">
                <span class="tb-bulk__count">${selectedCount || 0}</span>
                <button id="bulk-move" class="tb-bulk__move"${(selectedCount || 0) === 0 ? ' disabled' : ''}>${i18n.t('bookmark.move')}</button>
                <button id="bulk-clear" class="tb-bulk__clear" title="${i18n.t('general.cancel')}" aria-label="${i18n.t('general.cancel')}">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            ` : `
            <button id="select-toggle" class="tb-select-btn">${i18n.t('bookmark.select')}</button>
            `) : ''}

            <!-- Search Bar -->
            <div id="search-wrapper" class="search-wrapper ${searchActive ? 'search-wrapper--active' : ''} ${locked ? 'search-wrapper--disabled' : ''}" title="${i18n.t('general.search')}">
                <input type="text" id="search-input" class="search-input" placeholder="${i18n.t('general.search')}" 
                       value="${escapeHtml(searchQuery || '')}">
                <div id="search-clear" class="search-clear" style="display: ${searchQuery ? 'flex' : 'none'};">×</div>
                <!-- Opens the search, and closes it again once open: one
                     control both ways, which is what makes the way out
                     findable. It leads the field rather than trailing it, so
                     the pill reads as a search box and not as an icon that
                     grew. -->
                <svg class="search-icon" id="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     role="button" tabindex="${searchActive ? '0' : '-1'}"
                     aria-label="${searchActive ? i18n.t('general.close') : i18n.t('general.search')}">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
                </svg>
            </div>
            <!-- Add Item Toggle -->
            <div id="add-toggle" class="top-bar__toggle" title="${i18n.t('topbar.add_tooltip')}" 
                 style="${editMode ? 'display: flex;' : 'display: none;'} margin-right: -6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Menu Dropdown -->
            <div id="add-menu" class="add-menu ${addMenuActive ? 'add-menu--active' : ''}">
                ${may('board_multiple') ? `
                <div class="add-menu-item" data-action="add-dashboard" role="button" tabindex="0">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon">
                        <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2"/>
                        <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2"/>
                        <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="2"/>
                        <path d="M17 13v8M13 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    ${i18n.t('action.add_dashboard')}
                </div>
                <div style="height: 1px; background: var(--border); margin: 2px 0;"></div>` : ''}
                <div class="add-menu-item" data-action="add-bookmark" role="button" tabindex="0">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    ${i18n.t('action.add_bookmark')}
                </div>
                <div class="add-menu-item" data-action="add-section" role="button" tabindex="0">
                     <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon" style="stroke-dasharray: 4 2;"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/></svg>
                    ${i18n.t('action.add_section')}
                </div>
                <div class="add-menu-item" data-action="add-widget" role="button" tabindex="0">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon"><rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/></svg>
                    ${i18n.t('action.add_widget')}
                </div>
            </div>

            <!-- Edit Mode Toggle -->
            ${may('board_edit') ? `<div id="edit-toggle" class="top-bar__toggle ${drawerOpen || monitorOpen || proxmoxOpen || dockerOpen ? 'top-bar__toggle--disabled' : ''}" title="${i18n.t('topbar.edit_tooltip')}"
                 style="margin-right: -6px; ${editMode ? 'color: var(--accent);' : ''}">
                <svg id="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    ${editMode ? `
                        <!-- Checkmark Icon -->
                        <path d="M5 13l4 4L19 7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    ` : `
                        <!-- Geometric Pencil Icon -->
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="1.5" stroke-linecap="round" />
                    `}
                </svg>
            </div>` : ''}

            <dashboard-switcher class="${locked ? 'disabled' : ''}"></dashboard-switcher>

            ${monitoringOn && may('watch_monitor') ? `
            <!-- Monitoring status page — stays clickable while open: it is the way out -->
            <div id="monitor-toggle" class="top-bar__toggle ${(editMode || drawerOpen || proxmoxOpen || dockerOpen) && !monitorOpen ? 'top-bar__toggle--disabled' : ''}"
                 style="${monitorOpen ? 'color: var(--accent);' : ''}"
                 title="${i18n.t('monitor.overview_title')}" aria-label="${i18n.t('monitor.overview_title')}" role="button" tabindex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>` : ''}

            ${proxmoxOn && may('proxmox_view') ? `
            <!-- Proxmox page — stays clickable while open: it is the way out -->
            <div id="proxmox-toggle" class="top-bar__toggle ${(editMode || drawerOpen || monitorOpen || dockerOpen) && !proxmoxOpen ? 'top-bar__toggle--disabled' : ''}"
                 style="${proxmoxOpen ? 'color: var(--accent);' : ''}"
                 title="${i18n.t('widget.proxmox.name')}" aria-label="${i18n.t('widget.proxmox.name')}" role="button" tabindex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>
            </div>` : ''}

            ${dockerOn && may('docker_view') ? `
            <!-- Docker page — stays clickable while open: it is the way out -->
            <div id="docker-toggle" class="top-bar__toggle ${(editMode || drawerOpen || monitorOpen || proxmoxOpen) && !dockerOpen ? 'top-bar__toggle--disabled' : ''}"
                 style="${dockerOpen ? 'color: var(--accent);' : ''}"
                 title="${i18n.t('widget.docker.name')}" aria-label="${i18n.t('widget.docker.name')}" role="button" tabindex="0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.72 1.72 0 0 0-1.7 0l-10.3 6c-.5.2-.9.8-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.72 1.72 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z"/><path d="M10 21.9V14L2.1 9.1"/><path d="m10 14 11.9-6.9"/><path d="M14 19.8v-8.1"/><path d="M18 17.5V9.4"/></svg>
            </div>` : ''}

            <!-- Sidebar Toggle Icon — stays clickable while open: it is the way out -->
            <div id="drawer-toggle" class="top-bar__toggle ${editMode || monitorOpen || proxmoxOpen || dockerOpen ? 'top-bar__toggle--disabled' : ''}"
                 style="position: relative;" 
                 title="${i18n.t('topbar.drawer_tooltip')}">
                ${updateAvailable ? '<div class="notification-dot"></div>' : ''}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" />
                    <rect class="top-bar__indicator ${drawerOpen ? 'top-bar__indicator--active' : ''}" 
                           x="15" y="3" width="6" height="18" fill="white" />
                    <path d="M15 3V21" stroke-width="1.5" />
                </svg>
            </div>

        </div>
    </div>
`;
};
