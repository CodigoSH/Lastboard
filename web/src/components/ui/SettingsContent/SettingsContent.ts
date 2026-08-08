import { i18n } from '../../../services/i18n';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { userStore } from '../../../store/userStore';
import { updateStore } from '../../../store/updateStore';
import { userService } from '../../../services/userService';
import { ThemeService } from '../../../services/ThemeService';
import { apiService } from '../../../services/apiService';
import { importService } from '../../../services/importService';
import { accountTemplate, themeTemplate, personalizationTemplate, usersTemplate, advancedTemplate, dataTemplate, monitoringTemplate, notificationsTemplate, aboutTemplate, updateZoneTemplate } from './SettingsContent.template';
import { User, UserPreferences } from '../../../types';
import { setupPasswordToggles } from '../../../services/passwordToggle';
import '../Select/Select';
import '../ColorPicker/ColorPicker';
import '../IconSelectionModal/IconSelectionModal';
import css from './SettingsContent.css' with { type: 'text' };

class SettingsContent extends HTMLElement {
    private prefs: UserPreferences;
    private users: User[] = [];
    private importFormat = 'native';
    private monitoring: {
        mode: string; interval_sec: number; alerts_enabled: boolean;
        notify_type: string; notify_url: string; notify_token: string; fail_threshold: number;
    } = { mode: 'tab', interval_sec: 300, alerts_enabled: false, notify_type: 'none', notify_url: '', notify_token: '', fail_threshold: 1 };


