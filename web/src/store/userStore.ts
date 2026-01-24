import { userService } from '../services/userService';

interface User {
    username?: string;
    initials?: string;
    role?: string;
    preferences?: any;
    avatar_url?: string;
}

type Listener = (user: User | null) => void;

class UserStore {
    user: User | null;
    listeners: Listener[];

    constructor() {
        this.user = null;
        this.listeners = [];
    }

    subscribe(listener: Listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.user));
    }

    setUser(user: User) {
        if (!user) return;

        // Ensure default grid prefs
        const defaultPrefs = {
            grid_columns_pc: 6,
            grid_columns_tablet: 4,
            grid_columns_mobile: 2
        };

        this.user = {
            ...user,
            preferences: { ...defaultPrefs, ...(user.preferences || {}) }
        };

        this.applyGridPrefs();
        this.notify();
    }

    applyGridPrefs() {
        if (!this.user || !this.user.preferences) return;
        const prefs = this.user.preferences;
        const root = document.documentElement;
        root.style.setProperty('--grid-columns-pc', prefs.grid_columns_pc);
        root.style.setProperty('--grid-columns-tablet', prefs.grid_columns_tablet);
        root.style.setProperty('--grid-columns-mobile', prefs.grid_columns_mobile);
    }

    async updatePreferences(newPrefs: any) {
        if (!this.user) return;

        // Optimistic update
        this.user.preferences = { ...this.user.preferences, ...newPrefs };
        this.applyGridPrefs();
        this.notify();

        try {
            await userService.syncPreferences(this.user.preferences);
        } catch (e) {
            console.error('Failed to sync preferences:', e);
            // Error handling (could rollback state here)
        }
    }

    async updateProfile(data: Partial<User>) {
        if (!this.user) return;
        try {
            const updatedUser = await userService.updateProfile(data);
            this.setUser(updatedUser);
        } catch (e) {
            console.error('Failed to update profile:', e);
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
            console.error('Error fetching user:', error);
        }
    }
}

export const userStore = new UserStore();
