/**
 * The name a widget can wear on its border.
 *
 * A container with a name shows it as a pill on its edge and one without shows
 * nothing — the same rule sections follow — so an empty title is not "a blank
 * pill" but no pill. Kept free of imports so the pure card template and its
 * tests can use it.
 */

/** Characters, not bytes: what has to fit on the border is what is read. */
export const WIDGET_TITLE_MAX = 40;

/**
 * Which widgets take the pill. The API, Docker, Monitor and Proxmox widgets
 * already have a title of their own, drawn inside as their heading, and keep
 * it: giving them a pill as well would print the same name twice. The rest have
 * no name to show and are the ones that gain one.
 */
const WIDGETS_WITH_A_PILL = new Set(['telemetry', 'clock', 'weather', 'notepad', 'markdown']);

export function widgetTakesPill(widgetId: unknown): boolean {
    return typeof widgetId === 'string' && WIDGETS_WITH_A_PILL.has(widgetId.toLowerCase());
}

export function cleanWidgetTitle(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    // Control characters (a pasted newline, a tab) have no place on a border,
    // and a run of spaces is one space.
    const flat = raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
    // Spread, not slice: a title cut through an emoji or a surrogate pair prints a broken glyph.
    return [...flat].slice(0, WIDGET_TITLE_MAX).join('').trim();
}