    static get observedAttributes() {
        return ['section'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
        // Safe initial state while loading
        this.prefs = {
            accent_color: '#0078D4',
            language: 'en',
            widget_min_width: 140,
            beta_updates: false,
            unit_system: 'metric',
            dashboard_background: ''
        };
        // Delegated listeners attached once to the stable shadow root (they
        // survive every render() innerHTML swap). Replaces the inline on* handlers
        // that required CSP 'unsafe-inline'.
        setupPasswordToggles(this.shadowRoot!);
        this.setupDelegation();
    }

    /**
     * Single set of delegated listeners driving every control in the settings
     * panel via data-action / data-change / data-input attributes.
     */
    private setupDelegation() {
        const root = this.shadowRoot!;

        // Keyboard activation for the non-native controls (the avatar / background
        // upload tiles are focusable role="button" divs). matches() (not closest())
        // so a real <button> nested inside — e.g. remove-background — never double-fires.
        root.addEventListener('keydown', (e) => {
            const key = (e as KeyboardEvent).key;
            if (key !== 'Enter' && key !== ' ') return;
            const el = e.target as HTMLElement;
            if (el.matches?.('[role="button"]')) {
                e.preventDefault();
                el.click();
                return;
            }
            // Enter on an auto-saving text field commits it (blur fires 'change').
            if (key === 'Enter' && el instanceof HTMLInputElement && el.dataset.change) {
                el.blur();
            }
        });

        root.addEventListener('click', (e) => {
            const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
            if (!el) return;
            switch (el.dataset.action) {
                case 'click-file':
                    (root.getElementById(el.dataset.file!) as HTMLElement | null)?.click();
                    break;
                case 'close-modal':
                    (root.getElementById(el.dataset.modal!) as HTMLDialogElement | null)?.close();
                    break;
                case 'update-username':
                    this.updateUsername((root.getElementById('username-input') as HTMLInputElement).value);
                    break;
                case 'update-password':
                    this.updatePassword();
                    break;
                case 'set-accent':
                    this.savePrefs({ accent_color: el.dataset.color! });
                    break;
                case 'set-theme':
                    this.savePrefs({ theme: el.dataset.theme! });
                    break;
                case 'remove-background':
                    this.removeBackground();
                    break;
                case 'open-logo-picker':
                    this.openLogoPicker();
                    break;
                case 'remove-logo':
                    this.savePrefs({ project_logo: '' }, { notify: true });
                    break;
                case 'open-monitor-overview':
                    import('../../../services/EventBus').then(({ eventBus, EVENTS }) =>
                        eventBus.emit(EVENTS.SHOW_MONITOR_OVERVIEW));
                    break;
                case 'clear-monitor-data':
                    this.clearMonitorData();
                    break;
                case 'test-notify':
                    this.testNotify();
                    break;
                case 'export-native':
                    importService.exportNative();
                    break;
                case 'open-add-user':
                    this.openAddUserModal();
                    break;
                case 'edit-user':
                    this.openEditUserModal(Number(el.dataset.userId), el.dataset.username || '');
                    break;
                case 'delete-user':
                    this.deleteUser(Number(el.dataset.userId));
                    break;
                case 'create-user':
                    this.createUser();
                    break;
                case 'update-admin-user':
                    this.updateAdminUser();
                    break;
                case 'download-backup':
                    this.downloadBackup();
                    break;
                case 'factory-reset':
                    this.executeFactoryReset();
                    break;
                case 'perform-update':
                    this.openUpdateModal();
                    break;
                case 'check-updates':
                    this.handleManualCheckUpdates();
                    break;
            }
        });

        root.addEventListener('change', (e) => {
            const el = (e.target as HTMLElement).closest('[data-change]') as HTMLElement | null;
            if (!el) return;
            switch (el.dataset.change) {
                case 'avatar':
                    this.handleAvatarChange(e);
                    break;
                case 'background':
                    this.handleBackgroundChange(e);
                    break;
                case 'project-name':
                    // Auto-save on blur/Enter (a text input fires 'change' then).
                    this.savePrefs({ project_name: (el as HTMLInputElement).value.trim() || 'Lastboard' }, { notify: true });
                    break;
                case 'accent-picker':
                    this.savePrefs({ accent_color: (el as unknown as { value: string }).value });
                    break;
                case 'commit-columns':
                    this.commitColumns((el as HTMLInputElement).value);
                    break;
                case 'restore-backup': {
                    const file = (el as HTMLInputElement).files?.[0];
                    if (file) this.restoreBackup(file);
                    break;
                }
                case 'beta-toggle':
                    this.handleBetaToggle((el as HTMLInputElement).checked);
                    break;
                case 'import-file':
                    this.handleImport(e);
                    break;
                case 'monitoring-toggle':
                    this.saveMonitoring({ mode: (el as HTMLInputElement).checked ? 'background' : 'off' });
                    break;
                case 'alerts-toggle':
                    this.saveMonitoring({ alerts_enabled: (el as HTMLInputElement).checked });
                    break;
                case 'notify-url':
                    this.saveMonitoring({ notify_url: (el as HTMLInputElement).value.trim() });
                    break;
                case 'notify-token':
                    this.saveMonitoring({ notify_token: (el as HTMLInputElement).value.trim() });
                    break;
            }
        });

        root.addEventListener('input', (e) => {
            const el = (e.target as HTMLElement).closest('[data-input]') as HTMLElement | null;
            if (el && el.dataset.input === 'update-columns') {
                this.updateColumns((el as HTMLInputElement).value);
            }
        });
    }

    private unsubscribe: (() => void) | null = null;
    private _renderPending = false;

    connectedCallback() {
        this.unsubscribe = userStore.subscribe(user => {
            if (user && user.preferences) {
                this.prefs = {
                    ...user.preferences,
                    project_name: user.project_name || user.preferences.project_name || 'Lastboard',
                    project_logo: user.project_logo || user.preferences.project_logo || ''
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
        if (section === 'monitoring' || section === 'notifications') {
            this.fetchMonitoring();
        }
        if (section === 'about') {
            // No longer checking automatically here. Using background + manual button.
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
                project_name: u.project_name || u.preferences.project_name || 'Lastboard',
                project_logo: u.project_logo || u.preferences.project_logo || ''
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

    async handleImport(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = ''; // allow re-importing the same file
        if (!file) return;
        try {
            const cfg = await importService.parseFile(file, this.importFormat);
            const count = importService.countItems(cfg);
            if (!count) {
                if (window.notifier) window.notifier.show(i18n.t('settings.import_empty'), 'error');
                return;
            }
            const { eventBus, EVENTS } = await import('../../../services/EventBus');
            eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
                title: i18n.t('settings.import_dashboards'),
                message: i18n.t('settings.import_confirm').replace('{count}', String(count)),
                onConfirm: async () => {
                    try {
                        const gridCols = userStore.getUser()?.preferences?.grid_columns || 12;
                        await importService.materialize(cfg, gridCols, i18n.t('settings.import_ungrouped'));
                        if (window.notifier) window.notifier.show(i18n.t('settings.import_ok'));
                    } catch {
                        if (window.notifier) window.notifier.show(i18n.t('settings.import_fail'), 'error');
                    }
                },
            });
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.import_fail'), 'error');
        }
    }

    async clearMonitorData() {
        const { eventBus, EVENTS } = await import('../../../services/EventBus');
        eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
            title: i18n.t('monitor.clear_all'),
            message: i18n.t('monitor.clear_all_confirm'),
            onConfirm: async () => {
                try {
                    await apiService.delete('/api/monitor/history');
                    if (window.notifier) window.notifier.show(i18n.t('monitor.data_cleared'));
                } catch {
                    if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
                }
            },
        });
    }

    async fetchMonitoring() {
        try {
            this.monitoring = await apiService.get<typeof this.monitoring>('/api/monitor/settings');
            this.render();
        } catch (e) {
            console.error("Failed to fetch monitoring settings", e);
        }
    }

    // Global (system-wide) setting, so it goes through the monitor endpoint
    // rather than savePrefs. Re-renders to toggle dependent rows.
    async saveMonitoring(patch: Partial<typeof this.monitoring>) {
        const next = { ...this.monitoring, ...patch };
        try {
            const saved = await apiService.post<typeof this.monitoring>('/api/monitor/settings', next);
            this.monitoring = saved;
            this.render();
            const { eventBus, EVENTS } = await import('../../../services/EventBus');
            eventBus.emit(EVENTS.MONITORING_CHANGED, { mode: saved.mode });
            if (window.notifier) window.notifier.show(i18n.t('settings.saved'));
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
        }
    }

    async testNotify() {
        try {
            await apiService.post('/api/monitor/test', {
                notify_type: this.monitoring.notify_type,
                notify_url: this.monitoring.notify_url,
                notify_token: this.monitoring.notify_token,
            });
            if (window.notifier) window.notifier.show(i18n.t('settings.notify_test_ok'));
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.notify_test_fail'), 'error');
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'section' && oldValue !== newValue) {
            if (newValue === 'users') {
                this.fetchUsers();
            }
            if (newValue === 'monitoring' || newValue === 'notifications') {
                this.fetchMonitoring();
            }
            if (newValue === 'about') {
                this.checkForUpdates();
            }
            this.render();
        }
    }

    // --- Logic Layer Delegates ---

    // notify: show a "Saved"/error toast. Used for auto-saved text fields (e.g.
    // the project name) where the change isn't otherwise visually obvious; the
    // aesthetic prefs (theme/accent/language) stay silent since the UI reacts.
    async savePrefs(newPrefs: Partial<UserPreferences>, opts: { notify?: boolean } = {}) {
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

        let ok = true;
        try {
            await userStore.updatePreferences(newPrefs);
        } catch {
            // userStore already rolled back aesthetics and reported the failure;
            // restore local state and language here.
            ok = false;
            this.prefs = previousPrefs;
            if (newPrefs.language && previousPrefs.language) {
                i18n.setLanguage(previousPrefs.language);
            }
        }
        this.render();
        if (ok && opts.notify && window.notifier) {
            window.notifier.show(i18n.t('settings.saved'));
        }
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
        // savePrefs re-renders, which repaints the badge.
        this.savePrefs({ beta_updates: checked }, { notify: true });
    }

    updateColumns(value: string) {
        const valSpan = this.shadowRoot!.getElementById('val-grid_columns');
        if (valSpan) valSpan.textContent = value;
        document.documentElement.style.setProperty('--user-preferred-columns', value);
    }

    // Saved without going through savePrefs on purpose: that re-renders the
    // panel, and rebuilding the slider mid-drag (or between arrow keys) would
    // steal the focus the user is still holding.
    async commitColumns(value: string) {
        const val = parseInt(value);
        this.prefs = { ...this.prefs, grid_columns: val };
        try {
            await userStore.updatePreferences({ grid_columns: val });
            if (window.notifier) window.notifier.show(i18n.t('settings.saved'));
        } catch {
            // userStore rolled back and already told the user.
        }
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

            // Clear inputs
            (this.shadowRoot!.getElementById('current-password') as HTMLInputElement).value = '';
            (this.shadowRoot!.getElementById('new-password') as HTMLInputElement).value = '';
            (this.shadowRoot!.getElementById('confirm-password') as HTMLInputElement).value = '';

            // Show success message
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_changed_relogin'));

            // Session was invalidated by backend, redirect to login
            setTimeout(() => {
                // Clear local storage
                localStorage.removeItem('lastboard_user_cache');
                document.body.style.opacity = '0';
                window.location.href = '/login';
            }, 2000);
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_incorrect'), 'error');
        }
    }

    async handleAvatarChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validation: Must be image
        if (!file.type.startsWith('image/')) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.invalid_image_type'), 'error');
            return;
        }

        try {
            const resizedDataUrl = await this.resizeImage(file, 256, 256);
            const u = userStore.getUser();
            if (!u) return;

            // Optimistic localized update
            this.prefs.avatar_url = resizedDataUrl;

            await userStore.updateProfile({
                username: u.username,
                avatar_url: resizedDataUrl
            });

            this.render();
            if (window.notifier) window.notifier.show(i18n.t('notifier.avatar_updated'));
        } catch (error) {
            console.error('Resize failed', error);
            if (window.notifier) window.notifier.show(i18n.t('notifier.avatar_error'), 'error');
        }
    }

