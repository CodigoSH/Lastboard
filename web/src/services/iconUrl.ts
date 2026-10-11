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

/**
 * The icon a bookmark's edit form starts from.
 *
 * The picker writes both `iconName` (what was chosen) and `icon` (the address to
 * draw). A bookmark that came from an import has only `icon`: reading only
 * `iconName` opened the form with no icon, and saving wrote that emptiness back
 * over the logo. `icon` is already something the picker understands — an
 * address, or a path on this server — so it is what stands in when there is no
 * name.
 */
export function iconForEdit(content: { iconName?: unknown; icon?: unknown } | null | undefined): string {
    const name = typeof content?.iconName === 'string' ? content.iconName : '';
    if (name) return name;
    return typeof content?.icon === 'string' ? content.icon : '';
}

/** Empty in, empty out — callers use that to mean "no icon". */
export function resolveIconUrl(value: string | null | undefined): string {
    if (!value) return '';
    return isDirectIconUrl(value) ? value : `${HOMARR_WEBP}${value}.webp`;
}
