/**
 * Settings Content Templates
 */
import { i18n } from '../../../services/i18n';
interface User {
    initials?: string;
    avatar_url?: string;
    username?: string;
    role?: string;
    is_superadmin?: boolean;
}

interface Prefs {
    accent_color: string;
    language: string;
    [key: string]: any;
}

export const accountTemplate = (user: User) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${i18n.t('settings.profile')}</div>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" onclick="this.nextElementSibling.click()">
                    <app-avatar initials="${user.initials || '??'}" src="${user.avatar_url || ''}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">${i18n.t('action.change_image')}</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*" onchange="this.getRootNode().host.handleAvatarChange(event)">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${user.username || i18n.t('settings.default_user')}</span>
                    <span class="mono-tag">
                        ${(() => {
        const r = (user.role || '').toLowerCase();
        if (user.is_superadmin) return i18n.t('settings.role_super_admin');
        if (r === 'admin' || r === 'administrator') return i18n.t('settings.role_admin');
        if (r === 'user') return i18n.t('settings.role_user');
        return user.role || i18n.t('settings.default_role');
    })()}
                    </span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">${i18n.t('settings.display_username')}</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="username-input" class="settings-content__input" value="${user.username || ''}" placeholder="${i18n.t('settings.display_username')}">
                        <app-button variant="primary" onclick="this.getRootNode().host.updateUsername(document.getElementById('username-input').value)">${i18n.t('action.update')}</app-button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${i18n.t('auth.password')}</div>
            <h3 class="settings-content__title">${i18n.t('settings.system_password')}</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.current_password')}</label>
                <input type="password" id="current-password" class="settings-content__input" placeholder="${i18n.t('settings.password_placeholder')}">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.new_password')}</label>
                <input type="password" id="new-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.confirm_password')}</label>
                <input type="password" id="confirm-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div style="margin-top: 32px;">
                <app-button variant="primary" onclick="this.getRootNode().host.updatePassword()">${i18n.t('general.save')}</app-button>
            </div>
        </div>
    </div>