    async handleBackgroundChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validation: Must be image
        if (!file.type.startsWith('image/')) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.invalid_image_type'), 'error');
            return;
        }

        try {
            // Backgrounds can be larger than avatars. 1920x1080 is a good balance.
            const resizedDataUrl = await this.resizeImage(file, 1920, 1080);
            
            // Optimistic localized update
            this.prefs.dashboard_background = resizedDataUrl;

            await this.savePrefs({
                dashboard_background: resizedDataUrl
            }, { notify: true });

            this.render();
        } catch (error) {
            console.error('Background resize failed', error);
            if (window.notifier) window.notifier.show(i18n.t('notifier.save_error'), 'error');
        }
    }

    async removeBackground() {
        try {
            this.prefs.dashboard_background = '';
            await this.savePrefs({
                dashboard_background: ''
            }, { notify: true });
            this.render();
        } catch (error) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.save_error'), 'error');
        }
    }

    async openLogoPicker() {
        let modal = document.body.querySelector('icon-selection-modal') as any;
        if (!modal) {
            modal = document.createElement('icon-selection-modal');
            document.body.appendChild(modal);
        }
        const result: string | null = await modal.open();
        if (result) {
            this.prefs.project_logo = result;
            await this.savePrefs({ project_logo: result }, { notify: true });
        }
    }

    private resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate aspect ratio
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }

                    // Draw image on canvas
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert back to base64
                    // Quality 0.8 is good compromise
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = (e) => reject(e);
                img.src = event.target?.result as string;
            };
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    // --- User Management Logic ---

    openAddUserModal() {
        const modal = this.shadowRoot!.getElementById('add-user-modal') as HTMLDialogElement;
        if (modal) modal.showModal();
    }

    async createUser() {
        const username = (this.shadowRoot!.getElementById('new-user-username') as HTMLInputElement).value;
        const password = (this.shadowRoot!.getElementById('new-user-password') as HTMLInputElement).value;

        if (!username || !password) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.fields_required'), 'error');
            return;
        }

        try {
            await userService.createUser({ username, password });
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_created'));
            const modal = this.shadowRoot!.getElementById('add-user-modal') as HTMLDialogElement;
            if (modal) modal.close();
            this.fetchUsers();
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_create_error'), 'error');
        }
    }

    openEditUserModal(id: number, username: string) {
        const modal = this.shadowRoot!.getElementById('edit-user-modal') as HTMLDialogElement;
        if (modal) {
            (this.shadowRoot!.getElementById('edit-user-id') as HTMLInputElement).value = id.toString();
            (this.shadowRoot!.getElementById('edit-user-username') as HTMLInputElement).value = username;
            (this.shadowRoot!.getElementById('edit-user-password') as HTMLInputElement).value = '';
            modal.showModal();
        }
    }

    async updateAdminUser() {
        const id = parseInt((this.shadowRoot!.getElementById('edit-user-id') as HTMLInputElement).value);
        const username = (this.shadowRoot!.getElementById('edit-user-username') as HTMLInputElement).value;
        const password = (this.shadowRoot!.getElementById('edit-user-password') as HTMLInputElement).value;

        if (!username) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.username_required'), 'error');
            return;
        }

        try {
            await userService.adminUpdateUser({
                id,
                username,
                password: password || undefined
            });
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_updated'));
            const modal = this.shadowRoot!.getElementById('edit-user-modal') as HTMLDialogElement;
            if (modal) modal.close();
            this.fetchUsers();
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

        const passwordModal = document.querySelector('password-confirm-modal') as any;
        if (passwordModal) {
            const password = await passwordModal.prompt(
                i18n.t('general.delete'),
                i18n.t('notifier.user_delete_confirm')
            );
            if (!password) return;

            try {
                // Optimistic UI Update
                this.users = this.users.filter(u => u.id !== id);
                this.render();

                await userService.deleteUser(id, password);
                if (window.notifier) window.notifier.show(i18n.t('notifier.user_deleted'));
                this.fetchUsers();
            } catch (e: any) {
                this.fetchUsers();
                let msg = i18n.t('notifier.user_delete_error');
                if (e.message && e.message.includes('error.cannot_delete_superadmin')) {
                    msg = i18n.t('notifier.user_delete_superadmin');
                } else if (e.status === 401) {
                    msg = i18n.t('notifier.password_incorrect');
                }
                if (window.notifier) window.notifier.show(msg, 'error');
            }
        }
    }

    // --- Rendering ---

    getContent(section: string) {
        const user = userStore.getUser() || {
            username: 'Guest',
            initials: '??',
            role: i18n.t('role.view_only'),
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

            case 'data':
                return dataTemplate();

            case 'monitoring':
                return monitoringTemplate(this.monitoring);

            case 'notifications':
                return notificationsTemplate(this.monitoring);

            case 'users':
                return usersTemplate(this.users);

            case 'about':
                return aboutTemplate(this.version, this.updateInfo, user.role || 'user', user.preferences?.beta_updates || false, this.isCheckingUpdates);

            default:
                return `<div class="bento-card"><h3>${section}</h3><p class="settings-content__text-dim">${i18n.t('settings.default_module_desc')}</p></div>`;
        }
    }

    // --- Update System Logic ---
    private version = 'v1.7.0-Beta.08'; // Populated by checkForUpdates() from backend
    private updateInfo: any = null;
    private checkUpdatesPromise: Promise<void> | null = null;
    private isCheckingUpdates = false;

    async handleManualCheckUpdates() {
        if (this.isCheckingUpdates) return;
        this.isCheckingUpdates = true;
        this.updateUpdateUI();

        try {
            await this.checkForUpdates();
            if (this.updateInfo && !this.updateInfo.available) {
                if (window.notifier) window.notifier.show(i18n.t('settings.up_to_date'));
            }
        } finally {
            this.isCheckingUpdates = false;
            this.updateUpdateUI();
        }
    }

    async checkForUpdates() {
        if (this.checkUpdatesPromise) return this.checkUpdatesPromise;

        this.checkUpdatesPromise = (async () => {
            try {
                const { updateService } = await import('../../../services/UpdateService');
                const isBeta = this.prefs.beta_updates || false;

                this.updateInfo = await updateService.check(isBeta);
                if (this.updateInfo) {
                    this.version = this.updateInfo.current_version;
                    // Keep the store current so the modal always opens on the
                    // latest result — including a check that ran while it was
                    // already open.
                    updateStore.setInfo(this.updateInfo);
                    this.updateUpdateUI();
                }
            } catch (e) {
                console.error("Check update failed", e);
            } finally {
                this.checkUpdatesPromise = null;
            }
        })();

        return this.checkUpdatesPromise;
    }



    /**
     * Hands the update over to the modal.
     *
     * This panel used to run the whole thing inline, which meant the progress
     * lived in markup that any re-render of this section wiped, and it vanished
     * altogether if the drawer was closed. Here it only opens the modal; the
     * process itself belongs to updateStore.
     */
    private openUpdateModal() {
        const modal = document.querySelector('update-modal') as any;
        if (!modal) return;
        updateStore.setInfo(this.updateInfo);
        modal.open();
    }

    // --- System Logic ---

    async downloadBackup() {
        const confirmationModal = document.querySelector('confirmation-modal') as any;
        if (confirmationModal) {
            const confirmed = await confirmationModal.confirm(
                i18n.t('action.download_backup'),
                i18n.t('notifier.backup_confirm')
            );
            if (!confirmed) return;
        }
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
            await apiService.postForm('/api/system/restore', formData);
            if (window.notifier) window.notifier.show(i18n.t('notifier.restore_success'));
            // Clear all localStorage so stale cached items/dashboard IDs don't
            // survive into the fresh session. The server also sends Clear-Site-Data
            // to wipe browser cache and cookies, but localStorage is cleared here
            // as a fallback for browsers that don't support that header.
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '/';
            }, 2000);
        } catch (e) {
            console.error('Restore error', e);
            if (window.notifier) window.notifier.show(i18n.t('notifier.restore_failed'), 'error');
        }
    }



    async executeFactoryReset() {

        const passwordModal = document.querySelector('password-confirm-modal') as any;
        if (!passwordModal) return;

        const password = await passwordModal.prompt(
            i18n.t('settings.factory_reset'),
            i18n.t('settings.confirm_reset_msg')
        );

        if (!password) return;

        const btn = this.shadowRoot!.getElementById('btn-reset-confirm') as HTMLButtonElement;

        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = i18n.t('settings.restoring') || "Restoring...";
            }

            await apiService.post('/api/system/reset', { password });

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

        } catch (e) {
            console.error('Reset error', e);
            if (window.notifier) window.notifier.show(i18n.t('notifier.reset_error'), 'error');
        }
    }

    render() {
        if (this._renderPending) return;
        this._renderPending = true;
        requestAnimationFrame(() => {
            this._renderPending = false;
            this._doRender();
        });
    }

    private _doRender() {
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

        const unitSelect = this.shadowRoot!.getElementById('unit-system-select') as any;
        if (unitSelect) {
            unitSelect.options = [
                { value: 'metric', label: i18n.t('settings.unit_metric') },
                { value: 'imperial', label: i18n.t('settings.unit_imperial') }
            ];

            // Unlike the language or the theme, switching units changes nothing
            // on screen until a widget refreshes, so confirm the save.
            unitSelect.addEventListener('change', (e: CustomEvent) => {
                this.savePrefs({ unit_system: e.detail }, { notify: true });
            });
        }

        const monitoringIntervalSelect = this.shadowRoot!.getElementById('monitoring-interval') as any;
        if (monitoringIntervalSelect) {
            monitoringIntervalSelect.options = [
                { value: '60', label: i18n.t('settings.interval_1m') },
                { value: '300', label: i18n.t('settings.interval_5m') },
                { value: '600', label: i18n.t('settings.interval_10m') },
                { value: '1800', label: i18n.t('settings.interval_30m') },
            ];
            monitoringIntervalSelect.addEventListener('change', (e: CustomEvent) => {
                this.saveMonitoring({ interval_sec: parseInt(e.detail, 10) });
            });
        }

        const notifyTypeSelect = this.shadowRoot!.getElementById('notify-type') as any;
        if (notifyTypeSelect) {
            notifyTypeSelect.options = [
                { value: 'none', label: i18n.t('settings.notify_none') },
                { value: 'ntfy', label: 'ntfy' },
                { value: 'gotify', label: 'Gotify' },
                { value: 'webhook', label: i18n.t('settings.notify_webhook') },
            ];
            notifyTypeSelect.addEventListener('change', (e: CustomEvent) => {
                this.saveMonitoring({ notify_type: e.detail });
            });
        }

        const importFormatSelect = this.shadowRoot!.getElementById('import-format') as any;
        if (importFormatSelect) {
            importFormatSelect.options = [
                { value: 'native', label: i18n.t('settings.import_native') },
                { value: 'homepage-services', label: 'Homepage — services.yaml' },
                { value: 'homepage-bookmarks', label: 'Homepage — bookmarks.yaml' },
                { value: 'dashy', label: 'Dashy — conf.yml' },
            ];
            importFormatSelect.value = this.importFormat;
            importFormatSelect.addEventListener('change', (e: CustomEvent) => {
                this.importFormat = e.detail;
            });
        }

        const failThresholdSelect = this.shadowRoot!.getElementById('fail-threshold') as any;
        if (failThresholdSelect) {
            failThresholdSelect.options = [
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '5', label: '5' },
            ];
            failThresholdSelect.addEventListener('change', (e: CustomEvent) => {
                this.saveMonitoring({ fail_threshold: parseInt(e.detail, 10) });
            });
        }
    }

    updateBetaBadgeVisuals() {
        // Simple initialization of the toggle state
        setTimeout(() => {
            const toggle = this.shadowRoot!.getElementById('beta-updates-toggle-badge') as HTMLInputElement;
            if (toggle) {
                toggle.checked = this.prefs.beta_updates || false;
            }
        }, 0);
    }

    private updateUpdateUI() {
        const wrapper = this.shadowRoot!.getElementById('update-zone-wrapper');
        if (wrapper) {
            const user = userStore.getUser();
            const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'administrator';
            wrapper.innerHTML = updateZoneTemplate(isAdmin, this.updateInfo, this.isCheckingUpdates);
        }
        const versionLabel = this.shadowRoot!.getElementById('current-version-label');
        if (versionLabel && this.version) {
            versionLabel.textContent = this.version;
        }
    }
}

if (!customElements.get('settings-content')) {
    customElements.define('settings-content', SettingsContent);
}
