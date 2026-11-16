/**
 * Which full-screen page an address asks for, as in `/?view=proxmox&tab=machines&sel=pve%7C106`.
 *
 * The address is where the app says what is on screen: a page that is open is in it, and what the
 * page shows (its tab, the item open in its panel) is in it too. Reloading, opening the address in
 * another tab and the browser's Back and Forward all start from there, so there is one place to look
 * and nothing hidden in a history entry that can outlive what it described.
 *
 * Pure, so the rule for what counts as a request is one place and has a test. Every answer comes from
 * a closed list or is cut to a length: an address is typed by anybody and must not choose what the app
 * opens beyond what it knows how to.
 */
const VIEWS = ['proxmox', 'monitor', 'docker', 'settings'] as const;
export type StartupView = typeof VIEWS[number];

const TAB = /^[a-z][a-z0-9_-]{0,39}$/;
const MAX_SEL = 200;

export function viewFromSearch(search: string): StartupView | null {
    const asked = new URLSearchParams(search).get('view');
    return (VIEWS as readonly string[]).includes(asked ?? '') ? (asked as StartupView) : null;
}

export interface AskedView {
    view: StartupView | null;
    /** The tab it names, when it names one that could be a tab at all. The page checks it against its own. */
    tab: string | null;
    sel: string | null;
}

/** What an address asks for: the page, and where in it. */
export function navFromSearch(search: string): AskedView {
    const view = viewFromSearch(search);
    if (!view) return { view: null, tab: null, sel: null };
    const params = new URLSearchParams(search);
    const tab = params.get('tab') ?? '';
    const sel = params.get('sel') ?? '';
    return {
        view,
        tab: TAB.test(tab) ? tab : null,
        // eslint-disable-next-line no-control-regex
        sel: sel && sel.length <= MAX_SEL && !/[\u0000-\u001f]/.test(sel) ? sel : null,
    };
}

/** The address with what is on screen taken out: the board, as it was before a page opened over it. */
export function boardAddress(pathname: string, search: string, hash: string): string {
    const params = new URLSearchParams(search);
    for (const k of ['view', 'tab', 'sel']) params.delete(k);
    const rest = params.toString();
    return pathname + (rest ? `?${rest}` : '') + hash;
}

/** The address for a page at a step of its own: whatever else the address carried stays. */
export function viewAddress(at: { pathname: string; search: string; hash: string }, view: string, tab: string, sel: string | null): string {
    const params = new URLSearchParams(at.search);
    for (const k of ['view', 'tab', 'sel']) params.delete(k);
    params.set('view', view);
    if (tab) params.set('tab', tab);
    if (sel) params.set('sel', sel);
    return `${at.pathname}?${params.toString()}${at.hash}`;
}
