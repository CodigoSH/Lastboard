import { csrfToken } from './csrf';

/**
 * Docker types and container fetching, shared by the widget and its config
 * screen.
 *
 * Both need the same list — the widget to draw it, the config modal to let you
 * pick icons, names and what stays visible — and both have to work in demo
 * mode, where there is no daemon. Having one place for it is what stops the two
 * from disagreeing about which containers exist.
 */

/**
 * A Docker host as the widget and its config screen know it: one of the
 * account's own (see dockerHosts.ts). It carries no token — the server keeps
 * that and reads it itself when a request names the host.
 */
export interface DockerHost {
    id: string;
    name: string;
    type: 'local' | 'tcp' | 'tls' | 'agent';
    url?: string;
}

export interface DockerPort {
    PublicPort: number;
    PrivatePort: number;
    Type: string;
}

export interface DockerContainer {
    ID: string;
    Name: string;
    Image: string;
    Status: string;
    State: string;
    Created: number;
    Ports: DockerPort[];
    /** Address the container labels itself with, when it does. */
    UrlHint?: string;
}

/**
 * Per-container presentation, keyed by short id in the widget's content.
 *
 * Rows used to carry a chosen icon; state is a dot now, the same one the
 * monitor widget uses, so there was nothing left for an icon to be. Older
 * configs may still hold the fields — unread keys do no harm.
 */
export interface ContainerCfgEntry {
    label?: string;
    hidden?: boolean;
    /** Where clicking this row goes. Empty means the row isn't a link. */
    url?: string;
}

/**
 * A POST to the Docker endpoints.
 *
 * The host goes in the body, not the address, so nothing about it lands in
 * the access log of a reverse proxy in front of Lastboard.
 */
export function dockerPost(body: unknown): RequestInit {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
        body: JSON.stringify(body),
    };
}

/**
 * What a Docker request says about the host: which of the account's hosts it
 * is, and nothing about where it is. The address and the agent's token are
 * the server's to read from the account.
 */
export function hostRef(host: DockerHost): { host_id: string } {
    return { host_id: host.id };
}

/** The id containerConfig is keyed by. */
export function shortId(id: string): string {
    return id.substring(0, 8);
}

