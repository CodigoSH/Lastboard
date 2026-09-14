/**
 * ThemeService decides which theme the page wears.
 *
 * Two states, light and dark, which is what the product has always offered: the
 * setup wizard asks for one of the two, and so does the settings panel.
 *
 * There used to be a third, `system`, that nothing ever chose. It arrived only
 * as the database column's default, so it landed on accounts an administrator
 * created — and it was resolved on load and then written to storage, which
 * turned "follow my device" into a fixed value on the first visit anyway. The
 * settings panel had meanwhile always drawn those accounts as dark. Three
 * different answers to the same question; there is one now.
 *
 * The first paint is not this file's job: the server stamps the class onto
 * <html> from the account's own row before the page is sent, so there is
 * nothing to correct afterwards and nothing to flash.
 */
export type ThemeChoice = 'light' | 'dark';

export class ThemeService {
    private static readonly STORAGE_KEY = 'lastboard_theme';
    private static readonly CLASS_NAME = 'dark-mode';

    /**
     * What the top bar paints under each theme — the --panel values of
     * theme.css. The status bar of an installed app sits directly above that
     * bar, so this is what theme-color has to say, and it followed the accent
     * until an Android home screen showed a slab of orange over a dark
     * interface. The server stamps the right one into the page so the first
     * paint needs no correcting; this keeps it true afterwards.
     */
    private static readonly PANEL: Record<ThemeChoice, string> = {
        dark: '#1a1a1a',
        light: '#ffffff',
    };

    static init() {
        this.apply(this.stored());
    }

    /** The stored choice, defaulting to dark as everything else in the app does. */
    static stored(): ThemeChoice {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'light' ? 'light' : 'dark';
        } catch {
            return 'dark';
        }
    }

    static apply(choice: ThemeChoice) {
        document.documentElement.classList.toggle(this.CLASS_NAME, choice === 'dark');
        this.applyThemeColor(choice);
        try { localStorage.setItem(this.STORAGE_KEY, choice); } catch { /* private mode */ }
        this.setCookie(this.STORAGE_KEY, choice, 365);
    }

    /**
     * Points the browser's theme-color at the bar the user is looking at.
     * Chrome repaints the status bar of an installed app when this changes, so
     * toggling the theme no longer leaves the strip above it from the old one.
     */
    private static applyThemeColor(choice: ThemeChoice) {
        const meta = document.querySelector('meta[name="theme-color"]');
        // Only the dashboard carries the tag; the login and setup pages do not,
        // and there is nothing to correct on a page that never had one.
        if (meta) meta.setAttribute('content', this.PANEL[choice]);
    }

    static enableDark() { this.apply('dark'); }
    static enableLight() { this.apply('light'); }

    static toggle() {
        this.apply(this.isDark() ? 'light' : 'dark');
    }

    static isDark(): boolean {
        return document.documentElement.classList.contains(this.CLASS_NAME);
    }

    private static setCookie(name: string, value: string, days: number) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
    }

    /** Brings the browser in line with the account. */
    static async sync() {
        try {
            const res = await fetch('/api/me');
            if (!res.ok) return;
            const user = await res.json();
            this.apply(user.theme === 'light' ? 'light' : 'dark');
        } catch {
            // Not signed in, or offline: whatever is on screen stands.
        }
    }
}
