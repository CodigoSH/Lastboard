import { userService } from '../services/userService';
import { User, UserPreferences } from '../types';

type Listener = (user: User | null) => void;

class UserStore {
    private user: User | null = null;
    private listeners: Listener[] = [];

    constructor() { }

    subscribe(listener: Listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.user));
    }

    setUser(userData: User) {
        if (!userData) return;

        // Ensure default grid prefs are layered on
        const defaultGridPrefs = {
            grid_columns_pc: 9,
            grid_columns_tablet: 4,
            grid_columns_mobile: 2
        };

        this.user = {
            ...userData,
            preferences: {
                ...defaultGridPrefs,
                accent_color: userData.accent_color,
                language: userData.language,
                // In a production app, we would also load saved grid columns from API
            }
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

        this.applyAesthetics();
        this.notify();

        try {
            // 2. Sync with Backend
            await userService.updatePreferences({
                accent_color: this.user.accent_color,
                language: this.user.language,
                grid_columns_pc: this.user.preferences.grid_columns_pc,
                grid_columns_tablet: this.user.preferences.grid_columns_tablet,
                grid_columns_mobile: this.user.preferences.grid_columns_mobile
            });

            // @ts-ignore
            if (window.notifier) window.notifier.show('Preferences saved');
        } catch (e) {
            console.error('[UserStore] Failed to sync preferences, rolling back', e);
            // 3. Rollback on failure
            this.user.preferences = previousPrefs;
            this.applyAesthetics();
            this.notify();
            // @ts-ignore
            if (window.notifier) window.notifier.show('Failed to save settings', 'error');
        }
    }

    async updateProfile(data: Partial<User>) {
        if (!this.user) return;
        try {
            await userService.updateProfile(data);
            this.user = { ...this.user, ...data };
            this.notify();
            // @ts-ignore
            if (window.notifier) window.notifier.show('Profile updated');
        } catch (e) {
            console.error('[UserStore] Update profile failed', e);
            // @ts-ignore
            if (window.notifier) window.notifier.show('Failed to update profile', 'error');
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
            // @ts-ignore
            if (window.notifier) window.notifier.show('Session expired or server unreachable', 'error');
        }
    }
}

export const userStore = new UserStore();
