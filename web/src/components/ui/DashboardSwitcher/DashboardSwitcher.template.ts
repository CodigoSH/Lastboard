import { Dashboard } from '../../../types';
import { i18n } from '../../../services/i18n';

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export const template = ({ dashboards, currentDashboardId, dropdownActive }: {
    dashboards: Dashboard[],
    currentDashboardId: number | null,
    dropdownActive: boolean
}): string => {
    const currentDashboard = dashboards.find(d => d.id === currentDashboardId);
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
                    <div class="switcher-actions">
                        <button class="switcher-action-btn" data-action="rename" data-id="${d.id}" title="${i18n.t('dashboard.rename')}">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round"/></svg>
                        </button>
                        <button class="switcher-action-btn" data-action="delete" data-id="${d.id}" title="${i18n.t('dashboard.delete')}">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-linecap="round"/></svg>
                        </button>
                    </div>
                </div>
            `).join('')}
            ${dashboards.length > 1 ? `
                <div class="switcher-separator"></div>
                <button class="switcher-manage-btn" data-action="manage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <path d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                    ${i18n.t('dashboard.manage_order')}
                </button>
            ` : ''}
        </div>
    `;
};
