import { i18n } from '../../../services/i18n';
import { userStore } from '../../../store/userStore';
import { userService } from '../../../services/userService';
import { ThemeService } from '../../../services/ThemeService';
import { accountTemplate, themeTemplate, personalizationTemplate, usersTemplate, advancedTemplate, aboutTemplate } from './SettingsContent.template';
import { User, UserPreferences } from '../../../types';
// @ts-ignore
import css from './SettingsContent.css' with { type: 'text' };

class SettingsContent extends HTMLElement {
    private prefs: UserPreferences;
    private users: User[] = []; // Users list for admin

    static get observedAttributes() {
        return ['section'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        // Safe initial state while loading
        this.prefs = {
            accent_color: '#0078D4',
            language: 'en',
            grid_columns_pc: 9,
            grid_columns_tablet: 4,
            grid_columns_mobile: 2
        };
    }

    connectedCallback() {
        // Trigger fetch which performs the actual state sync
        this.fetchPrefs();
        if (this.getAttribute('section') === 'users') {
            this.fetchUsers();
        }
        this.render();
    }

    async fetchPrefs() {
        const u = userStore.getUser();
        if (u && u.preferences) {
            this.prefs = {
                ...u.preferences,
                project_name: u.project_name || u.preferences.project_name || 'Kashboard'
            };
            this.render();
        }
    }

    async fetchUsers() {
        try {
            this.users = await userService.getUsers();
            this.render();
        } catch (e) {
            console.error("Failed to fetch users", e);
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'section' && oldValue !== newValue) {
            if (newValue === 'users') {
                this.fetchUsers();
            }
            if (newValue === 'about') {
                this.checkForUpdates();
            }
            this.render();
        }
    }

    // --- Logic Layer Delegates ---

    async savePrefs(newPrefs: Partial<UserPreferences>) {
        // Optimistic UI state update
        this.prefs = { ...this.prefs, ...newPrefs };

        if (newPrefs.accent_color) {
            this.applyAccent(newPrefs.accent_color);
        }
        if (newPrefs.language) {
            i18n.setLanguage(newPrefs.language);
        }
        if (newPrefs.theme) {
            if (newPrefs.theme === 'dark') {
                ThemeService.enableDark();
            } else {
                ThemeService.enableLight();
            }
        }

        await userStore.updatePreferences(newPrefs);
        this.render();
    }

    applyAccent(color: string) {
        if (color && color.startsWith('#')) {
            document.documentElement.style.setProperty('--accent', color);
            return;
        }
        const colorMap: Record<string, string> = {
            'blue': '#228be6', 'indigo': '#4c6ef5', 'cyan': '#15aabf',
            'teal': '#12b886', 'orange': '#fd7e14', 'red': '#fa5252', 'grape': '#be4bdb'
        };
        const hex = colorMap[color] || '#0078D4';
        document.documentElement.style.setProperty('--accent', hex);
    }

    updateGridPref(key: string, value: string) {
        const valSpan = this.shadowRoot!.getElementById(`val-${key}`);
        if (valSpan) valSpan.textContent = value;

        const cssVarMap: Record<string, string> = {
            'grid_columns_pc': '--grid-columns-pc',
            'grid_columns_tablet': '--grid-columns-tablet',
            'grid_columns_mobile': '--grid-columns-mobile'
        };
        if (cssVarMap[key]) {
            document.documentElement.style.setProperty(cssVarMap[key], value);
        }
    }

    commitGridPref(key: string, value: string) {
        // @ts-ignore
        userStore.updatePreferences({ [key]: parseInt(value) });
    }

    async updateUsername(newUsername: string) {
        const u = userStore.getUser();
        if (!u) return;
        await userStore.updateProfile({
            username: newUsername,
            avatar_url: this.prefs.avatar_url || u.avatar_url
        });
        if (window.notifier) window.notifier.show(i18n.t('notifier.username_updated'));
    }

    async updatePassword() {
        const currentPw = (this.shadowRoot!.getElementById('current-password') as HTMLInputElement)?.value;
        const newPw = (this.shadowRoot!.getElementById('new-password') as HTMLInputElement)?.value;
        const confirmPw = (this.shadowRoot!.getElementById('confirm-password') as HTMLInputElement)?.value;

        if (!currentPw) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_required'), 'error');
            return;
        }

        if (newPw !== confirmPw) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_mismatch'), 'error');
            return;
        }

