/**
 * Which bookmark a machine is, when nobody has said so.
 *
 * The integration was built asking the owner to tie each bookmark to its
 * machine by hand. Measured against a real host — twenty-nine containers, a
 * board of fifty-five bookmarks, not one of them tied — that is not a step
 * people skip, it is a step nobody takes, and without it the page cannot do the
 * one thing it exists for: say which service went down with its container.
 *
 * So the names are matched instead, and the hand-made link stays for the cases
 * a name cannot settle.
 *
 * Pure module on purpose: no DOM, no fetch, no stores. It is the part worth
 * testing, and the part worth being strict about.
 */

/**
 * Machines get numbered. On the host this was measured against, every container
 * is `15-myspeed`, `20-nextcloud`, `90--haos` — the ordinal is filing, not
 * identity, and matching without dropping it found two machines out of
 * twenty-nine instead of sixteen.
 */
const ORDINAL = /^\d+[\s._-]+/;

/** Everything that is decoration rather than name: case, spaces, punctuation. */
function squash(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The key a machine is looked up by. */
export function machineKey(name: string): string {
    return squash((name || '').replace(ORDINAL, ''));
}

/**
 * The last part of an icon reference, without its extension.
 *
 * A bookmark's icon is stored as a name (`plex`) on a fresh board and as a full
 * CDN URL (`…/dashboard-icons/webp/myspeed.webp`) on one built before icons
 * were kept locally. Both say the same word, and that word is often a better
 * name than the label: the bookmark reads "Donetic" while the icon says
 * `donetick`, which is what the container is called.
 */
export function iconSlug(icon: string): string {
    if (!icon) return '';
    const last = icon.split('?')[0].split('#')[0].split('/').pop() || '';
    return last.replace(/\.[a-z0-9]+$/i, '');
}

/** Every key a bookmark can be found by: what it is called, and what it wears. */
export function bookmarkKeys(label: string, iconName: string, icon: string): string[] {
    const keys = new Set<string>();
    for (const candidate of [label, iconSlug(iconName), iconSlug(icon)]) {
        const k = squash(candidate);
        if (k) keys.add(k);
    }
    return [...keys];
}

/**
 * Builds the lookup, refusing to answer where two bookmarks would fit.
 *
 * Ambiguity is stored rather than dropped: a key that two bookmarks answer to
 * must not quietly resolve to whichever was read first. On the same measured
 * board that rule is what keeps `23-jellyfin-musica` unmatched instead of
 * pointing at the wrong Jellyfin — and naming the wrong service as the one that
 * went down is worse than naming none.
 */
export function buildNameIndex<T>(entries: { keys: string[]; value: T }[]): Map<string, T | null> {
    const index = new Map<string, T | null>();
    for (const entry of entries) {
        for (const key of entry.keys) {
            if (!key) continue;
            if (index.has(key)) {
                const held = index.get(key);
                // The same bookmark under two of its own keys is not a clash.
                if (held !== entry.value) index.set(key, null);
                continue;
            }
            index.set(key, entry.value);
        }
    }
    return index;
}

/** What the index says about one machine, or nothing when it cannot be sure. */
export function guessByName<T>(index: Map<string, T | null>, machineName: string): T | null {
    return index.get(machineKey(machineName)) ?? null;
}
