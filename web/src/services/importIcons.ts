import type { IconInfo } from './iconService';
import { isDirectIconUrl } from './iconUrl';

/**
 * Turns the icon an imported file names into something the board can draw.
 *
 * The board draws a bookmark's icon as an image only when it is an address;
 * anything else it prints as text. A file from Homepage or Dashy names its
 * icons by library name — "plex", "sonarr" — so imported as they came, every
 * bookmark showed the word instead of the logo. Names are looked up here, in the
 * same indexes the icon picker searches, and replaced by the address of the
 * image. The server stores the images afterwards, as it does for any icon.
 */

/** What a library icon name looks like. The server only sends names that do. */
export const ICON_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Where Homepage's own icon library lives; the best guess when no index is at hand. */
const DASHBOARD_ICONS = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/';

export function isIconName(icon: string): boolean {
    return ICON_NAME.test(icon) && !isDirectIconUrl(icon);
}

/** name (lower case) -> address, first library wins: the picker's own order. */
export function buildIconIndex(icons: IconInfo[]): Map<string, string> {
    const index = new Map<string, string>();
    for (const i of icons) {
        const key = i.name.toLowerCase();
        if (!index.has(key)) index.set(key, i.url);
    }
    return index;
}

/**
 * The address for one icon as an imported file wrote it.
 *
 * - An address, an image already on this server and an emoji go through as they are.
 * - A library name becomes the address of that icon, or nothing when no library
 *   has it — an empty icon shows the default glyph, a broken image shows nothing
 *   readable.
 * - When the indexes could not be loaded (no connection from here), a name
 *   becomes the address it would have in the library Homepage uses. The server
 *   stores it if it can reach it, and the pending-icons counter says so if not.
 */
export function resolveImportedIcon(icon: string | undefined, index: Map<string, string>, indexComplete: boolean): string {
    const value = (icon ?? '').trim();
    if (!value) return '';
    if (!isIconName(value)) return value;

    const key = value.toLowerCase();
    const found = index.get(key) ?? index.get(key.replace(/_/g, '-'));
    if (found) return found;
    return indexComplete ? '' : `${DASHBOARD_ICONS}${key}.svg`;
}
