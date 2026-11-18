import type { ServiceLink } from './discoverServices';

/**
 * Ties a bookmark that is already on the board to the container or machine it serves.
 *
 * Only the link is added; the label, the address, the icon and everything else the person set stay as they are.
 * The save is conditional (see `expected`): it is applied only if the bookmark still has the label and the address
 * this was worked out from and still has no link of that kind, so an edit made in another window in between is
 * never written over.
 */

export interface LinkedContent {
    /** The bookmark's content with the link added. */
    content: string;
    /** What the stored content must still hold for the save to apply; null means the field must be absent. */
    expected: Record<string, string | null>;
}

const kindOf = (link: ServiceLink): 'docker' | 'proxmox' => ('docker' in link ? 'docker' : 'proxmox');

/** Whether the content already says which container, or machine, it serves. */
export function isLinked(raw: string, link: ServiceLink): boolean {
    try {
        const c = JSON.parse(raw);
        return !!c && typeof c === 'object' && !!c[kindOf(link)];
    } catch { return true; }
}

/**
 * The content with the link added, or null when it cannot be done: the content is not readable, or the bookmark
 * already has a link of that kind (it serves something, and it is not ours to change).
 */
export function linkedContent(raw: string, link: ServiceLink): LinkedContent | null {
    let c: Record<string, unknown>;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        c = parsed;
    } catch { return null; }
    const kind = kindOf(link);
    if (c[kind]) return null;
    const text = (v: unknown): string | null => (typeof v === 'string' ? v : null);
    return {
        content: JSON.stringify({ ...c, [kind]: 'docker' in link ? link.docker : link.proxmox }),
        expected: { [kind]: null, label: text(c.label), url: text(c.url) },
    };
}
