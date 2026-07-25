import { i18n } from '../../../services/i18n';
import { escapeHtml as esc, safeImageSrc } from '../../../services/escape';

const ICON_EDIT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

const pwToggle = () => `<button type="button" class="pw-toggle" aria-label="${i18n.t('auth.toggle_password')}">
    <svg style="display:none" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
    <svg style="display:block" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
</button>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
interface User {
    initials?: string;
    avatar_url?: string;
    username?: string;
    role?: string;
}

interface Prefs {
    accent_color: string;
    language: string;
    [key: string]: any;
}

export const accountTemplate = (user: User) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.profile')}</h3>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" data-action="click-file" data-file="avatar-upload" role="button" tabindex="0" aria-label="${i18n.t('action.change_image')}">
                    <app-avatar initials="${esc(user.initials || '??')}" src="${safeImageSrc(user.avatar_url || '')}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">${i18n.t('action.change_image')}</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*" data-change="avatar">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${user.username || i18n.t('settings.default_user')}</span>
                    <span class="mono-tag">
                        ${(user.role || '').toLowerCase() === 'user' ? i18n.t('settings.role_user') : i18n.t('settings.role_admin')}
                    </span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">${i18n.t('auth.username')}</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="username-input" class="settings-content__input" value="${user.username || ''}" placeholder="${i18n.t('auth.username')}">
                        <app-button variant="primary" data-action="update-username">${i18n.t('settings.save_username')}</app-button>
                    </div>
                    <p class="settings-content__text-dim" style="font-size: 10px; margin: 4px 0 0 0;">${i18n.t('settings.username_relogin_hint')}</p>
                </div>
            </div>
        </div>

        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.system_password')}</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.current_password')}</label>
                <div class="pw-wrap">
                    <input type="password" id="current-password" class="settings-content__input" placeholder="${i18n.t('settings.password_placeholder')}">
                    ${pwToggle()}
                </div>
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.new_password')}</label>
                <div class="pw-wrap">
                    <input type="password" id="new-password" class="settings-content__input" placeholder="••••••••">
                    ${pwToggle()}
                </div>
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.confirm_password')}</label>
                <div class="pw-wrap">
                    <input type="password" id="confirm-password" class="settings-content__input" placeholder="••••••••">
                    ${pwToggle()}
                </div>
            </div>
            <div style="margin-top: 32px;">
                <app-button variant="primary" data-action="update-password">${i18n.t('settings.change_password')}</app-button>
            </div>
        </div>
    </div>
`;

