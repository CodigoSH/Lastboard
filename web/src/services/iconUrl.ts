/**
 * Turns whatever the icon picker returns into a URL an <img> can load.
 *
 * The picker hands back one of two things: a provider icon name, or something
 * that is already a URL (a pasted link, an uploaded `data:` URI, a path on this
 * server). Only the first needs a prefix. This lived copy-pasted in the bookmark
 * modal, its template and the Docker widget, which is how they could drift.
 *
 * Kept dependency-free so pure templates can import it without dragging a
 * service — and its singleton — into their tests.
 */

/** Where a bare provider icon name resolves to. */
const HOMARR_WEBP = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/';

/** True when the value is already loadable as-is. */
export function isDirectIconUrl(value: string): boolean {
    return value.startsWith('http') || value.startsWith('/') || value.startsWith('data:');
}

/** Empty in, empty out — callers use that to mean "no icon". */
export function resolveIconUrl(value: string | null | undefined): string {
    if (!value) return '';
    return isDirectIconUrl(value) ? value : `${HOMARR_WEBP}${value}.webp`;
}
