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

export interface DockerHost {
    id: string;
    name: string;
    type: 'local' | 'tcp' | 'tls' | 'agent';
    url?: string;
    token?: string;
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
 * Drops a scheme the address was typed with.
 *
 * The connection type already says how to reach the host, and people paste what
 * their DOCKER_HOST holds — `tcp://10.0.0.5:2375` — into a field that then adds
 * a scheme of its own. Left alone that produced `https://tcp://10.0.0.5:2376`,
 * which fails with nothing on screen to explain why.
 */
function bareHost(url: string | undefined): string {
    return (url ?? '').trim().replace(/^(tcp|http|https|unix|npipe|ssh):\/\//i, '');
}

/**
 * A POST to the Docker endpoints.
 *
 * The host goes in the body and never in the address: for an agent it carries
 * the agent's token, and a query string is what a reverse proxy in front of
 * Lastboard writes to its access log.
 */
export function dockerPost(body: unknown): RequestInit {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
        body: JSON.stringify(body),
    };
}

/** How a host is addressed in the `host` field of a Docker request. */
export function hostParam(host: DockerHost): string {
    if (host.type === 'local') return '';
    if (host.type === 'agent') return `agent://${bareHost(host.url)}?token=${encodeURIComponent(host.token ?? '')}`;
    if (host.type === 'tls') return `https://${bareHost(host.url)}`;
    return bareHost(host.url);
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
 * Lists a host's containers. Throws when the host can't be reached.
 *
 * The host is optional because demo mode answers before it is ever read —
 * there is no daemon and no host to address.
 */
export async function fetchContainers(host: DockerHost | undefined): Promise<DockerContainer[]> {
    if (isDemoMode()) return DEMO_CONTAINERS;
    if (!host) return [];

    const res = await fetch('/api/docker/containers', dockerPost({ host: hostParam(host) }));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}
