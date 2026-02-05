import { i18n } from '../../../services/i18n';

interface User {
    initials?: string;
    avatar_url?: string;
    username?: string;
    role?: string;
    is_superadmin?: boolean;
}

interface RightDrawerProps {
    user: User;
    isOpen: boolean;
    selectedSection: string | null;
    updateAvailable?: boolean;
}

export const template = ({ user, isOpen, selectedSection, updateAvailable }: RightDrawerProps) => `
    <div class="right-drawer__overlay"></div>
    
    <div class="right-drawer__content-panel ${selectedSection ? '' : 'right-drawer__content-panel--closed'}">
        <div class="right-drawer__content-body">
            ${selectedSection ? `<settings-content section="${selectedSection}"></settings-content>` : ''}
        </div>
    </div>

    <div class="right-drawer__panel">
        <div class="right-drawer__header">
            <app-avatar class="right-drawer__avatar" initials="${user.initials}" src="${user.avatar_url || ''}"></app-avatar>
            <div class="right-drawer__user-info">
                <span class="right-drawer__username">${user.username}</span>
                ${(user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'administrator') ? `<span class="right-drawer__role">
                    ${(() => {
            const r = (user.role || '').toLowerCase();
            if (user.is_superadmin) return i18n.t('settings.role_super_admin');
            if (r === 'admin' || r === 'administrator') return i18n.t('settings.role_admin');
            if (r === 'user') return i18n.t('settings.role_user');
            return user.role || i18n.t('settings.default_role');
        })()}
                </span>` : ''}
            </div>
        </div>
        
        <div class="right-drawer__body">
            <div class="right-drawer__section-label">${i18n.t('settings.title')}</div>
            <nav class="right-drawer__menu">
                <div class="right-drawer__menu-item ${selectedSection === 'account' ? 'right-drawer__menu-item--active' : ''}" data-section="account">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    <span>${i18n.t('settings.profile')}</span>
                </div>
                <div class="right-drawer__menu-item ${selectedSection === 'theme' ? 'right-drawer__menu-item--active' : ''}" data-section="theme">
                    <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>
                    <span>${i18n.t('settings.theme')}</span>
                </div>
                <div class="right-drawer__menu-item ${selectedSection === 'personalization' ? 'right-drawer__menu-item--active' : ''}" data-section="personalization">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span>${i18n.t('settings.personalization')}</span>
                </div>

                ${(user.role?.toLowerCase() === 'admin' || user.role === 'Administrator') ? `
                    <div class="right-drawer__menu-item ${selectedSection === 'users' ? 'right-drawer__menu-item--active' : ''}" data-section="users">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        <span>${i18n.t('settings.users')}</span>
                    </div>

                    <div class="right-drawer__menu-item ${selectedSection === 'advanced' ? 'right-drawer__menu-item--active' : ''}" data-section="advanced">
                        <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                        <span>${i18n.t('settings.advanced')}</span>
                    </div>
                ` : ''}
                <div class="right-drawer__menu-item ${selectedSection === 'about' ? 'right-drawer__menu-item--active' : ''}" data-section="about" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <span>${i18n.t('settings.about')}</span>
                    </div>
                    ${updateAvailable && (user.role?.toLowerCase() === 'admin' || user.role === 'Administrator') ? `
                        <span style="font-size: 10px; font-weight: 600; color: var(--danger-color); background: rgba(var(--danger-rgb), 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(var(--danger-rgb), 0.2); animation: blink-badge 2s infinite;">${i18n.t('settings.update_available')}</span>
                        <style>@keyframes blink-badge { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }</style>
                    ` : ''}
                </div>
            </nav>
        </div>

        <div class="right-drawer__footer">
            <button type="button" id="logout-btn" class="right-drawer__menu-item right-drawer__menu-item--logout" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;width:100%;padding:0;">
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
                <span>${i18n.t('auth.logout')}</span>
            </button>
        </div>
    </div>
`;
