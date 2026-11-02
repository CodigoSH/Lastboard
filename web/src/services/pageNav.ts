/**
 * The browser's history for a full-screen page — Docker, Proxmox, the status
 * page — so that Back goes where the person was, not out of the page.
 *
 * A page is a place with parts: a tab, and sometimes an item opened in its side
 * panel. Each step the person takes — opening the page, going to another tab,
 * opening an item — is an entry in the browser's history, and each entry says
 * what was on screen. Back then lands on the entry before it and the page
 * shows what that entry says; Forward does the same the other way. One more
 * Back from the first entry leaves the page.
 *
 * Nothing here knows what a tab or an item is: the page hands in a small state
 * (`tab`, and `sel` for the item, or null) and is handed one back to show.
 */

export interface NavState {
    tab: string;
    /** The item open in the side panel, as the page names it, or null. */
    sel: string | null;
}

/** What the page has to do after the browser moved through the history. */
export type NavEffect = { kind: 'ignore' } | { kind: 'leave' } | { kind: 'show'; state: NavState };

type Entry = { lbPage: string; i: number } & NavState;

/** The calls of `window.history` this uses, so a test can stand its own in their place. */
export interface HistoryLike {
    pushState(state: unknown, title: string): void;
    replaceState(state: unknown, title: string): void;
    go(delta: number): void;
    back(): void;
}

const same = (a: NavState | null, b: NavState): boolean => !!a && a.tab === b.tab && a.sel === b.sel;

export class PageNav {
    /** How many entries of this page are in the browser's history. */
    private depth = 0;
    private current: NavState | null = null;

    constructor(private readonly key: string, private readonly h: HistoryLike = history) { }

    private entry(i: number, s: NavState): Entry {
        return { lbPage: this.key, i, tab: s.tab, sel: s.sel };
    }

    /** The page opens: its first entry. Opening it again while it is open adds nothing. */
    open(s: NavState): void {
        if (this.depth > 0) return;
        this.h.pushState(this.entry(1, s), '');
        this.depth = 1;
        this.current = s;
    }

    /** A step the person took. Landing where they already are is not a step. */
    push(s: NavState): void {
        if (this.depth === 0 || same(this.current, s)) return;
        this.depth++;
        this.h.pushState(this.entry(this.depth, s), '');
        this.current = s;
    }

    /** What is shown changes without a step: another item chosen while one is open. */
    replace(s: NavState): void {
        if (this.depth === 0 || same(this.current, s)) return;
        this.h.replaceState(this.entry(this.depth, s), '');
        this.current = s;
    }

    /** Whether the item in the side panel was reached by a step of its own, which closing it takes back. */
    get panelIsAStep(): boolean {
        return this.depth > 1 && !!this.current?.sel;
    }

    /** Closes the panel by taking its step back. False when there is no such step: the page hides it itself. */
    closePanel(): boolean {
        if (!this.panelIsAStep) return false;
        this.h.back();
        return true;
    }

    /** The page closes, by its own button: every entry it made goes, and the popstate that causes is not a Back. */
    close(): void {
        const steps = this.depth;
        this.depth = 0;
        this.current = null;
        if (steps > 0) this.h.go(-steps);
    }

    /** The browser moved through the history. `state` is the entry it landed on. */
    pop(state: unknown): NavEffect {
        if (this.depth === 0) return { kind: 'ignore' };
        const e = state as Partial<Entry> | null;
        if (e && e.lbPage === this.key && typeof e.i === 'number' && typeof e.tab === 'string') {
            this.depth = e.i;
            this.current = { tab: e.tab, sel: typeof e.sel === 'string' ? e.sel : null };
            return { kind: 'show', state: this.current };
        }
        // Landed on something that is not ours: the person went back out of the page.
        this.depth = 0;
        this.current = null;
        return { kind: 'leave' };
    }
}
