/**
 * Where a full-screen page opens when something on the board points at it: a tab,
 * and an item open in its side panel. `sel` is written the way the page's history
 * writes it, so a tile and the browser's Back speak of an item in one language.
 */
export interface PageTarget {
    tab?: string;
    sel?: string;
    /** Open only the side panel of `sel`, over the board, and not the page behind it. */
    panel?: boolean;
}

/** The tab a target names, if the page has such a tab; otherwise nothing, and the page opens where it always does. */
export function targetTab<T extends string>(target: PageTarget | undefined, tabs: readonly T[]): T | undefined {
    return tabs.find(t => t === target?.tab);
}
