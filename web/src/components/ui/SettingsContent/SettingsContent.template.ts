/**
 * Settings Content Templates
 */

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
            <div class="mono-tag" style="margin-bottom: 12px;">Profile / Identity</div>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" onclick="this.nextElementSibling.click()">
                    <app-avatar initials="${user.initials || '??'}" src="${user.avatar_url || ''}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">Change Image</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*" onchange="this.getRootNode().host.handleAvatarChange(event)">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${user.username || 'User'}</span>
                    <span class="mono-tag">${user.role || 'Administrator'}</span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">Display Username</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="username-input" class="settings-content__input" value="${user.username || ''}" placeholder="Enter new username">
                        <app-button variant="primary" onclick="this.getRootNode().host.updateUsername(document.getElementById('username-input').value)">Update</app-button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">Security / Authentication</div>
            <h3 class="settings-content__title">System Password</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">Current Password</label>
                <input type="password" id="current-password" class="settings-content__input" placeholder="Required to authorize changes">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">New Password</label>
                <input type="password" id="new-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">Confirm Password</label>
                <input type="password" id="confirm-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div style="margin-top: 32px;">
                <app-button variant="primary" onclick="this.getRootNode().host.updatePassword()">Reset Password</app-button>
            </div>
        </div>
    </div>
`;

export const themeTemplate = (prefs: Prefs, colorMap: Record<string, string>, colors: string[], languages: { code: string, name: string }[]) => `
    <div class="bento-grid">
        <div class="bento-card">
             <div class="mono-tag" style="margin-bottom: 8px;">Hardware/Colors</div>
             <h3 class="settings-content__title">Studio Accent</h3>
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
            <div class="mono-tag settings-content__section-spacer" style="margin-bottom: 8px;">System/Locale</div>
            <h3 class="settings-content__title">Localization</h3>
            <div class="settings-content__form-group">
                <div style="display: flex; gap: 16px;">
                    <div style="flex: 1;">
                        <label class="settings-content__label">Interface Language</label>
                        <select class="settings-content__select" onchange="this.getRootNode().host.savePrefs({language: this.value})">
                            ${languages.map(l => `<option value="${l.code}" ${prefs.language === l.code ? 'selected' : ''}>${l.name}</option>`).join('')}
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label class="settings-content__label">Theme Mode</label>
                         <div class="settings-content__segmented-control">
                            <button class="settings-content__segment ${!prefs.theme || prefs.theme === 'dark' ? 'active' : ''}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'dark'})">
                                🌙 Dark
                            </button>
                            <button class="settings-content__segment ${prefs.theme === 'light' ? 'active' : ''}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'light'})">
                                ☀️ Light
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

export const personalizationTemplate = (prefs: Prefs, sliderConfigs: { label: string, key: string, min: number, max: number }[]) => `
    <div class="bento-grid">
        <div class="bento-card" style="grid-column: span 2;">
            <div class="mono-tag" style="margin-bottom: 12px;">Interface / Grid Architecture</div>
            <div class="settings-content__personalization-grid">
                ${sliderConfigs.map(cfg => `
                    <div class="settings-content__slider-group">
                        <div class="settings-content__slider-header">
                            <label class="settings-content__slider-label">${cfg.label}</label>
                            <span class="settings-content__slider-value" id="val-${cfg.key}">${prefs[cfg.key] || cfg.min}</span>
                        </div>
                        <input type="range" 
                               min="${cfg.min}" max="${cfg.max}" 
                               value="${prefs[cfg.key] || cfg.min}"
                               oninput="this.getRootNode().host.updateGridPref('${cfg.key}', this.value)"
                               onchange="this.getRootNode().host.commitGridPref('${cfg.key}', this.value)">
                    </div>
                `).join('')}
            </div>
            </div>
            <p class="settings-content__text-dim" style="font-size: 11px; margin-top: 24px; font-family: var(--font-mono);">
                > Adaptive hardware acceleration active. Changes apply globally.
            </p>
        </div>
    </div>
`;

