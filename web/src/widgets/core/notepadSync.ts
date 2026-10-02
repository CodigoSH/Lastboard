/**
 * What the notepad does when the stored note is not the one it is showing.
 *
 * Kept apart from the widget so the decision can be tested without a browser.
 * The decision is the whole of the bug it replaces: the widget read the note
 * once, when it was drawn, from whatever copy this browser held, and never
 * looked again — so a note saved on another device showed up one reload late,
 * and a save made from the old copy replaced the new one without a word.
 *
 * `base` is the text as it was when this widget last agreed with the server, and
 * `incoming` is what the store holds now. Both are the raw stored text, not
 * what the editor shows: the server compares the raw string.
 */
export type NoteSync =
    /** Nothing to do: the store holds what is already here. */
    | 'same'
    /** Another device saved a newer note and nothing is being edited here: show it. */
    | 'show'
    /** A newer note exists but there are unsaved edits here: leave the editor alone. */
    | 'hold';

export function decideNoteSync(base: string | null, incoming: string | null, dirty: boolean): NoteSync {
    if (incoming === base) return 'same';
    return dirty ? 'hold' : 'show';
}

/** The text a stored item holds, as stored; null when it has none. */
export function storedNoteText(content: unknown): string | null {
    let obj: unknown = content;
    if (typeof content === 'string') {
        try { obj = JSON.parse(content); } catch { return null; }
    }
    const text = (obj as { text?: unknown } | null)?.text;
    return typeof text === 'string' ? text : null;
}
