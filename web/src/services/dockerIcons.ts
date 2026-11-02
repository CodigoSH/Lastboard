/**
 * Which icon the operator chose for a container, and how a choice is filed.
 *
 * Free of imports so the page and its tests can use it without a network client.
 *
 * A container is keyed by its host and its NAME, never its id: updating a
 * container recreates it under a new id, and a choice filed by id was lost
 * with every update. The server writes the same key.
 */
export function dockerIconKey(hostId: string, name: string): string {
    return `${hostId}/${name}`;
}

/** The icon the operator chose for a container, if any. */
export function chosenDockerIcon(icons: Record<string, string> | undefined, hostId: string, name: string): string {
    return icons?.[dockerIconKey(hostId, name)] || '';
}

/** The chosen icons after one container's change: set, or removed when empty. A new map. */
export function withDockerIcon(
    icons: Record<string, string> | undefined,
    hostId: string,
    name: string,
    icon: string,
): Record<string, string> {
    const next = { ...(icons || {}) };
    const key = dockerIconKey(hostId, name);
    if (icon) next[key] = icon; else delete next[key];
    return next;
}
