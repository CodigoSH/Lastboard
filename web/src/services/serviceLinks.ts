import { dockerLinkFor } from './dockerLinks';
import { bookmarkNamed } from './proxmoxLinks';

/**
 * The label of the bookmark that serves a container: one that names it, or else
 * one it is called after. Both indexes are built from every board by whoever
 * reads them first; until then, nothing.
 */
export function containerServedBy(hostId: string, name: string): string {
    return dockerLinkFor(hostId, name)?.label ?? bookmarkNamed(name)?.label ?? '';
}
