import { secretChange } from './secretField';
import type { DockerHost } from './dockerShared';

/**
 * What the Docker hosts of an account are, and the rules about them that need
 * no network: which a widget draws, what it stores of its choice, and the body
 * that saves the list. Kept apart from the requests so tests can read it.
 */

export type DockerHostType = DockerHost['type'];

/** A host as /api/docker/settings lists it. The token is never part of it. */
export interface AccountDockerHost {
    id: string;
    name: string;
    type: DockerHostType;
    url: string;
    enabled: boolean;
    has_token: boolean;
    /** False for a host this account may not reach; it can only be renamed, switched off or removed. */
    usable: boolean;
}

export interface DockerSettings {
    /** At least one host is on and usable. */
    enabled: boolean;
    /** The administrator may use every kind of host; a member only agents. */
    admin: boolean;
    hosts: AccountDockerHost[];
}

/**
 * The hosts a widget draws: its chosen ones among those switched on and usable.
 * No choice at all means every one of them, the ones added later included.
 */
export function hostsForWidget(all: AccountDockerHost[], hostIds?: string[]): DockerHost[] {
    const chosen = hostIds && hostIds.length ? new Set(hostIds) : null;
    return all
        .filter(h => h.enabled && h.usable && (!chosen || chosen.has(h.id)))
        .map(h => ({ id: h.id, name: h.name, type: h.type, url: h.url }));
}

/** What `hostIds` should hold once the ticked hosts are known: nothing when they are all ticked. */
export function hostIdsToStore(all: AccountDockerHost[], ticked: string[]): string[] | undefined {
    const pickable = all.filter(h => h.enabled && h.usable).map(h => h.id);
    const set = new Set(ticked);
    if (pickable.every(id => set.has(id))) return undefined;
    return pickable.filter(id => set.has(id));
}

/** A host being saved: what the form holds over what the server listed. */
export interface DockerHostEdit extends AccountDockerHost {
    /** What the token box held: dots, something typed, or nothing. */
    tokenBox?: string;
}

/**
 * The body that saves the whole list. A token travels only when it was typed
 * over the dots, and removing one has its own mark; a host that is not touched
 * says nothing about its token and the server keeps it.
 */
export function dockerSettingsPayload(hosts: DockerHostEdit[]) {
    return {
        hosts: hosts.map(h => {
            const out: Record<string, unknown> = {
                id: h.id, name: h.name, type: h.type, url: h.type === 'local' ? '' : h.url, enabled: h.enabled,
            };
            if (h.type !== 'agent' || h.tokenBox === undefined) return out;
            const change = secretChange(h.tokenBox, h.has_token);
            if (change.action === 'set') out.token = change.token;
            else if (change.action === 'clear') out.clear_token = true;
            return out;
        }),
    };
}