`;

export const themeTemplate = (prefs: Prefs, colorMap: Record<string, string>, colors: string[]) => `
    <div class="bento-grid">
        <div class="bento-card">
             <div class="mono-tag" style="margin-bottom: 8px;">${i18n.t('settings.appearance')}</div>
             <h3 class="settings-content__title">${i18n.t('settings.studio_accent')}</h3>
             <div class="settings-content__color-grid">
                ${colors.map(c => `
                    <div class="settings-content__color-swatch ${prefs.accent_color === c ? 'settings-content__color-swatch--active' : ''}" 
                         style="background-color: ${colorMap[c]}"
                         onclick="this.getRootNode().host.savePrefs({accent_color: '${c}'})">
                         ${prefs.accent_color === c ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>' : ''}
                    </div>
                `).join('')}
                <div class="settings-content__color-swatch settings-content__color-swatch--custom ${prefs.accent_color.startsWith('#') ? 'settings-content__color-swatch--active' : ''}" 
                     style="background-color: ${prefs.accent_color.startsWith('#') ? prefs.accent_color : '#333'}">
                     <svg viewBox="0 0 24 24" style="opacity: 0.8; fill: ${prefs.accent_color.startsWith('#') ? '#fff' : 'rgba(255,255,255,0.4)'};">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                     </svg>
                     <input type="color" class="settings-content__swatch-picker" value="${prefs.accent_color.startsWith('#') ? prefs.accent_color : '#0078D4'}" 
                            onchange="this.getRootNode().host.savePrefs({accent_color: this.value})">
                </div>
             </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag settings-content__section-spacer" style="margin-bottom: 8px;">${i18n.t('settings.system_locale')}</div>
            <h3 class="settings-content__title">${i18n.t('settings.localization')}</h3>
            <div class="settings-content__form-group">
                <div style="display: flex; gap: 16px;">
                    <div style="flex: 1;">
                        <label class="settings-content__label">${i18n.t('settings.language')}</label>
                        <app-select id="language-select" value="${prefs.language}"></app-select>
                    </div>
                    <div style="flex: 1;">
                        <label class="settings-content__label">${i18n.t('settings.theme_mode')}</label>
                         <div class="settings-content__segmented-control">
                            <button class="settings-content__segment ${!prefs.theme || prefs.theme === 'system' || prefs.theme === 'dark' ? 'active' : ''}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'dark'})">
                                🌙 ${i18n.t('settings.dark')}
                            </button>
                            <button class="settings-content__segment ${prefs.theme === 'light' ? 'active' : ''}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'light'})">
                                ☀️ ${i18n.t('settings.light')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

export const personalizationTemplate = (prefs: Prefs) => `
    <div class="bento-grid">
        <div class="bento-card" style="grid-column: span 2;">
            <div class="mono-tag" style="margin-bottom: 12px;">Arquitectura de Rejilla Fluida</div>
            
            <!-- Project Name -->
            <div class="settings-content__form-group" style="margin-bottom: 24px;">
                <label class="settings-content__label">${i18n.t('settings.project_name')}</label>
                <div style="display: flex; gap: 8px;">
                     <input type="text" 
                            id="project-name-input"
                            class="settings-content__input" 
                            value="${prefs.project_name || 'Lastboard'}" 
                            placeholder="Lastboard">
                     <app-button variant="primary" onclick="this.getRootNode().host.savePrefs({project_name: this.getRootNode().getElementById('project-name-input').value})">${i18n.t('action.update')}</app-button>
                </div>
            </div>

            <div class="settings-content__personalization-grid">
                <div class="settings-content__slider-group">
                    <div class="settings-content__slider-header">
                        <label class="settings-content__slider-label">${i18n.t('settings.widget_min_size')}</label>
                        <span class="settings-content__slider-value" id="val-widget_min_width">${prefs.widget_min_width || 140}px</span>
                    </div>
                    <input type="range" 
                           min="80" max="300" step="10"
                           value="${prefs.widget_min_width || 140}"
                           oninput="this.getRootNode().host.updateDensity(this.value)"
                           onchange="this.getRootNode().host.commitDensity(this.value)">
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
            <div class="mono-tag" style="margin-bottom: 12px;">${i18n.t('settings.admin_section')}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">${i18n.t('settings.user_management')}</h3>
                <app-button variant="primary" onclick="this.getRootNode().host.openAddUserModal()" style="width: auto; padding: 0 16px;">+ ${i18n.t('action.add_user')}</app-button>
            </div>

            <div class="settings-content__user-list">
                ${(users || []).map(u => `
                    <div class="settings-content__user-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <app-avatar 
                                initials="${u.username.substring(0, 2).toUpperCase()}" 
                                src="${u.avatar_url || ''}" 
                                style="width: 32px; height: 32px; font-size: 12px; border-radius: 50%; object-fit: cover;">
                            </app-avatar>
                            <div>
                                <div style="font-weight: 500; font-size: 14px;">${u.username}</div>
                                <div class="mono-tag" style="font-size: 10px;">
                                    ${(() => {
        const r = (u.role || '').toLowerCase();
        if (u.is_superadmin) return i18n.t('settings.role_super_admin');
        if (r === 'admin' || r === 'administrator') return i18n.t('settings.role_admin');
        if (r === 'user') return i18n.t('settings.role_user');
        return u.role;
    })()}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                             <app-button variant="ghost" onclick="this.getRootNode().host.openEditUserModal(${u.id}, '${u.username}', '${u.role}')">${i18n.t('general.edit')}</app-button>
                            <app-button variant="ghost" onclick="this.getRootNode().host.deleteUser(${u.id})">${i18n.t('general.delete')}</app-button>
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
            <button class="modal-close" onclick="this.getRootNode().getElementById('add-user-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('auth.username')}</label>
            <input type="text" id="new-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('auth.password')}</label>
            <input type="password" id="new-user-password" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('settings.role')}</label>
            <app-select id="new-user-role" value="user"></app-select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" onclick="this.getRootNode().host.createUser()">${i18n.t('general.save')}</app-button>
        </div>
    </dialog>

    <dialog id="edit-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${i18n.t('action.edit_user')}</h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('edit-user-modal').close()">
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
            <input type="password" id="edit-user-password" class="settings-content__input" placeholder="${i18n.t('settings.password_leave_blank')}">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('settings.role')}</label>
            <app-select id="edit-user-role"></app-select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" onclick="this.getRootNode().host.updateAdminUser()">${i18n.t('action.save_changes')}</app-button>
        </div>
    </dialog>
