import { userService } from '../services/userService';
import { i18n } from '../services/i18n';
import { User, UserPreferences } from '../types';

type Listener = (user: User | null) => void;

class UserStore {
    private user: User | null = null;
    private listeners: Listener[] = [];

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

        // Default constraints
        // fluid grid defaults to 140px if not set


        // Map server response to store structure
        this.user = {
            ...userData,
            preferences: {
                accent_color: userData.accent_color || 'blue',
                language: userData.language || 'en',
                theme: userData.theme, // Map theme from backend!
                grid_columns: userData.grid_columns || 12, // Default 12
                project_name: userData.project_name || 'Lastboard',
                beta_updates: userData.beta_updates
            },
            project_name: userData.project_name || 'Lastboard'
        };

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
            // Persist for Login Page
            localStorage.setItem('lastboard_accent', hex);
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
            'teal': '#12b886', 'orange': '#fd7e14', 'red': '#fa5252', 'grape': '#be4bdb'
        };
        return map[color] || '#0078D4';
    }

    async updatePreferences(newPrefs: Partial<UserPreferences>) {
        if (!this.user || !this.user.preferences) return;

        // 1. Optimistic Update (Immediate UI response)
        const previousPrefs = { ...this.user.preferences };
        this.user.preferences = { ...this.user.preferences, ...newPrefs };

        // Sync flat fields back to main user object if they changed
        if (newPrefs.accent_color) this.user.accent_color = newPrefs.accent_color;
        if (newPrefs.language) this.user.language = newPrefs.language;
        if (newPrefs.project_name) this.user.project_name = newPrefs.project_name;
        if (newPrefs.theme) this.user.preferences.theme = newPrefs.theme; // Ensure nested pref is updated for immediate effect
        if (newPrefs.grid_columns) this.user.preferences.grid_columns = newPrefs.grid_columns;
        if (newPrefs.beta_updates !== undefined) this.user.preferences.beta_updates = newPrefs.beta_updates;

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
                beta_updates: this.user.preferences.beta_updates
            };

            await userService.updatePreferences(payload);

            // @ts-ignore
            if (window.notifier) window.notifier.show(i18n.t('general.success') || 'Preferences saved');
        } catch (e) {
            console.error('[UserStore] Failed to sync preferences, rolling back', e);
            // 3. Rollback on failure
            this.user.preferences = previousPrefs;
            this.applyAesthetics();
            this.notify();
            // @ts-ignore
            if (window.notifier) window.notifier.show(i18n.t('notifier.save_error'), 'error');
            throw e;
        }
    }

    async updateProfile(data: Partial<User>) {
        if (!this.user) return;
        try {
            const response = await userService.updateProfile(data);

            // Check if session was invalidated (username changed)
            // @ts-ignore
            if (response && response.session_invalidated) {
                // Clear local storage
                localStorage.removeItem('lastboard_user_cache');

                // Show notification and redirect to login
                // @ts-ignore
                if (window.notifier) window.notifier.show(i18n.t('notifier.username_changed_relogin'));

                setTimeout(() => {
                    document.body.style.opacity = '0';
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            this.user = { ...this.user, ...data };
            this.notify();
            // @ts-ignore
            if (window.notifier) window.notifier.show(i18n.t('notifier.profile_updated'));
        } catch (e) {
            console.error('[UserStore] Update profile failed', e);
            // @ts-ignore
            if (window.notifier) window.notifier.show(i18n.t('notifier.profile_error'), 'error');
        }
    }

    async changePassword(data: any) {
        try {
            const response = await userService.changePassword(data);
            return response;
        } catch (e) {
            console.error('[UserStore] Change password failed', e);
            throw e;
        }
    }

    getUser() {
        return this.user;
    }

    async fetchUser() {
        try {
            const user = await userService.getCurrentUser();
            this.setUser(user);
        } catch (error) {
            console.error('[UserStore] Error fetching user', error);
            // Don't show error immediately on fetch fail if we have cached data
            if (!this.user) {
                // @ts-ignore
                if (window.notifier) window.notifier.show(i18n.t('auth.session_expired'), 'error');
            }
        }
    }
}

export const userStore = new UserStore();
