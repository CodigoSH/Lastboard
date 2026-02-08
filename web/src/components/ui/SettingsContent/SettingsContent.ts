import { i18n } from '../../../services/i18n';
import { userStore } from '../../../store/userStore';
import { userService } from '../../../services/userService';
import { ThemeService } from '../../../services/ThemeService';
import { accountTemplate, themeTemplate, personalizationTemplate, usersTemplate, advancedTemplate, aboutTemplate } from './SettingsContent.template';
import { User, UserPreferences } from '../../../types';
import '../Select/Select';
// @ts-ignore
import css from './SettingsContent.css' with { type: 'text' };

class SettingsContent extends HTMLElement {
    private prefs: UserPreferences;
    private users: User[] = [];

    private getCsrfToken(): string {
        const match = document.cookie.split('; ').find(c => c.startsWith('csrf_token='));
        return match ? decodeURIComponent(match.split('=')[1]) : '';
    }

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
            widget_min_width: 140,
            beta_updates: false
        };
    }

    private unsubscribe: (() => void) | null = null;

    connectedCallback() {
        this.unsubscribe = userStore.subscribe(user => {
            if (user && user.preferences) {
                this.prefs = {
                    ...user.preferences,
                    project_name: user.project_name || user.preferences.project_name || 'Lastboard'
                };
                this.render();
            }
        });

        // Trigger fetch which performs the actual state sync
        this.fetchPrefs();
        const section = this.getAttribute('section');
        if (section === 'users') {
            this.fetchUsers();
        }
        if (section === 'about') {
            this.checkForUpdates();
        }
        this.render();
    }

    disconnectedCallback() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    async fetchPrefs() {
        const u = userStore.getUser();
        if (u && u.preferences) {
            this.prefs = {
                ...u.preferences,
                project_name: u.project_name || u.preferences.project_name || 'Lastboard'
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
        const previousPrefs = { ...this.prefs };

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

        try {
            await userStore.updatePreferences(newPrefs);
        } catch {
            // userStore already rolled back aesthetics; restore local state and language
            this.prefs = previousPrefs;
            if (newPrefs.language && previousPrefs.language) {
                i18n.setLanguage(previousPrefs.language);
            }
        }
        this.render();
    }

    applyAccent(color: string) {
        let hex = color;
        const colorMap: Record<string, string> = {
            'blue': '#228be6', 'indigo': '#4c6ef5', 'cyan': '#15aabf',
            'teal': '#12b886', 'orange': '#fd7e14', 'red': '#fa5252', 'grape': '#be4bdb'
        };

        if (!color.startsWith('#')) {
            hex = colorMap[color] || '#0078D4';
        }

        document.documentElement.style.setProperty('--accent', hex);

        // Update RGB variable for transparency effects
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
        }
    }

    async handleBetaToggle(checked: boolean) {
        this.savePrefs({ beta_updates: checked });

        // Update visual text state immediately
        const text = this.shadowRoot!.getElementById('beta-text');
        if (text) {
            if (checked) {
                text.style.color = '#2fb344';
                text.style.borderColor = '#2fb344';
                text.style.boxShadow = '0 0 10px rgba(47, 179, 68, 0.2)';
            } else {
                text.style.color = 'var(--text-dim)';
                text.style.borderColor = 'var(--border)';
                text.style.boxShadow = 'none';
            }
        }

        // Re-check for updates with new beta preference
        await this.checkForUpdates();
    }

    updateDensity(value: string) {
        const valSpan = this.shadowRoot!.getElementById('val-widget_min_width');
        if (valSpan) valSpan.textContent = value + 'px';
        document.documentElement.style.setProperty('--widget-min-size', value + 'px');
    }

    commitDensity(value: string) {
        const val = parseInt(value);
        // @ts-ignore
        userStore.updatePreferences({ widget_min_width: val });
    }

    updateColumns(value: string) {
        const valSpan = this.shadowRoot!.getElementById('val-grid_columns');
        if (valSpan) valSpan.textContent = value;
        document.documentElement.style.setProperty('--user-preferred-columns', value);
    }

    commitColumns(value: string) {
        const val = parseInt(value);
        // @ts-ignore
        userStore.updatePreferences({ grid_columns: val });
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

            // Force logout to re-authenticate
            setTimeout(async () => {
                try {
                    await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-Token': this.getCsrfToken() } });
                } catch (e) { /* ignore */ }
                document.body.style.opacity = '0';
                window.location.href = '/login';
            }, 1500);
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
        if (modal) {
            modal.showModal();

            // Initialize role select options
            const roleSelect = this.shadowRoot!.getElementById('new-user-role') as any;
            if (roleSelect) {
                roleSelect.options = [
                    { value: 'user', label: i18n.t('settings.role_user') },
                    { value: 'admin', label: i18n.t('settings.role_admin') }
                ];
            }
        }
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
            (this.shadowRoot!.getElementById('edit-user-password') as HTMLInputElement).value = '';

            modal.showModal();

            // Initialize role select options and value
            const roleSelect = this.shadowRoot!.getElementById('edit-user-role') as any;
            if (roleSelect) {
                roleSelect.options = [
                    { value: 'user', label: i18n.t('settings.role_user') },
                    { value: 'admin', label: i18n.t('settings.role_admin') }
                ];
                roleSelect.value = role;
            }
        }
    }

    async updateAdminUser() {
        const id = parseInt((this.shadowRoot!.getElementById('edit-user-id') as HTMLInputElement).value);
        const username = (this.shadowRoot!.getElementById('edit-user-username') as HTMLInputElement).value;
        const password = (this.shadowRoot!.getElementById('edit-user-password') as HTMLInputElement).value;
        const role = (this.shadowRoot!.getElementById('edit-user-role') as HTMLSelectElement).value;

        if (!username) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.username_required'), 'error');
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
            // Optimistic UI Update: Remove locally first for instant feedback
            const previousUsers = [...this.users];
            this.users = this.users.filter(u => u.id !== id);
            this.render();

            await userService.deleteUser(id);
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_deleted'));

            // Re-fetch to ensure consistency with server state
            this.fetchUsers();
        } catch (e: any) {
            // Rollback if failed
            // We can't easily rollback without re-fetching or storing previous state.
            // Since we already re-fetch in try, let's just re-fetch here too to restore the user if delete failed.
            this.fetchUsers();

            let msg = i18n.t('notifier.user_delete_error');

            // If we have a specific error token from backend
            if (e.message && e.message.includes('error.cannot_delete_superadmin')) {
                msg = i18n.t('notifier.user_delete_superadmin');
            }

            if (window.notifier) window.notifier.show(msg, 'error');
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
                return personalizationTemplate(this.prefs);
            }

            case 'advanced':
                return advancedTemplate();

            case 'users':
                return usersTemplate(this.users);

            case 'about':
                return aboutTemplate(this.version, this.updateInfo, user.role || '');

            default:
                return `<div class="bento-card"><h3>${section}</h3><p class="settings-content__text-dim">${i18n.t('settings.default_module_desc')}</p></div>`;
        }
    }

    // --- Update System Logic ---
    private version = 'v1.1.7-Beta.4'; // Should be sync with backend or injected
    private updateInfo: any = null;
    private checkUpdatesPromise: Promise<void> | null = null;

    async checkForUpdates() {
        // Guard: prevent multiple simultaneous calls
        if (this.checkUpdatesPromise) {
            return this.checkUpdatesPromise;
        }

        this.checkUpdatesPromise = (async () => {
            try {
                const res = await fetch('/api/system/update/check');
                if (res.ok) {
                    this.updateInfo = await res.json();
                    this.version = this.updateInfo.current_version;
                }
            } catch (e) {
                console.error("Check update failed", e);
            } finally {
                this.checkUpdatesPromise = null;
                this.render();
            }
        })();

        return this.checkUpdatesPromise;
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
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this.getCsrfToken() },
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
                    status.style.color = 'var(--danger-color)';
                    status.textContent = i18n.t('notifier.update_failed') + err;
                }
                if (btn) btn.loading = false;
            }
        } catch (e) {
            console.error("Update failed", e);
            if (status) {
                status.style.color = 'var(--danger-color)';
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
                headers: { 'X-CSRF-Token': this.getCsrfToken() },
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

        const btn = this.shadowRoot!.getElementById('btn-reset-confirm') as HTMLButtonElement;

        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = i18n.t('settings.restoring') || "Restoring...";
            }

            const res = await fetch('/api/system/reset', { method: 'POST', headers: { 'X-CSRF-Token': this.getCsrfToken() } });
            if (res.ok) {
                // Show Overlay
                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.9)', zIndex: '9999',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontFamily: 'var(--font-main, sans-serif)'
                });

                overlay.innerHTML = `
                    <div style="border: 4px solid #333; border-top: 4px solid var(--accent, #0078d4); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 24px;"></div>
                    <h2 style="margin: 0; font-weight: 500;">${i18n.t('notifier.system_restarting')}</h2>
                    <p style="opacity: 0.7; margin-top: 8px;">${i18n.t('notifier.please_wait')}</p>
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                `;
                document.body.appendChild(overlay);

                // Poll for recovery
                let attempts = 0;
                const poll = async () => {
                    attempts++;
                    try {
                        const check = await fetch('/', { method: 'HEAD', cache: 'no-store' });
                        if (check.ok) {
                            window.location.href = '/setup';
                            return;
                        }
                    } catch (e) {
                        // Still down
                    }
                    if (attempts < 60) setTimeout(poll, 1000);
                    else window.location.href = '/setup'; // Fallback after 60s
                };

                // Wait 2s for shutdown, then start polling
                setTimeout(poll, 2000);

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

        this.initSelects();

        if (this.getAttribute('section') === 'about') {
            this.updateBetaBadgeVisuals();
        }
    }

    initSelects() {
        const langSelect = this.shadowRoot!.getElementById('language-select') as any;
        if (langSelect) {
            const locales = i18n.getAvailableLocales();
            // Map to format expected by AppSelect
            langSelect.options = locales.map(l => ({
                value: l.code,
                label: `${l.flag} ${l.name}`
            }));

            langSelect.addEventListener('change', (e: CustomEvent) => {
                this.savePrefs({ language: e.detail });
            });
        }

        // Init Role Selects
        const roleOptions = [
            { value: 'user', label: i18n.t('settings.role_user') },
            { value: 'admin', label: i18n.t('settings.role_admin') }
        ];

        const newUserRole = this.shadowRoot!.getElementById('new-user-role') as any;
        if (newUserRole) newUserRole.options = roleOptions;

        const editUserRole = this.shadowRoot!.getElementById('edit-user-role') as any;
        if (editUserRole) editUserRole.options = roleOptions;
    }

    updateBetaBadgeVisuals() {
        setTimeout(() => {
            const toggle = this.shadowRoot!.getElementById('beta-updates-toggle-badge') as HTMLInputElement;
            const text = this.shadowRoot!.getElementById('beta-text');

            // Use current prefs
            const isActive = this.prefs.beta_updates || false;

            if (toggle && text) {
                toggle.checked = isActive;
                if (isActive) {
                    text.style.color = '#2fb344';
                    text.style.borderColor = '#2fb344';
                    text.style.boxShadow = '0 0 10px rgba(47, 179, 68, 0.2)';
                } else {
                    text.style.color = 'var(--text-dim)';
                    text.style.borderColor = 'var(--border)';
                    text.style.boxShadow = 'none';
                }
            }
        }, 0);
    }
}

if (!customElements.get('settings-content')) {
    customElements.define('settings-content', SettingsContent);
}
