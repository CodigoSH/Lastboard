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
 * Which widgets take the pill: every one. A widget used to draw its own name as
 * a heading inside, and four of them still did (Docker, Monitoring, Proxmox and
 * the API widget) — a row of the tile spent on a word. The pill is the one place
 * a name goes now, on the border, the way a section wears it; the tile's whole
 * body is the widget's own.
 *
 * Written out rather than read from the registry, which this file must not
 * import; widgetTitle.test.ts holds the two lists equal.
 */
const WIDGETS_WITH_A_PILL = new Set(['telemetry', 'clock', 'weather', 'notepad', 'markdown', 'docker', 'monitor', 'proxmox', 'api']);

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