// Look & Feel: everything that changes how the dashboard looks (accent, theme,
// background) lives in one card. Language and units moved to Personalization,
// which is where the rest of the per-panel preferences are.
export const themeTemplate = (prefs: Prefs, colorMap: Record<string, string>, colors: string[]) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
             <h3 class="settings-content__title">${i18n.t('settings.appearance')}</h3>
             <label class="settings-content__label">${i18n.t('settings.studio_accent')}</label>
             <div class="settings-content__color-grid">
                ${colors.map(c => `
                    <div class="settings-content__color-swatch ${prefs.accent_color === c ? 'settings-content__color-swatch--active' : ''}"
                         style="background-color: ${colorMap[c]}"
                         data-action="set-accent" data-color="${esc(c)}">
                         ${prefs.accent_color === c ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>' : ''}
                    </div>
                `).join('')}
                <div class="settings-content__color-swatch settings-content__color-swatch--custom ${prefs.accent_color.startsWith('#') ? 'settings-content__color-swatch--active' : ''}" 
                     style="background-color: ${prefs.accent_color.startsWith('#') ? prefs.accent_color : 'transparent'}">
                     <svg viewBox="0 0 24 24" style="z-index: 5; fill: white; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); pointer-events: none;">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                     </svg>
                     <app-color-picker class="settings-content__swatch-picker" trigger-opacity="0" value="${prefs.accent_color.startsWith('#') ? prefs.accent_color : '#0078D4'}"
                            data-change="accent-picker"></app-color-picker>
                </div>
             </div>

            <div class="settings-content__flex-row settings-content__section-spacer">
                <!-- Dashboard Background -->
                <div class="settings-content__flex-col">
                    <label class="settings-content__label">${i18n.t('settings.dashboard_background')}</label>
                    <div class="settings-content__background-container" data-action="click-file" data-file="background-upload" role="button" tabindex="0" aria-label="${i18n.t('settings.dashboard_background')}">
                        <img class="settings-content__background-preview ${prefs.dashboard_background ? 'active' : ''}" 
                             src="${prefs.dashboard_background || ''}" alt="${i18n.t('settings.dashboard_background')}">
                        <div class="settings-content__background-placeholder ${prefs.dashboard_background ? 'hidden' : ''}">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <span>${i18n.t('action.change_image')}</span>
                        </div>
                        ${prefs.dashboard_background ? `
                            <button class="settings-content__background-remove"
                                    data-action="remove-background"
                                    title="${i18n.t('settings.remove_background')}">
                                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
                            </button>
                        ` : ''}
                    </div>
                    <input type="file" id="background-upload" style="display: none;" accept="image/*" data-change="background">
                    <p style="font-size: 10px; color: var(--text-dim); margin: 4px 0 0 0;">${i18n.t('settings.background_size_hint')}</p>
                </div>

                <div class="settings-content__flex-col">
                    <div class="settings-content__form-group" style="margin-bottom: 0;">
                        <label class="settings-content__label">${i18n.t('settings.theme')}</label>
                        <div class="settings-content__segmented-control">
                            <button class="settings-content__segment ${!prefs.theme || prefs.theme === 'system' || prefs.theme === 'dark' ? 'active' : ''}"
                                    data-action="set-theme" data-theme="dark">
                                🌙 ${i18n.t('settings.dark')}
                            </button>
                            <button class="settings-content__segment ${prefs.theme === 'light' ? 'active' : ''}"
                                    data-action="set-theme" data-theme="light">
                                ☀️ ${i18n.t('settings.light')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

// One card per topic, each titled after what it holds: the panel's identity,
// its language/units, and its grid.
export const personalizationTemplate = (prefs: Prefs) => `
    <div class="bento-grid">
        <!-- Branding -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.project_name_and_logo')}</h3>

            <div class="settings-content__form-group" style="margin-bottom: 0;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <div style="position: relative; flex-shrink: 0;">
                        <button type="button" class="settings-logo-btn" data-action="open-logo-picker" title="${i18n.t('settings.project_logo')}">
                            <img src="${safeImageSrc(prefs.project_logo || '/images/logo.png')}" alt="" style="width:36px;height:36px;object-fit:contain;border-radius:4px;">
                        </button>
                        ${prefs.project_logo ? `
                        <button type="button" class="settings-logo-remove" data-action="remove-logo" title="${i18n.t('action.remove')}">×</button>
                        ` : ''}
                    </div>
                    <input type="text"
                           id="project-name-input"
                           class="settings-content__input"
                           value="${prefs.project_name || 'Lastboard'}"
                           placeholder="${i18n.t('app.title')}"
                           data-change="project-name">
                </div>
            </div>
        </div>

        <!-- Language & Region -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.language_region')}</h3>

            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.language')}</label>
                <app-select id="language-select" value="${prefs.language}"></app-select>
            </div>

            <div class="settings-content__form-group" style="margin-bottom: 0;">
                <label class="settings-content__label">${i18n.t('settings.unit_system')}</label>
                <app-select id="unit-system-select" value="${prefs.unit_system || 'metric'}"></app-select>
            </div>
        </div>

        <!-- Grid -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.grid_layout')}</h3>

            <div class="settings-content__personalization-grid">
                <div class="settings-content__slider-group">
                    <div class="settings-content__slider-header">
                        <label class="settings-content__slider-label">${i18n.t('settings.grid_columns')}</label>
                        <span class="settings-content__slider-value" id="val-grid_columns">${prefs.grid_columns || 12}</span>
                    </div>
                    <input type="range"
                           min="3" max="16" step="1"
                           value="${prefs.grid_columns || 12}"
                           data-input="update-columns"
                           data-change="commit-columns">
                </div>
            </div>
            
            <p class="settings-content__text-dim" style="font-size: 11px; margin-top: 24px; font-family: var(--font-mono);">
                ${i18n.t('settings.density_desc')}
            </p>
        </div>
    </div>
`;

export const usersTemplate = (users: any[]) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">${i18n.t('settings.user_management')}</h3>
                <app-button variant="primary" data-action="open-add-user" style="width: auto; padding: 0 16px;">+ ${i18n.t('action.add_user')}</app-button>
            </div>

            <div class="settings-content__user-list">
                ${(users || []).map(u => `
                    <div class="settings-content__user-item">
                        <div class="user-info">
                            <app-avatar
                                initials="${esc(u.username.substring(0, 2).toUpperCase())}"
                                src="${safeImageSrc(u.avatar_url || '')}"
                                style="margin: 0; width: 36px; height: 36px; font-size: 13px; border-radius: 50%; outline: 1px solid var(--border);">
                            </app-avatar>
                            <div class="user-details">
                                <div class="user-name">${esc(u.username)}</div>
                                <div class="user-role-tag">
                                    ${(u.role || '').toLowerCase() === 'user' ? i18n.t('settings.role_user') : i18n.t('settings.role_admin')}
                                </div>
                            </div>
                        </div>
                        <div class="user-actions">
                             <button class="user-action-btn edit" data-action="edit-user" data-user-id="${u.id}" data-username="${esc(u.username)}" title="${i18n.t('general.edit')}">
                                ${ICON_EDIT}
                             </button>
                             <button class="user-action-btn delete" data-action="delete-user" data-user-id="${u.id}" title="${i18n.t('general.delete')}">
                                ${ICON_TRASH}
                             </button>
                        </div>
                    </div>
                `).join('')}
            </div>
             ${(users || []).length === 0 ? `<p class="settings-content__text-dim">${i18n.t('settings.no_users')}</p>` : ''}
        </div>
    </div>
    
     <dialog id="add-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${i18n.t('action.add_new_user')}</h3>
            <button class="modal-close" data-action="close-modal" data-modal="add-user-modal" aria-label="${i18n.t('general.close')}">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('auth.username')}</label>
            <input type="text" id="new-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('auth.password')}</label>
            <div class="pw-wrap">
                <input type="password" id="new-user-password" class="settings-content__input">
                ${pwToggle()}
            </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" data-action="create-user">${i18n.t('general.save')}</app-button>
        </div>
    </dialog>

    <dialog id="edit-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${i18n.t('action.edit_user')}</h3>
            <button class="modal-close" data-action="close-modal" data-modal="edit-user-modal" aria-label="${i18n.t('general.close')}">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <input type="hidden" id="edit-user-id">
        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('auth.username')}</label>
            <input type="text" id="edit-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('settings.new_password')}</label>
            <div class="pw-wrap">
                <input type="password" id="edit-user-password" class="settings-content__input" placeholder="${i18n.t('settings.password_leave_blank')}">
                ${pwToggle()}
            </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" data-action="update-admin-user">${i18n.t('general.save')}</app-button>
        </div>
    </dialog>
