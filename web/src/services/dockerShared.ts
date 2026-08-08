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
}

/** Per-container presentation, keyed by short id in the widget's content. */
export interface ContainerCfgEntry {
    label?: string;
    icon?: string;
    iconName?: string;
    hidden?: boolean;
}

/** How a host is addressed in the `host` query parameter. */
export function hostParam(host: DockerHost): string {
    if (host.type === 'local') return '';
    if (host.type === 'agent') return `agent://${host.url ?? ''}?token=${encodeURIComponent(host.token ?? '')}`;
    if (host.type === 'tls') return `https://${host.url ?? ''}`;
    return host.url ?? '';
}

/** The id containerConfig is keyed by. */
export function shortId(id: string): string {
    return id.substring(0, 8);
}

/** Docker reports names with a leading slash. */
export function containerName(c: DockerContainer): string {
    return c.Name.replace(/^\//, '');
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
    { ID: 'demo-jellyfin', Name: 'jellyfin', Image: 'jellyfin/jellyfin:latest', Status: 'running', State: 'running', Created: 1716500000, Ports: [{ PublicPort: 8096, PrivatePort: 8096, Type: 'tcp' }] },
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

    const res = await fetch(`/api/docker/containers?host=${encodeURIComponent(hostParam(host))}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}
