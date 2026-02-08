/**
 * ThemeService handles Light/Dark mode toggling.
 * Persists preference to localStorage and Cookies for backend SSR.
 */
export class ThemeService {
    private static readonly STORAGE_KEY = 'lastboard_theme';
    private static readonly CLASS_NAME = 'dark-mode';

    static init() {
        // 1. Check LocalStorage
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved === 'dark') {
            this.enableDark();
        } else if (saved === 'light') {
            this.enableLight();
        } else {
            // 2. Check System Preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.enableDark();
            } else {
                this.enableLight();
            }
        }
    }

    static enableDark() {
        document.documentElement.classList.add(this.CLASS_NAME);
        localStorage.setItem(this.STORAGE_KEY, 'dark');
        this.setCookie(this.STORAGE_KEY, 'dark', 365);
    }

    static enableLight() {
        document.documentElement.classList.remove(this.CLASS_NAME);
        localStorage.setItem(this.STORAGE_KEY, 'light');
        this.setCookie(this.STORAGE_KEY, 'light', 365);
    }

    static toggle() {
        if (document.documentElement.classList.contains(this.CLASS_NAME)) {
            this.enableLight();
        } else {
            this.enableDark();
        }
    }

    static isDark(): boolean {
        return document.documentElement.classList.contains(this.CLASS_NAME);
    }

    private static setCookie(name: string, value: string, days: number) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    static async sync() {
        try {
            const res = await fetch('/api/me');
            if (res.ok) {
                const user = await res.json();
                if (user.theme === 'dark') this.enableDark();
                else if (user.theme === 'light') this.enableLight();
                // If 'system', we leave it to init() logic or re-run init logic?
                // For now, explicit dark/light is what we care about preserving.
            }
        } catch (e) {
            // Not logged in or error
        }
    }
}
