/**
 * Which bookmark a container serves, as a bookmark declares it
 * (`content.docker = { host, name }`). A container is addressed by host and
 * NAME, never its id, which changes whenever it is recreated.
 *
 * Pure on purpose: no stores, no network.
 */

export interface DockerLink {
    label: string;
    url: string;
    /** Icon URL or icon name, exactly as the bookmark stores it. */
    icon: string;
}

/** The key a link is filed under. */
export function dockerLinkKey(hostId: string, name: string): string {
    return `${hostId}/${name}`;
}

/** Reads one board's bookmarks into the index. The first board that names a container wins. */
export function collectDockerLinks(items: any[], into: Map<string, DockerLink>): void {
    for (const item of items || []) {
        if (!item || item.type !== 'bookmark' || !item.content) continue;
        try {
            const c = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            const d = c?.docker;
            if (!d || typeof d.name !== 'string' || !d.name || typeof d.host !== 'string' || !d.host) continue;
            const key = dockerLinkKey(d.host, d.name);
            if (!into.has(key)) {
                into.set(key, { label: c.label || '', url: c.url || '', icon: c.icon || c.iconName || '' });
            }
        } catch { /* a bookmark with unreadable content links nothing */ }
    }
}
