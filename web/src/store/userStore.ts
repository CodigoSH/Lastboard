import { userService } from '../services/userService';
import { demoService } from '../services/demoService';
import { i18n } from '../services/i18n';
import { User, UserPreferences } from '../types';

type Listener = (user: User | null) => void;

class UserStore {
    private user: User | null = null;
    private listeners: Listener[] = [];
    // Whether the account has come from the server in this page, rather than
    // from the copy kept from the last visit — which may predate a change of
    // permissions, so nothing that asks the server for what a permission
    // guards should go by it.
    private fromServer = false;

    // Returns true when running in pure-frontend demo mode.
    private isDemo(): boolean {
        return window.LASTBOARD_CONFIG?.demo_mode === true;
    }

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        const cached = localStorage.getItem('lastboard_user_cache');
        if (cached) {
            try {
                this.user = JSON.parse(cached);
                this.applyAesthetics();
                this.notify();
            } catch (e) {
                console.error('Failed to parse user cache', e);
            }
        }
    }

    private saveToStorage() {
        if (this.user) {
            localStorage.setItem('lastboard_user_cache', JSON.stringify(this.user));
        }
    }

    subscribe(listener: Listener) {
        this.listeners.push(listener);
        // Notify immediately if we have data
        if (this.user) listener(this.user);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.user));
        this.saveToStorage();
    }

    setUser(userData: User) {
        if (!userData) return;

        // Destructure to remove redundant fields from top-level before storing in this.user
        const { dashboard_background, ...cleanUserData } = userData;

        this.user = {
            ...cleanUserData,
            preferences: {
                accent_color: userData.accent_color || 'orange',
                language: userData.language || 'en',
                theme: userData.theme, // Map theme from backend!
                grid_columns: userData.grid_columns || 12, // Default 12
                project_name: userData.project_name || 'Lastboard',
                project_logo: userData.project_logo || '',
                beta_updates: userData.beta_updates,
                unit_system: userData.unit_system || 'metric',
                dashboard_background: dashboard_background || ''
            },
            project_name: userData.project_name || 'Lastboard',
            project_logo: userData.project_logo || ''
        };

        this.fromServer = true;
        this.applyAesthetics();
        this.notify();
    }

    applyAesthetics() {
        if (!this.user || !this.user.preferences) return;
        const prefs = this.user.preferences;
        const root = document.documentElement;

        // Apply Fixed Grid Columns
        if (prefs.grid_columns) {
            root.style.setProperty('--user-preferred-columns', `${prefs.grid_columns}`);
        } else {
            // Fallback default
            root.style.setProperty('--user-preferred-columns', '12'); // Default 12 columns
        }

        // Apply accent color
        if (prefs.accent_color) {
            const hex = this.getAccentHex(prefs.accent_color);
            root.style.setProperty('--accent', hex);

            // Convert hex to rgb string for transparencies
            let r = 0, g = 120, b = 212; // Fallback to blue
            if (hex.startsWith('#')) {
                const cleanHex = hex.replace('#', '');
                if (cleanHex.length === 6) {
                    r = parseInt(cleanHex.substring(0, 2), 16);
                    g = parseInt(cleanHex.substring(2, 4), 16);
                    b = parseInt(cleanHex.substring(4, 6), 16);
                }
            }
            root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);

            // Persist for Login Page
            localStorage.setItem('lastboard_accent', hex);
        }

        // Apply Dashboard Background
        if (prefs.dashboard_background) {
            root.style.setProperty('--dashboard-background', `url(${prefs.dashboard_background})`);
            root.classList.add('has-custom-background');
        } else {
            root.style.removeProperty('--dashboard-background');
            root.classList.remove('has-custom-background');
        }

        // Apply Theme (Light/Dark)
        if (prefs.theme === 'light') {
            root.classList.add('light-theme');
        } else {
            root.classList.remove('light-theme');
        }
    }

    private getAccentHex(color: string): string {
        if (color.startsWith('#')) return color;
        const map: Record<string, string> = {
            'blue': '#228be6', 'indigo': '#4c6ef5', 'cyan': '#15aabf',
            'teal': '#12b886', 'orange': '#e8520e', 'red': '#fa5252', 'grape': '#be4bdb'
        };
        return map[color] || '#e8520e';
    }

    // Success is NOT announced here: the settings panel decides, per control,
    // whether a save needs a toast (a change with no visible effect) or stays
    // quiet (accent, theme, language — the UI already reacts). Failures always
    // surface, since a silent rollback would look like the change stuck.
    async updatePreferences(newPrefs: Partial<UserPreferences>) {
        if (!this.user || !this.user.preferences) return;

        // --- DEMO MODE: persist to localStorage only ---
        if (this.isDemo()) {
            this.user.preferences = { ...this.user.preferences, ...newPrefs };
            if (newPrefs.accent_color) this.user.accent_color = newPrefs.accent_color;
            if (newPrefs.language) this.user.language = newPrefs.language;
            if (newPrefs.project_name) this.user.project_name = newPrefs.project_name;
            if (newPrefs.project_logo !== undefined) this.user.project_logo = newPrefs.project_logo;
            if (newPrefs.theme) this.user.preferences.theme = newPrefs.theme;
            if (newPrefs.grid_columns) this.user.preferences.grid_columns = newPrefs.grid_columns;
            if (newPrefs.unit_system) this.user.preferences.unit_system = newPrefs.unit_system;
            await demoService.updatePreferences(newPrefs);
            this.applyAesthetics();
            this.notify();
            return;
        }

        // 1. Optimistic Update (Immediate UI response)
        // The flat copies of some preferences live on the user itself and the next
        // save is built from them, so a rollback has to put those back too.
        const previous = {
            preferences: { ...this.user.preferences },
            accent_color: this.user.accent_color,
            language: this.user.language,
            project_name: this.user.project_name,
            project_logo: this.user.project_logo,
        };
        this.user.preferences = { ...this.user.preferences, ...newPrefs };

        // Sync flat fields back to main user object if they changed
        if (newPrefs.accent_color) this.user.accent_color = newPrefs.accent_color;
        if (newPrefs.language) this.user.language = newPrefs.language;
        if (newPrefs.project_name) this.user.project_name = newPrefs.project_name;
        if (newPrefs.project_logo !== undefined) {
            this.user.project_logo = newPrefs.project_logo;
            this.user.preferences.project_logo = newPrefs.project_logo;
        }
        if (newPrefs.theme) this.user.preferences.theme = newPrefs.theme; // Ensure nested pref is updated for immediate effect
        if (newPrefs.grid_columns) this.user.preferences.grid_columns = newPrefs.grid_columns;
        if (newPrefs.beta_updates !== undefined) this.user.preferences.beta_updates = newPrefs.beta_updates;
        if (newPrefs.unit_system) this.user.preferences.unit_system = newPrefs.unit_system;
        if (newPrefs.dashboard_background !== undefined) {
            this.user.preferences.dashboard_background = newPrefs.dashboard_background;
        }

        this.applyAesthetics();
        this.notify();

        try {
            // 2. Sync with Backend
            // Explicitly construct payload to avoid sending legacy keys (grid_columns_*)
            const payload = {
                accent_color: this.user.accent_color,
                language: this.user.language,
                theme: this.user.preferences.theme,
                grid_columns: this.user.preferences.grid_columns,
                project_name: this.user.project_name,
                project_logo: this.user.project_logo,
                beta_updates: this.user.preferences.beta_updates,
                unit_system: this.user.preferences.unit_system,
                dashboard_background: this.user.preferences.dashboard_background
            };

            await userService.updatePreferences(payload);
        } catch (e) {
            console.error('[UserStore] Failed to sync preferences, rolling back', e);
            // 3. Rollback on failure
            Object.assign(this.user, previous);
            this.applyAesthetics();
            this.notify();
            if (window.notifier) window.notifier.show(i18n.t('notifier.save_error'), 'error');
            throw e;
        }
    }

    async updateProfile(data: Partial<User>) {
        if (!this.user) return;
        try {
            const response = await userService.updateProfile(data);

            // Check if session was invalidated (username changed)
            if (response && response.session_invalidated) {
                // Clear local storage
                localStorage.removeItem('lastboard_user_cache');

                // Show notification and redirect to login
                if (window.notifier) window.notifier.show(i18n.t('notifier.username_changed_relogin'));

                setTimeout(() => {
                    document.body.style.opacity = '0';
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            this.user = { ...this.user, ...data };
            this.notify();
            if (window.notifier) window.notifier.show(i18n.t('notifier.profile_updated'));
        } catch (e) {
            console.error('[UserStore] Update profile failed', e);
            if (window.notifier) window.notifier.show(i18n.t('notifier.profile_error'), 'error');
        }
    }

    async changePassword(data: unknown) {
        try {
            const response = await userService.changePassword(data);
            return response;
        } catch (e) {
            console.error('[UserStore] Change password failed', e);
            throw e;
        }
    }

    /** Whether the account was read from the server in this page. */
    isFromServer(): boolean {
        return this.fromServer;
    }

    getUser() {
        return this.user;
    }

    async fetchUser() {
        // --- DEMO MODE: use demoService (localStorage) ---
        if (this.isDemo()) {
            const demoUser = await demoService.fetchUser();
            this.setUser(demoUser);
            return;
        }

        try {
            const user = await userService.getCurrentUser();
            this.setUser(user);
        } catch (error) {
            console.error('[UserStore] Error fetching user', error);
            // Don't show error immediately on fetch fail if we have cached data
            if (!this.user) {
                if (window.notifier) window.notifier.show(i18n.t('auth.session_expired'), 'error');
            }
        }
    }
}

export const userStore = new UserStore();