export const usersTemplate = (users: any[]) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">Administration / Access Control</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">User Management</h3>
                <app-button variant="primary" onclick="this.getRootNode().host.openAddUserModal()" style="width: auto; padding: 0 16px;">+ Add User</app-button>
            </div>

            <div class="settings-content__user-list">
                ${users.map(u => `
                    <div class="settings-content__user-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <app-avatar initials="${u.username.substring(0, 2).toUpperCase()}" src="${u.avatar_url}" style="width: 32px; height: 32px; font-size: 12px;"></app-avatar>
                            <div>
                                <div style="font-weight: 500; font-size: 14px;">${u.username}</div>
                                <div class="mono-tag" style="font-size: 10px;">${u.role}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                             <app-button variant="ghost" onclick="this.getRootNode().host.openEditUserModal(${u.id}, '${u.username}', '${u.role}')">Edit</app-button>
                            <app-button variant="ghost" onclick="this.getRootNode().host.deleteUser(${u.id})">Delete</app-button>
                        </div>
                    </div>
                `).join('')}
            </div>
             ${users.length === 0 ? '<p class="settings-content__text-dim">No users found.</p>' : ''}
        </div>
    </div>
    
     <dialog id="add-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <h3 style="margin-top: 0; margin-bottom: 16px;">Add New User</h3>
        <div class="settings-content__form-group">
            <label class="settings-content__label">Username</label>
            <input type="text" id="new-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">Password</label>
            <input type="password" id="new-user-password" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">Role</label>
            <select id="new-user-role" class="settings-content__select">
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button onclick="this.getRootNode().getElementById('add-user-modal').close()">Cancel</app-button>
            <app-button variant="primary" onclick="this.getRootNode().host.createUser()">Create</app-button>
        </div>
    </dialog>

    <dialog id="edit-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <h3 style="margin-top: 0; margin-bottom: 16px;">Edit User</h3>
        <input type="hidden" id="edit-user-id">
        <div class="settings-content__form-group">
            <label class="settings-content__label">Username</label>
            <input type="text" id="edit-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">New Password (Optional)</label>
            <input type="password" id="edit-user-password" class="settings-content__input" placeholder="Leave blank to keep current">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">Role</label>
            <select id="edit-user-role" class="settings-content__select">
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button onclick="this.getRootNode().getElementById('edit-user-modal').close()">Cancel</app-button>
            <app-button variant="primary" onclick="this.getRootNode().host.updateAdminUser()">Save Changes</app-button>
        </div>
    </dialog>
`;

export const advancedTemplate = () => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <!-- System Migration Section -->
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 24px;">System Data & Migration</div>
            
            <div class="settings-content__action-group">
                <!-- Export -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>Export Database</h3>
                        <p>Create a complete JSON snapshot of all users, bookmarks, sections, and system preferences. Ideal for backups or migration.</p>
                    </div>
                    <app-button variant="primary" onclick="this.getRootNode().host.downloadBackup()">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        Download Backup
                    </app-button>
                </div>

                <!-- Import -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>Import Database</h3>
                        <p>Restore system state from a previous backup file. <br><span style="color: var(--accent); font-weight: 500;">Note: This will strictly match the backup file, removing any newer data.</span></p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                         <input type="file" id="backup-upload" accept=".json" style="display: none;" onchange="this.getRootNode().host.restoreBackup(this.files[0])">
                         <app-button variant="primary" onclick="this.getRootNode().getElementById('backup-upload').click()">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                            Select File...
                         </app-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Danger Zone -->
        <div class="settings-content__danger-zone">
             <div>
                <div class="settings-content__danger-title">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: #fa5252;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Factory Reset
                </div>
                <p class="settings-content__text-dim" style="font-size: 13px; color: rgba(250, 82, 82, 0.8);">
                    Irrevocably wipe all data and return to initial setup state.
                </p>
             </div>
             <app-button onclick="this.getRootNode().host.openResetModal()" style="border-color: rgba(250, 82, 82, 0.4); color: #fa5252; background: transparent; transition: all 0.2s;">
                Reset System
             </app-button>
        </div>
    </div>

    <!-- Factory Reset Confirmation Modal -->
    <dialog id="reset-confirm-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 440px; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
        <h3 style="margin-top: 0; margin-bottom: 16px; color: #fa5252; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px;">
            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: #fa5252;"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            Confirm Factory Reset
        </h3>
        <p class="settings-content__text-dim" style="font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
            This action is <b>final</b>. All users, bookmarks, themes, and configuration will be deleted immediately.
            To confirm, please type <span style="font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;">delete</span> below.
        </p>

        <div class="settings-content__form-group">
            <input type="text" id="reset-confirm-input" class="settings-content__input" placeholder="Type 'delete'" style="border-color: rgba(250, 82, 82, 0.3); font-family: monospace;">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 32px; width: 100%;">
            <app-button onclick="this.getRootNode().getElementById('reset-confirm-modal').close()" style="width: auto;">Cancel</app-button>
            <button class="settings-content__reset-btn" onclick="this.getRootNode().host.executeFactoryReset()" style="flex: 1;">
                Erase Everything
            </button>
        </div>
    </dialog>
`;