`;

export const advancedTemplate = () => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <!-- System Migration Section -->
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 24px;">${i18n.t('settings.system_data')}</div>
            
            <div class="settings-content__action-group">
                <!-- Export -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.export_db')}</h3>
                        <p>${i18n.t('settings.export_desc')}</p>
                    </div>
                    <app-button variant="primary" onclick="this.getRootNode().host.downloadBackup()">
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
                         <input type="file" id="backup-upload" accept=".json" style="display: none;" onchange="this.getRootNode().host.restoreBackup(this.files[0])">
                         <app-button variant="primary" onclick="this.getRootNode().getElementById('backup-upload').click()">
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
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: var(--danger-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    ${i18n.t('settings.factory_reset')}
                </div>
                <p class="settings-content__text-dim" style="font-size: 13px; color: var(--danger-color); opacity: 0.8;">
                    ${i18n.t('settings.reset_desc')}
                </p>
             </div>
             <app-button onclick="this.getRootNode().host.openResetModal()" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent; transition: all 0.2s;">
                ${i18n.t('action.reset_system')}
             </app-button>
        </div>
    </div>

    <!-- Factory Reset Confirmation Modal -->
    <dialog id="reset-confirm-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 440px; backdrop-filter: blur(20px); box-shadow: var(--paper-shadow);">
        <div class="modal-header">
            <h3 class="modal-title" style="color: var(--danger-color); font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px;">
                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: var(--danger-color);"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                ${i18n.t('settings.confirm_reset_title')}
            </h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('reset-confirm-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="settings-content__text-dim" style="font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
            ${i18n.t('settings.confirm_reset_msg')}
            ${i18n.t('settings.type_delete')}
        </p>

        <div class="settings-content__form-group">
            <input type="text" id="reset-confirm-input" class="settings-content__input" placeholder="${i18n.t('settings.type_delete_placeholder')}" style="border-color: var(--danger-color); opacity: 0.6; font-family: monospace;">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 32px; width: 100%;">
            <app-button id="btn-reset-confirm" variant="danger" onclick="this.getRootNode().host.executeFactoryReset()" style="flex: 1; justify-content: center;">
                ${i18n.t('action.erase_everything')}
            </app-button>
        </div>
    </dialog>
`;

export const aboutTemplate = (version: string, updateInfo: any, role: string) => {
    const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'administrator';
    return `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card" style="text-align: center; padding: 48px 24px; position: relative;">
             ${isAdmin ? `
                <div style="position: absolute; top: 16px; right: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span id="beta-text" style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.3s; user-select: none; border: 2px solid transparent; padding: 4px 10px; border-radius: 20px;">
                        Beta Tester
                    </span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="beta-updates-toggle-badge" onchange="this.getRootNode().host.handleBetaToggle(this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
             ` : ''}
             
             <!-- Logo Placeholder -->
             <img src="/images/logo.png" alt="Lastboard" style="max-width: 100px; height: auto; border-radius: 18px; margin: 0 auto 24px auto; display: block;">
             
             <h2 style="margin: 0 0 8px 0; font-size: 24px; color: var(--text-main);">${i18n.t('app.title')}</h2>
             <p class="settings-content__text-dim" style="margin: 0 0 32px 0;">${version}</p>

             <div style="display: inline-flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 400px;">
                ${isAdmin ? (updateInfo ? `
                    ${updateInfo.is_docker ? `
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
                    ` : `
                        <!-- Native Update Logic -->
                        <!-- Native Update Logic -->
                        ${updateInfo.available ? `
                             <div class="update-modal">
                                <div class="update-modal__glow"></div>
                                
                                <div class="update-modal__content">
                                    <div class="update-modal__header">
                                        <div class="update-modal__badge">${i18n.t('settings.update_available')}</div>
                                        <h3 class="update-modal__version">${updateInfo.latest_version}</h3>
                                    </div>
                                    
                                    <div class="update-modal__footer">
                                        <app-button variant="primary" id="btn-update-now" style="flex: 1; justify-content: center;" onclick="this.getRootNode().host.performUpdate('${updateInfo.asset_url}')">
                                            ${i18n.t('action.download_install')}
                                        </app-button>
                                        <a href="https://github.com/CodigoSH/Lashboard/releases" target="_blank" style="text-decoration: none;">
                                            <app-button variant="ghost" style="height: 100%;">${i18n.t('general.changelog')}</app-button>
                                        </a>
                                    </div>
                                    <p id="update-status" style="margin: 0; font-size: 12px; color: var(--text-dim); display: none; text-align: center;">${i18n.t('notifier.downloading_secure')}</p>
                                </div>
                            </div>
                        ` : `
                            <div style="color: var(--success-color); font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
                                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                <span>${i18n.t('settings.up_to_date')}</span>
                            </div>
                        `}
                    `}
                ` : ``) : ''}
             </div>

             <div style="margin-top: 64px; border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: center; gap: 24px;">
                 <a href="https://github.com/CodigoSH/Lashboard" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.685-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>
                     ${i18n.t('settings.github')}
                 </a>
                 <a href="https://github.com/CodigoSH/Lashboard/issues" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                     ${i18n.t('action.report_issue')}
                 </a>
             </div>
         </div>
     </div>
        `;
};