`;

export const advancedTemplate = (monitoring: { mode: string; interval_sec: number }) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <!-- Monitoring Section -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.monitoring')}</h3>
            <div class="settings-content__action-group">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.monitoring_mode')}</h3>
                        <p>${i18n.t('settings.monitoring_mode_desc')}</p>
                    </div>
                    <app-select id="monitoring-mode" value="${monitoring.mode}" style="min-width: 200px;"></app-select>
                </div>
                <div class="settings-content__action-row" id="monitoring-interval-row"
                     style="display: ${monitoring.mode === 'background' ? 'flex' : 'none'};">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.monitoring_interval')}</h3>
                        <p>${i18n.t('settings.monitoring_interval_desc')}</p>
                    </div>
                    <app-select id="monitoring-interval" value="${monitoring.interval_sec}" style="min-width: 200px;"></app-select>
                </div>
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('monitor.overview_title')}</h3>
                        <p>${i18n.t('settings.monitoring_overview_desc')}</p>
                    </div>
                    <app-button variant="primary" data-action="open-monitor-overview">
                        ${i18n.t('monitor.view_overview')}
                    </app-button>
                </div>
            </div>
        </div>

        <!-- System Migration Section -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.system_data')}</h3>

            <div class="settings-content__action-group">
                <!-- Export -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.export_db')}</h3>
                        <p>${i18n.t('settings.export_desc')}</p>
                    </div>
                    <app-button variant="primary" data-action="download-backup">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        ${i18n.t('action.download_backup')}
                    </app-button>
                </div>

                <!-- Import -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.import_db')}</h3>
                        <p>${i18n.t('settings.import_desc')} <br><span style="color: var(--accent); font-weight: 500;">${i18n.t('settings.import_warn')}</span></p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                         <input type="file" id="backup-upload" accept=".json" style="display: none;" data-change="restore-backup">
                         <app-button variant="primary" data-action="click-file" data-file="backup-upload">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                            ${i18n.t('action.select_file')}
                         </app-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Danger Zone -->
        <div class="settings-content__danger-zone">
             <div>
                <div class="settings-content__danger-title">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:var(--danger-color);display:block;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    </span>
                    ${i18n.t('settings.factory_reset')}
                </div>
                <p class="settings-content__text-dim" style="font-size: 13px; color: var(--danger-color); opacity: 0.8;">
                    ${i18n.t('settings.reset_desc')}
                </p>
             </div>
             <app-button data-action="factory-reset" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent; transition: all 0.2s;">
                ${i18n.t('action.reset_system')}
             </app-button>
        </div>
    </div>


`;

