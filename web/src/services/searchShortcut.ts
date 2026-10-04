/**
 * Whether a key press is the "go to search" shortcut, and whether it should act.
 *
 * Ctrl+K on Windows and Linux, Cmd+K on macOS. Kept apart from the bar so it can be
 * tested without a browser.
 */

export interface ShortcutKey {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
}

export interface ShortcutContext {
    /** The bar is locked by edit mode, the settings drawer or a full-screen page. */
    locked: boolean;
    /** The key went to a text field or an editor, where Ctrl+K may mean something else (a link). */
    typing: boolean;
}

export function opensSearch(e: ShortcutKey, ctx: ShortcutContext): boolean {
    if (e.key.toLowerCase() !== 'k') return false;
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return false;
    return !ctx.locked && !ctx.typing;
}

/** A field where the user is writing, other than the search box itself. */
export function isTypingTarget(el: Element | null | undefined, searchInputId = 'search-input'): boolean {
    if (!el) return false;
    if ((el as HTMLElement).id === searchInputId) return false;
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') return true;
    return (el as HTMLElement).isContentEditable === true;
}
