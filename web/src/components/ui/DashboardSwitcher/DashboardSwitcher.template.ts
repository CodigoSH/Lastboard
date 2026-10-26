import { Dashboard } from '../../../types';
import { i18n } from '../../../services/i18n';
import { escapeHtml } from '../../../services/escape';

export const template = ({ dashboards, currentDashboardId, dropdownActive, canManage = true }: {
    dashboards: Dashboard[],
    currentDashboardId: number | null,
    dropdownActive: boolean,
    /** Renaming, reordering and deleting boards is board editing. */
    canManage?: boolean
}): string => {
    const resolveName = (name: string) => escapeHtml(i18n.t(name));
    return `
        <button class="switcher-trigger ${dropdownActive ? 'active' : ''}" title="${i18n.t('topbar.dashboard_switcher')}">
            <svg class="switcher-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polygon points="12 2 2 7 12 12 22 7 12 2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="2 12 12 17 22 12" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="2 17 12 22 22 17" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>

        <div class="switcher-dropdown ${dropdownActive ? 'open' : ''}">
            ${dashboards.map(d => `
                <div class="switcher-item ${d.id === currentDashboardId ? 'is-active' : ''}" data-id="${d.id}">
                    <span class="switcher-item-dot"></span>
                    <span class="switcher-item-name" title="${resolveName(d.name)}">${resolveName(d.name)}</span>
                </div>
            `).join('')}
            ${canManage ? `<div class="switcher-separator"></div>
            <button class="switcher-manage-btn" data-action="manage">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <path d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
                ${i18n.t('dashboard.manage')}
            </button>` : ''}
        </div>
    `;
};