/** Docker reports names with a leading slash. */
export function containerName(c: DockerContainer): string {
    return c.Name.replace(/^\//, '');
}

/**
 * The hostname the browser would use to reach a Docker host's containers.
 *
 * A local socket means the containers run alongside Lastboard itself, so
 * whatever address got you here also gets you to them. A remote host is
 * addressed by the host part of its configured URL, with the Docker port
 * dropped — that port answers the API, not the services.
 */
export function hostAddress(host: DockerHost | undefined, fallback: string): string {
    if (!host || host.type === 'local' || !host.url) return fallback;
    const raw = host.url.replace(/^\w+:\/\//, '').split('/')[0];
    const withoutPort = raw.replace(/:\d+$/, '');
    return withoutPort || fallback;
}

/**
 * Where a container's row should point, before any hand-written override.
 *
 * A label the container carries wins: it is the container author saying where
 * it lives, and it survives a port that only makes sense inside a network.
 * Otherwise the first published port is the honest guess — it is the one thing
 * we actually know reaches it. Nothing published means no guess at all.
 */
export function defaultContainerUrl(
    c: DockerContainer,
    host: DockerHost | undefined,
    fallbackHost: string,
): string {
    if (c.UrlHint) return c.UrlHint;

    const port = (c.Ports || []).find(p => p.PublicPort > 0);
    if (!port) return '';

    return `http://${hostAddress(host, fallbackHost)}:${port.PublicPort}`;
}

// In DEMO_ONLY mode there is no Docker daemon, so the widget would be empty.
// These synthetic containers let visitors see it working. Real installs never
// take this path (guarded by window.LASTBOARD_CONFIG.demo_mode).
export function isDemoMode(): boolean {
    return typeof window !== 'undefined' && window.LASTBOARD_CONFIG?.demo_mode === true;
}

export const DEMO_CONTAINERS: DockerContainer[] = [
    { ID: 'demo-lastboard', Name: 'lastboard', Image: 'git.codigosh.com/codigosh/lastboard:latest', Status: 'running', State: 'running', Created: 1717000000, Ports: [{ PublicPort: 8080, PrivatePort: 8080, Type: 'tcp' }] },
    { ID: 'demo-postgres', Name: 'postgres', Image: 'postgres:16-alpine', Status: 'running', State: 'running', Created: 1716000000, Ports: [{ PublicPort: 5432, PrivatePort: 5432, Type: 'tcp' }] },
    { ID: 'demo-traefik', Name: 'traefik', Image: 'traefik:v3.1', Status: 'running', State: 'running', Created: 1715000000, Ports: [{ PublicPort: 443, PrivatePort: 443, Type: 'tcp' }] },
    // Carries a label, so the demo shows a container saying where it lives
    // rather than every row falling back to host:port.
    { ID: 'demo-jellyfin', Name: 'jellyfin', Image: 'jellyfin/jellyfin:latest', Status: 'running', State: 'running', Created: 1716500000, Ports: [{ PublicPort: 8096, PrivatePort: 8096, Type: 'tcp' }], UrlHint: 'https://jellyfin.home.example' },
    { ID: 'demo-redis', Name: 'redis', Image: 'redis:7-alpine', Status: 'running', State: 'running', Created: 1716800000, Ports: [] },
    { ID: 'demo-backup', Name: 'nightly-backup', Image: 'offen/docker-volume-backup:v2', Status: 'stopped', State: 'stopped', Created: 1714000000, Ports: [] },
];

/**
 * Why a host could not be listed, as the i18n key to show.
 *
 * The server tells a refused token apart from a host that is not there, and
 * the difference is the whole point: one is fixed in Preferences → Docker,
 * the other in the network. Anything it does not name is "could not connect".
 */
export class DockerHostError extends Error {
    readonly key: string;
    constructor(serverKey: string) {
        super(serverKey || 'docker.connection_error');
        this.key = serverKey === 'docker.unauthorized' ? 'docker.unauthorized' : 'docker.connection_error';
    }
}

/**
 * Which release an agent runs, as it reports it on /health.
 *
 * Agents before v1.1.0 answer without a version, which is itself an answer:
 * they are older than that. A host that does not answer gives null, and the
 * screen says nothing rather than guess.
 */
export async function fetchAgentVersion(host: DockerHost): Promise<string | null> {
    if (host.type !== 'agent' || isDemoMode()) return null;
    try {
        const res = await fetch('/api/docker/agent-version', dockerPost(hostRef(host)));
        if (!res.ok) return null;
        const data = await res.json();
        return agentVersionLabel(typeof data?.version === 'string' ? data.version : '');
    } catch {
        return null;
    }
}

/** What the screen prints for an agent's reported version. */
export function agentVersionLabel(reported: string): string {
    const v = reported.trim();
    if (!v) return '< v1.1.0';
    return v.startsWith('v') ? v : `v${v}`;
}

/** The key to show for a failed host, whatever was thrown. */
export function hostErrorKey(err: unknown): string {
    return err instanceof DockerHostError ? err.key : 'docker.connection_error';
}

/**
 * Lists a host's containers. Throws when the host can't be reached.
 *
 * The host is optional because demo mode answers before it is ever read —
 * there is no daemon and no host to address.
 */
export async function fetchContainers(host: DockerHost | undefined): Promise<DockerContainer[]> {
    if (isDemoMode()) return DEMO_CONTAINERS;
    if (!host) return [];

    const res = await fetch('/api/docker/containers', dockerPost(hostRef(host)));
    if (!res.ok) throw new DockerHostError((await res.text().catch(() => '')).trim());
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}
