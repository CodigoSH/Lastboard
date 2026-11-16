/**
 * The body the Proxmox settings are saved with.
 *
 * Kept apart so a test can look at it: the server has its own tests for what a
 * secret does when it arrives, and none of them could see that this mapping
 * left out the mark that says "the operator emptied the box" — the secret was
 * never removed, and the save still answered "Saved".
 */

export interface PayloadHost {
    id: string; name: string; url: string; token_id: string;
    insecure: boolean; enabled: boolean;
    /** Typed over the dots; empty when it was not touched. */
    secret?: string;
    /** The box that held the dots was emptied. */
    clear_secret?: boolean;
}

export function proxmoxPayload(hosts: PayloadHost[]) {
    return {
        hosts: hosts.map(h => ({
            id: h.id, name: h.name, url: h.url, token_id: h.token_id,
            secret: h.secret || '', clear_secret: !!h.clear_secret,
            insecure: h.insecure, enabled: h.enabled,
        })),
    };
}

/**
 * The hypervisors a save has just added that a window can look at: on, with a
 * secret stored, and not among the ones there were before. One that was only
 * edited is not new.
 */
export function newProxmoxHostIds(
    before: { id: string }[],
    after: { id: string; enabled: boolean; has_secret: boolean }[],
): string[] {
    const known = new Set(before.map(h => h.id));
    return after.filter(h => h.enabled && h.has_secret && !known.has(h.id)).map(h => h.id);
}