export const updateStatusTemplate = (isAdmin: boolean, updateInfo: any) => {
    if (!isAdmin) return '';
    if (!updateInfo) return '';

    if (updateInfo.is_docker) {
        return `
            <div style="background: rgba(var(--info-rgb), 0.1); border: 1px solid rgba(var(--info-rgb), 0.3); padding: 16px; border-radius: var(--radius); width: 100%; text-align: left;">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: var(--accent); flex-shrink: 0;"><path d="M21 12l-4.37-6.16c-.37-.52-.98-.84-1.63-.84h-3V4c0-1.1-.9-2-2-2s-2 .9-2 2v1H5c-.65 0-1.26.32-1.63.84L-1 12v3h2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h2v-3zm-11 7H7v-3h3v3zm-5 0H2v-3h3v3zm12 0h-3v-3h3v3z"/></svg>
                    <div>
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-main);">${i18n.t('settings.docker_mode')}</h4>
                        <p style="margin: 0; font-size: 13px; color: var(--text-dim);">
                            ${i18n.t('settings.docker_desc')}<br>
                            ${updateInfo.available ? `<strong style="color: var(--accent);">${i18n.t('settings.new_version_notif')} (${updateInfo.latest_version})</strong>` : i18n.t('settings.up_to_date_docker_msg')}
                        </p>
                    </div>
                    </div>
            </div>
        `;
    }

    if (updateInfo.available) {
        return `
            <div class="update-modal">
                <div class="update-modal__glow"></div>
                
                <div class="update-modal__content">
                    <div class="update-modal__header">
                        <div class="update-modal__badge">${i18n.t('settings.update_available')}</div>
                        <h3 class="update-modal__version">${updateInfo.latest_version}</h3>
                    </div>
                    
                    <div class="update-modal__footer">
                        <app-button variant="primary" id="btn-update-now" style="flex: 1; justify-content: center;" data-action="perform-update" data-asset-url="${esc(updateInfo.asset_url)}">
                            ${i18n.t('action.download_install')}
                        </app-button>
                        <a href="https://git.codigosh.com/CodigoSH/Lastboard/releases" target="_blank" style="text-decoration: none;">
                            <app-button variant="ghost" style="height: 100%;">${i18n.t('general.changelog')}</app-button>
                        </a>
                    </div>
                    <div id="update-status" style="display: none; margin-top: 12px; padding: 12px; background: rgba(var(--accent-rgb), 0.1); border: 1px solid rgba(var(--accent-rgb), 0.3); border-radius: 8px; text-align: center;">
                        <p style="margin: 0; font-size: 13px; color: var(--accent); font-weight: 500;">${i18n.t('notifier.downloading_secure')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div style="color: var(--success-color); font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <span>${i18n.t('settings.up_to_date')}</span>
        </div>
    `;
};

export const updateZoneTemplate = (isAdmin: boolean, updateInfo: any, isCheckingUpdates: boolean) => {
    return `
        <div id="update-status-container" style="display: inline-flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 480px; min-height: 48px;">
            ${updateStatusTemplate(isAdmin, updateInfo)}
        </div>

        ${isAdmin ? `
        <div style="margin-top: 16px;">
            <app-button variant="ghost"
                        id="btn-check-updates"
                        ?loading="${isCheckingUpdates}"
                        data-action="check-updates">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                ${i18n.t('action.check_updates')}
            </app-button>
        </div>
        ` : ''}
    `;
};

export const aboutTemplate = (version: string, updateInfo: any, role: string, betaUpdates: boolean, isCheckingUpdates: boolean) => {
    const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'administrator';
    return `
    <div style="position: relative;">
        ${isAdmin ? `
            <div class="beta-badge">
                <span id="beta-text" class="beta-badge__pill ${betaUpdates ? 'active' : ''}">
                    ${i18n.t('settings.beta_tester')}
                </span>
                <label class="toggle-switch">
                    <input type="checkbox" id="beta-updates-toggle-badge" data-change="beta-toggle">
                    <span class="slider"></span>
                </label>
            </div>
        ` : ''}

        <div class="bento-grid" style="grid-template-columns: 1fr;">
            <div class="bento-card" style="text-align: center; padding: 24px;">
            
            <div style="margin: 24px 0;">
                <!-- Logo Placeholder -->
                <img src="/images/logo.png" alt="Lastboard" style="max-width: 100px; height: auto; border-radius: 18px; margin: 0 auto 24px auto; display: block;">
                
                <h2 style="margin: 0 0 8px 0; font-size: 24px; color: var(--text-main);">${i18n.t('app.title')}</h2>
                <p id="current-version-label" class="settings-content__text-dim" style="margin: 0;">${version || '…'}</p>
            </div>

              <div id="update-zone-wrapper" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                ${updateZoneTemplate(isAdmin, updateInfo, isCheckingUpdates)}
              </div>
             </div>

             <div style="margin-top: 64px; border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: center; gap: 24px;">
                 <a href="https://git.codigosh.com/CodigoSH/Lastboard" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
                     ${i18n.t('settings.github')}
                 </a>
                 <a href="https://git.codigosh.com/CodigoSH/Lastboard/issues" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                     ${i18n.t('action.report_issue')}
                 </a>
             </div>
         </div>
     </div>
        `;
};
