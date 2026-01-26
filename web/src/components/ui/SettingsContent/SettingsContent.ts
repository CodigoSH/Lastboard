import { i18n } from '../../../services/i18n';
import { userStore } from '../../../store/userStore';
import { userService } from '../../../services/userService';
import { accountTemplate, themeTemplate, personalizationTemplate, usersTemplate, advancedTemplate } from './SettingsContent.template';
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
                ...u.preferences
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
            i18n.load(newPrefs.language);
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
        if (window.notifier) window.notifier.show('Username updated');
    }

    async updatePassword() {
        const currentPw = (this.shadowRoot!.getElementById('current-password') as HTMLInputElement)?.value;
        const newPw = (this.shadowRoot!.getElementById('new-password') as HTMLInputElement)?.value;
        const confirmPw = (this.shadowRoot!.getElementById('confirm-password') as HTMLInputElement)?.value;

        if (!currentPw) {
            if (window.notifier) window.notifier.show('Current password is required', 'error');
            return;
        }

        if (newPw !== confirmPw) {
            if (window.notifier) window.notifier.show('New passwords do not match', 'error');
            return;
        }

        if (!newPw) {
            if (window.notifier) window.notifier.show('New password cannot be empty', 'error');
            return;
        }

        try {
            await userStore.changePassword({
                current_password: currentPw,
                new_password: newPw
            });
            if (window.notifier) window.notifier.show('Password changed successfully');

            // Clear inputs
            (this.shadowRoot!.getElementById('current-password') as HTMLInputElement).value = '';
            (this.shadowRoot!.getElementById('new-password') as HTMLInputElement).value = '';
            (this.shadowRoot!.getElementById('confirm-password') as HTMLInputElement).value = '';
        } catch (e) {
            if (window.notifier) window.notifier.show('Failed: Incorrect current password', 'error');
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
            if (window.notifier) window.notifier.show('Avatar updated');
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
            if (window.notifier) window.notifier.show('Username and Password required', 'error');
            return;
        }

        try {
            await userService.createUser({ username, password, role });
            if (window.notifier) window.notifier.show('User created successfully');
            const modal = this.shadowRoot!.getElementById('add-user-modal') as HTMLDialogElement;
            if (modal) modal.close();
            this.fetchUsers(); // Refresh list
        } catch (e) {
            if (window.notifier) window.notifier.show('Failed to create user', 'error');
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
            if (window.notifier) window.notifier.show('User updated successfully');
            const modal = this.shadowRoot!.getElementById('edit-user-modal') as HTMLDialogElement;
            if (modal) modal.close();
            this.fetchUsers(); // Refresh list
        } catch (e) {
            if (window.notifier) window.notifier.show('Failed to update user', 'error');
        }
    }

    async deleteUser(id: number) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await userService.deleteUser(id);
            if (window.notifier) window.notifier.show('User deleted');
            this.fetchUsers();
        } catch (e) {
            if (window.notifier) window.notifier.show('Failed to delete user', 'error');
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
                const languages = [
                    { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' },
                    { code: 'de', name: 'Deutsch' }, { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
                    { code: 'ru', name: 'Русский' }, { code: 'ja', name: '日本語' }, { code: 'zh', name: '中文' },
                    { code: 'ko', name: '한국어' }
                ];
                return themeTemplate(this.prefs, colorMap, colors, languages);
            }

            case 'personalization': {
                const sliderConfigs = [
                    { label: 'PC Columns', key: 'grid_columns_pc', min: 4, max: 12 },
                    { label: 'Tablet Columns', key: 'grid_columns_tablet', min: 2, max: 6 },
                    { label: 'Mobile Columns', key: 'grid_columns_mobile', min: 1, max: 3 }
                ];
                return personalizationTemplate(this.prefs, sliderConfigs);
            }

            case 'advanced':
                return advancedTemplate();

            case 'users':
                return usersTemplate(this.users);

            default:
                return `<div class="bento-card"><h3>${section}</h3><p class="settings-content__text-dim">Configuration module.</p></div>`;
        }
    }

    // --- System Logic ---

    downloadBackup() {
        window.location.href = '/api/system/backup';
    }

    async restoreBackup(file: File) {
        if (!file) return;
        if (!confirm('WARNING: restoring a backup will overwrite all current data. Do you want to continue?')) return;

        const formData = new FormData();
        formData.append('backup_file', file);

        try {
            const res = await fetch('/api/system/restore', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                if (window.notifier) window.notifier.show('Backup restored. Reloading...');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                if (window.notifier) window.notifier.show('Restore failed', 'error');
            }
        } catch (e) {
            console.error('Restore error', e);
            if (window.notifier) window.notifier.show('Restore failed', 'error');
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
            if (window.notifier) window.notifier.show('Please type "delete" to confirm', 'error');
            input.focus();
            return;
        }

        try {
            const res = await fetch('/api/system/reset', { method: 'POST' });
            if (res.ok) {
                window.location.href = '/setup';
            } else {
                if (window.notifier) window.notifier.show('Reset failed', 'error');
            }
        } catch (e) {
            console.error('Reset error', e);
            if (window.notifier) window.notifier.show('Reset failed network error', 'error');
        }
    }

    render() {
        // CSS is already safely available as string via import
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