        if (!newPw) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_empty'), 'error');
            return;
        }

        try {
            await userStore.changePassword({
                current_password: currentPw,
                new_password: newPw
            });
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_changed'));

            // Clear inputs
            (this.shadowRoot!.getElementById('current-password') as HTMLInputElement).value = '';
            (this.shadowRoot!.getElementById('new-password') as HTMLInputElement).value = '';
            (this.shadowRoot!.getElementById('confirm-password') as HTMLInputElement).value = '';
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_incorrect'), 'error');
        }
    }

    async handleAvatarChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            const u = userStore.getUser();
            if (!u) return;

            // Optimistic localized update
            this.prefs.avatar_url = dataUrl;

            await userStore.updateProfile({
                username: u.username,
                avatar_url: dataUrl
            });

            this.render();
            if (window.notifier) window.notifier.show(i18n.t('notifier.avatar_updated'));
        };
        reader.readAsDataURL(file);
    }

    // --- User Management Logic ---

    openAddUserModal() {
        const modal = this.shadowRoot!.getElementById('add-user-modal') as HTMLDialogElement;
        if (modal) modal.showModal();
    }

    async createUser() {
        const username = (this.shadowRoot!.getElementById('new-user-username') as HTMLInputElement).value;
        const password = (this.shadowRoot!.getElementById('new-user-password') as HTMLInputElement).value;
        const role = (this.shadowRoot!.getElementById('new-user-role') as HTMLSelectElement).value;

        if (!username || !password) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.fields_required'), 'error');
            return;
        }

        try {
            await userService.createUser({ username, password, role });
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_created'));
            const modal = this.shadowRoot!.getElementById('add-user-modal') as HTMLDialogElement;
            if (modal) modal.close();
            this.fetchUsers(); // Refresh list
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_create_error'), 'error');
        }
    }

    openEditUserModal(id: number, username: string, role: string) {
        const modal = this.shadowRoot!.getElementById('edit-user-modal') as HTMLDialogElement;
        if (modal) {
            (this.shadowRoot!.getElementById('edit-user-id') as HTMLInputElement).value = id.toString();
            (this.shadowRoot!.getElementById('edit-user-username') as HTMLInputElement).value = username;
            (this.shadowRoot!.getElementById('edit-user-role') as HTMLSelectElement).value = role;
            (this.shadowRoot!.getElementById('edit-user-password') as HTMLInputElement).value = ''; // Reset
            modal.showModal();
        }
    }

    async updateAdminUser() {
        const id = parseInt((this.shadowRoot!.getElementById('edit-user-id') as HTMLInputElement).value);
        const username = (this.shadowRoot!.getElementById('edit-user-username') as HTMLInputElement).value;
        const password = (this.shadowRoot!.getElementById('edit-user-password') as HTMLInputElement).value;
        const role = (this.shadowRoot!.getElementById('edit-user-role') as HTMLSelectElement).value;

        if (!username) {
            if (window.notifier) window.notifier.show('Username required', 'error');
            return;
        }

        try {
            await userService.adminUpdateUser({
                id,
                username,
                role,
                password: password || undefined // Only send if set
            });
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_updated'));
            const modal = this.shadowRoot!.getElementById('edit-user-modal') as HTMLDialogElement;
            if (modal) modal.close();
            this.fetchUsers(); // Refresh list
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_update_error'), 'error');
        }
    }

    async deleteUser(id: number) {
        const confirmationModal = document.querySelector('confirmation-modal') as any;
        if (confirmationModal) {
            const confirmed = await confirmationModal.confirm(
                i18n.t('general.delete'),
                i18n.t('notifier.user_delete_confirm')
            );
            if (!confirmed) return;
        }

        try {
            await userService.deleteUser(id);
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_deleted'));
            this.fetchUsers();
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_delete_error'), 'error');
        }
    }

    // --- Rendering ---

    getContent(section: string) {
        const user = userStore.getUser() || {
            username: 'Guest',
            initials: '??',
            role: 'View Only',
            avatar_url: '',
            accent_color: '#0078D4',
            language: 'en',
            preferences: {}
        } as User;

        switch (section) {
            case 'account':
                return accountTemplate(user);

            case 'theme': {
                const colorMap: Record<string, string> = {
                    'blue': '#228be6', 'indigo': '#4c6ef5', 'cyan': '#15aabf',
                    'teal': '#12b886', 'orange': '#fd7e14', 'red': '#fa5252', 'grape': '#be4bdb'
                };
                const colors = Object.keys(colorMap);
                return themeTemplate(this.prefs, colorMap, colors);
            }

            case 'personalization': {
                const sliderConfigs = [
                    { label: i18n.t('settings.grid_pc'), key: 'grid_columns_pc', min: 4, max: 12 },
                    { label: i18n.t('settings.grid_tablet'), key: 'grid_columns_tablet', min: 2, max: 6 },
                    { label: i18n.t('settings.grid_mobile'), key: 'grid_columns_mobile', min: 1, max: 3 }
                ];
                return personalizationTemplate(this.prefs, sliderConfigs);
            }

            case 'advanced':
                return advancedTemplate();

            case 'users':
                return usersTemplate(this.users);

            case 'about':
                return aboutTemplate(this.version, this.updateInfo);

            default:
                return `<div class="bento-card"><h3>${section}</h3><p class="settings-content__text-dim">${i18n.t('settings.default_module_desc')}</p></div>`;
        }
    }

    // --- Update System Logic ---
    private version = 'v0.0.1'; // Should be sync with backend or injected
    private updateInfo: any = null;

    async checkForUpdates() {
        try {
            const res = await fetch('/api/system/update/check');
            if (res.ok) {
                this.updateInfo = await res.json();
                this.version = this.updateInfo.current_version;
                this.render();
            }
        } catch (e) {
            console.error("Check update failed", e);
        }
    }

    async performUpdate(assetUrl: string) {
        const confirmationModal = document.querySelector('confirmation-modal') as any;
        if (confirmationModal) {
            const confirmed = await confirmationModal.confirm(
                i18n.t('settings.update_available'),
                i18n.t('notifier.update_start_confirm')
            );
            if (!confirmed) return;
        }

        const btn = this.shadowRoot!.getElementById('btn-update-now') as any;
        const status = this.shadowRoot!.getElementById('update-status');
        if (btn) btn.loading = true;

        if (status) {
            status.style.display = 'block';
            status.textContent = i18n.t('notifier.update_downloading');
        }

        try {
            const res = await fetch('/api/system/update/perform', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asset_url: assetUrl })
            });

            if (res.ok) {
                if (status) status.textContent = i18n.t('notifier.update_verified');
                setTimeout(() => {
                    window.location.reload();
                }, 5000);
            } else {
                const err = await res.text();
                if (status) {
                    status.style.color = '#fa5252';
                    status.textContent = i18n.t('notifier.update_failed') + err;
                }
                if (btn) btn.loading = false;
            }
        } catch (e) {
            console.error("Update failed", e);
            if (status) {
                status.style.color = '#fa5252';
                status.textContent = i18n.t('notifier.update_error');
            }
            if (btn) btn.loading = false;
        }
    }

    // --- System Logic ---

    downloadBackup() {
        window.location.href = '/api/system/backup';
    }

    async restoreBackup(file: File) {
        if (!file) return;

        const confirmationModal = document.querySelector('confirmation-modal') as any;
        if (confirmationModal) {
            const confirmed = await confirmationModal.confirm(
                i18n.t('general.restore'),
                i18n.t('notifier.restore_confirm')
            );
            if (!confirmed) return;
        }

        const formData = new FormData();
        formData.append('backup_file', file);

        try {
            const res = await fetch('/api/system/restore', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                if (window.notifier) window.notifier.show(i18n.t('notifier.restore_success'));
                setTimeout(() => window.location.reload(), 2000);
            } else {
                if (window.notifier) window.notifier.show(i18n.t('notifier.restore_failed'), 'error');
            }
        } catch (e) {
            console.error('Restore error', e);
            if (window.notifier) window.notifier.show(i18n.t('notifier.restore_failed'), 'error');
        }
    }

    openResetModal() {
        const modal = this.shadowRoot!.getElementById('reset-confirm-modal') as HTMLDialogElement;
        const input = this.shadowRoot!.getElementById('reset-confirm-input') as HTMLInputElement;
        if (modal) {
            if (input) input.value = '';
            modal.showModal();
        }
    }

    async executeFactoryReset() {
        const input = (this.shadowRoot!.getElementById('reset-confirm-input') as HTMLInputElement);
        if (!input || input.value.trim() !== 'delete') {
            if (window.notifier) window.notifier.show(i18n.t('notifier.reset_confirm_text'), 'error');
            input.focus();
            return;
        }

        try {
            const res = await fetch('/api/system/reset', { method: 'POST' });
            if (res.ok) {
                window.location.href = '/setup';
            } else {
                if (window.notifier) window.notifier.show(i18n.t('notifier.reset_failed'), 'error');
            }
        } catch (e) {
            console.error('Reset error', e);
            if (window.notifier) window.notifier.show(i18n.t('notifier.reset_error'), 'error');
        }
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            <div class="fade-in">
                ${this.getContent(this.getAttribute('section') || 'account')}
            </div>
        `;

        this.shadowRoot!.querySelectorAll('.settings-content__checkbox').forEach(cb => {
            cb.addEventListener('click', () => cb.classList.toggle('settings-content__checkbox--checked'));
        });
    }
}

if (!customElements.get('settings-content')) {
    customElements.define('settings-content', SettingsContent);
}
