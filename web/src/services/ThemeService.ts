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
export type ThemeChoice = 'light' | 'dark' | 'system';

/**
 * Reads a theme that came from the server or from storage.
 *
 * It exists because the callers used to write `theme === 'light' ? 'light' :
 * 'dark'`, which is correct for two options and silently swallows a third —
 * which is how the previous `system` ended up stored everywhere and honoured
 * nowhere.
 */
export function asThemeChoice(value: unknown): ThemeChoice {
    return value === 'light' || value === 'system' ? value : 'dark';
}

/** What a choice resolves to once the device has had its say. */
export type ResolvedTheme = 'light' | 'dark';

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
    private static readonly PANEL: Record<ResolvedTheme, string> = {
        dark: '#1a1a1a',
        light: '#ffffff',
    };

    /** Set while listening to the device, so the listener is attached once. */
    private static watching = false;

    static init() {
        this.apply(this.stored());
    }

    /** The stored choice, defaulting to dark as everything else in the app does. */
    static stored(): ThemeChoice {
        try {
            return asThemeChoice(localStorage.getItem(this.STORAGE_KEY));
        } catch {
            return 'dark';
        }
    }

    /**
     * What the device is asking for. Anything that cannot answer counts as
     * dark, which is the app's default everywhere else.
     */
    static systemPrefers(): ResolvedTheme {
        try {
            return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        } catch {
            return 'dark';
        }
    }

    /** The choice with the device's answer folded in. */
    static resolve(choice: ThemeChoice): ResolvedTheme {
        return choice === 'system' ? this.systemPrefers() : choice;
    }

    static apply(choice: ThemeChoice) {
        const resolved = this.resolve(choice);
        document.documentElement.classList.toggle(this.CLASS_NAME, resolved === 'dark');
        this.applyThemeColor(resolved);

        // The choice is stored, never the answer. Writing the resolved value is
        // what turned the old `system` option into a fixed one on the first
        // visit: it looked like it followed the device and never did again.
        try { localStorage.setItem(this.STORAGE_KEY, choice); } catch { /* private mode */ }
        this.setCookie(this.STORAGE_KEY, choice, 365);

        this.watchSystem();
    }

    /**
     * Follows the device while the app is open, so switching the phone to dark
     * at sunset changes the page under it instead of at the next reload.
     *
     * Attached once and left attached: it does nothing unless the stored choice
     * is `system`, and removing it would mean tracking which choice added it.
     */
    private static watchSystem() {
        if (this.watching) return;
        try {
            matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (this.stored() === 'system') this.apply('system');
            });
            this.watching = true;
        } catch {
            // Old engines expose no addEventListener here; the theme still
            // follows the device on every load, just not mid-session.
        }
    }

    /**
     * Points the browser's theme-color at the bar the user is looking at.
     * Chrome repaints the status bar of an installed app when this changes, so
     * toggling the theme no longer leaves the strip above it from the old one.
     */
    private static applyThemeColor(choice: ResolvedTheme) {
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

    static enableSystem() { this.apply('system'); }

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
            this.apply(asThemeChoice(user.theme));
        } catch {
            // Not signed in, or offline: whatever is on screen stands.
        }
    }
}
