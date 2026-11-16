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
 *
 * Every entry carries the address of the step (`/?view=docker&tab=logs&sel=…`, see
 * startupView.ts), and what the browser's Back and Forward mean is read from the
 * ADDRESS it landed on, not from anything stored in the entry: an entry whose page
 * is not the one the address names does nothing, so an entry left behind by a
 * reload can never open a page by itself. The state of an entry only says which
 * step of the page it is.
 */
import { navFromSearch, viewAddress } from './startupView';

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
    pushState(state: unknown, title: string, url?: string): void;
    replaceState(state: unknown, title: string, url?: string): void;
    go(delta: number): void;
    back(): void;
}

/** Where the address is now, which is where a page reads what it was asked for. */
export interface AddressLike { pathname: string; search: string; hash: string }

const same = (a: NavState | null, b: NavState): boolean => !!a && a.tab === b.tab && a.sel === b.sel;

export class PageNav {
    /** How many entries of this page are in the browser's history. */
    private depth = 0;
    private current: NavState | null = null;
    /** A page over the board for one panel: it takes steps of the history but leaves the address alone. */
    private quiet = false;

    /**
     * `tabs` is the page's own list: an address that names another one is read as the first.
     * The history and the address are the browser's unless a test hands in its own.
     */
    constructor(
        private readonly key: string,
        private readonly h: HistoryLike = history,
        private readonly tabs?: readonly string[],
        private readonly where: () => AddressLike = () => window.location,
    ) { }

    /** The address of a step, or none when the page leaves the address as it is. */
    private urlFor(s: NavState): string | undefined {
        return this.quiet ? undefined : viewAddress(this.where(), this.key, s.tab, s.sel);
    }

    private clean(tab: string | null, sel: string | null): NavState {
        const first = this.tabs?.[0] ?? '';
        const t = tab ?? first;
        return { tab: this.tabs && !this.tabs.includes(t) ? first : t, sel };
    }

    private entry(i: number, s: NavState): Entry {
        return { lbPage: this.key, i, tab: s.tab, sel: s.sel };
    }

    /** The page opens: its first entry. Opening it again while it is open adds nothing. */
    open(s: NavState, quiet = false): void {
        if (this.depth > 0) return;
        this.quiet = quiet;
        this.h.pushState(this.entry(1, s), '', this.urlFor(s));
        this.depth = 1;
        this.current = s;
    }

    /** A step the person took. Landing where they already are is not a step. */
    push(s: NavState): void {
        if (this.depth === 0 || same(this.current, s)) return;
        this.depth++;
        this.h.pushState(this.entry(this.depth, s), '', this.urlFor(s));
        this.current = s;
    }

    /** What is shown changes without a step: another item chosen while one is open. */
    replace(s: NavState): void {
        if (this.depth === 0 || same(this.current, s)) return;
        this.h.replaceState(this.entry(this.depth, s), '', this.urlFor(s));
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

    /**
     * The page closes, by its own button: every entry it made goes, and the popstate that causes is not a Back.
     * Returns how many entries that took off, so whoever opens the next thing can wait for the browser to get there.
     */
    close(): number {
        const steps = this.depth;
        this.depth = 0;
        this.current = null;
        this.quiet = false;
        if (steps > 0) this.h.go(-steps);
        return steps;
    }

    /** The page stays shut although the browser landed on one of its entries: it keeps no steps, and does not touch the history. */
    forget(): void {
        this.depth = 0;
        this.current = null;
        this.quiet = false;
    }

    /**
     * The browser moved through the history. What it landed on is read from the address: if that names
     * this page, the page shows what the address says (at the step the entry's state numbers, when it
     * does), and if it names nothing of this page's, a page that was open is left.
     */
    pop(state: unknown): NavEffect {
        const asked = navFromSearch(this.where().search);
        if (asked.view === this.key) {
            const e = state as Partial<Entry> | null;
            // Also when the page is closed: Forward onto an entry it left behind brings it back at that step, instead
            // of leaving a Forward button that is lit and does nothing.
            this.depth = e && e.lbPage === this.key && typeof e.i === 'number' ? e.i : Math.max(this.depth, 1);
            this.quiet = false;
            this.current = this.clean(asked.tab, asked.sel);
            return { kind: 'show', state: this.current };
        }
        if (this.depth === 0) return { kind: 'ignore' };
        // Landed on something that is not ours: the person went back out of the page.
        this.depth = 0;
        this.current = null;
        this.quiet = false;
        return { kind: 'leave' };
    }
}
