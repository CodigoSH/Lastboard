/**
 * Which icon the operator chose for a Proxmox machine, and how a choice is filed.
 *
 * Free of imports so the page, the widget and their tests can all use it without
 * dragging a service and its network client in.
 */

/**
 * The key a chosen icon is stored under: the host, the node and the machine.
 *
 * The server writes and returns it this way since a Proxmox became a list of
 * hypervisors. The page kept writing the older `node|vmid` after that, so a
 * freshly chosen icon was filed under a key nothing reads and did not show until
 * the page was reloaded. Every reader and writer goes through this one function.
 */
export function iconKey(hostId: string, node: string, vmid: number): string {
    return `${hostId}|${node}|${vmid}`;
}

/** The icon the operator chose for a machine, if any. */
export function chosenIcon(host: { id: string; icons?: Record<string, string> }, node: string, vmid: number): string {
    return host.icons?.[iconKey(host.id, node, vmid)] || '';
}

/**
 * The chosen icons after one machine's changes: set when there is an icon,
 * removed when it is empty. A new map, so what the page holds is replaced and
 * not edited behind its back.
 */
export function withIcon(
    icons: Record<string, string> | undefined,
    hostId: string,
    node: string,
    vmid: number,
    icon: string,
): Record<string, string> {
    const next = { ...(icons || {}) };
    const key = iconKey(hostId, node, vmid);
    if (icon) next[key] = icon; else delete next[key];
    return next;
}
