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
        const cached = localStorage.getItem('kashboard_user_cache');
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
            localStorage.setItem('kashboard_user_cache', JSON.stringify(this.user));
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
        const defaultGridPrefs = {
            grid_columns_pc: 9,
            grid_columns_tablet: 4,
            grid_columns_mobile: 2
        };

        // Map server response to store structure
        // The server sends flattened fields (accent_color, grid_columns_pc, etc.)
        this.user = {
            ...userData,
            preferences: {
                accent_color: userData.accent_color || 'blue',
                language: userData.language || 'en',
                theme: userData.theme, // Map theme from backend!
                grid_columns_pc: userData.grid_columns_pc || defaultGridPrefs.grid_columns_pc,
                grid_columns_tablet: userData.grid_columns_tablet || defaultGridPrefs.grid_columns_tablet,
                grid_columns_mobile: userData.grid_columns_mobile || defaultGridPrefs.grid_columns_mobile,
                project_name: userData.project_name || 'Kashboard'
            },
            project_name: userData.project_name || 'Kashboard'
        };

        this.applyAesthetics();
        this.notify();
    }

    applyAesthetics() {
        if (!this.user || !this.user.preferences) return;
        const prefs = this.user.preferences;
        const root = document.documentElement;

        // Apply grid columns
        if (prefs.grid_columns_pc) root.style.setProperty('--grid-columns-pc', String(prefs.grid_columns_pc));
        if (prefs.grid_columns_tablet) root.style.setProperty('--grid-columns-tablet', String(prefs.grid_columns_tablet));
        if (prefs.grid_columns_mobile) root.style.setProperty('--grid-columns-mobile', String(prefs.grid_columns_mobile));

        // Apply accent color
        if (prefs.accent_color) {
            const hex = this.getAccentHex(prefs.accent_color);
            root.style.setProperty('--accent', hex);
            // Persist for Login Page
            localStorage.setItem('kashboard_accent', hex);
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

        this.applyAesthetics();
        this.notify();

        try {
            // 2. Sync with Backend
            await userService.updatePreferences({
                accent_color: this.user.accent_color,
                language: this.user.language,
                theme: this.user.preferences.theme,
                grid_columns_pc: this.user.preferences.grid_columns_pc,
                grid_columns_tablet: this.user.preferences.grid_columns_tablet,
                grid_columns_mobile: this.user.preferences.grid_columns_mobile,
                project_name: this.user.project_name
            });

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
            await userService.updateProfile(data);
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
            await userService.changePassword(data);
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
