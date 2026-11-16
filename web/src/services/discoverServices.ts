import { containerName, type DockerContainer, type DockerHost } from './dockerShared';
import { planImport, type PlanItem, type PlanSection } from './importPlan';

/**
 * What a host's containers could become on the board: one proposal each, for a
 * person to look over before anything is created.
 *
 * Pure on purpose — no store, no network — so a test can say what the window
 * would show. Anything that comes from a container (its name, its labels, its
 * ports) is only ever a suggestion in a box the person can change; escaping is
 * the template's job, and the values here are never trusted as markup.
 */

/** A way to reach a container: an address it named, a proxy's, or a port it publishes. */
export interface Candidate {
    source: 'label' | 'proxy' | 'port';
    /** The address, for `label` and `proxy`. */
    url?: string;
    /** The published port and the scheme it is most likely served on, for `port`. */
    port?: number;
    scheme?: 'http' | 'https';
}

export type ProposalNote = '' | 'host_network' | 'stopped';

export interface ServiceProposal {
    /** `host/name`, the key a container's own icon and bookmark link are filed under. */
    key: string;
    hostId: string;
    /** The container's name, as the link a bookmark keeps. */
    containerName: string;
    name: string;
    /** In the order they are offered; the first is the proposal. */
    candidates: Candidate[];
    /** The Compose project, when it has one. */
    project: string;
    /** An icon the person already chose for this container, as the address of the stored image. */
    chosenIcon: string;
    /** Names to look up in the icon library, best guess first. */
    iconNames: string[];
    /** The bookmark that already serves it, if one does. */
    linkedTo: string;
    note: ProposalNote;
    /** Whether it starts ticked. */
    selected: boolean;
}

export interface DiscoverInput {
    host: DockerHost | undefined;
    /** The label of the bookmark a container is already tied to, or ''. */
    linkedLabel: (name: string) => string;
    /** The address of the icon the person chose for a container, or ''. */
    chosenIcon: (name: string) => string;
}

export interface Discovery {
    proposals: ServiceProposal[];
    /** Containers with nothing to open (no published port, no label, not on the host's network). */
    withoutAddress: number;
}

/** Ports that are almost always served over TLS. */
export const HTTPS_PORTS: readonly number[] = [443, 8443, 9443, 8006, 10443];

const LOOPBACK = /^(127\.|::1$)/;

/** Lastboard and its own agent are not services somebody bookmarks. */
const OWN_IMAGES = new Set(['lastboard', 'lastboard-agent']);

/** `lscr.io/linuxserver/jellyfin:10.9` -> `jellyfin` */
export function imageBase(image: string): string {
    const noDigest = (image || '').split('@')[0];
    const last = noDigest.split('/').pop() || '';
    return last.split(':')[0].toLowerCase();
}

export function isOwnContainer(c: DockerContainer): boolean {
    return OWN_IMAGES.has(imageBase(c.Image));
}

/**
 * The name a container has once Compose is taken off it: `media-plex-1` in the
 * `media` project is the `plex` service. Only for a container Compose started,
 * where the pattern is known; a hand-named `pihole-2` stays as it is.
 */
export function serviceName(c: DockerContainer): string {
    let name = containerName(c);
    const project = (c.Project || '').toLowerCase();
    if (!project) return name;
    const lower = name.toLowerCase();
    for (const sep of ['-', '_']) {
        if (lower.startsWith(project + sep)) {
            name = name.slice(project.length + 1);
            break;
        }
    }
    return name.replace(/[-_]\d+$/, '');
}

/** `home-assistant` -> `Home Assistant`. */
export function prettyName(name: string): string {
    return name
        .split(/[-_.\s]+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/** A published port and the one it reaches inside the container. */
interface PortEntry { port: number; inside: number }

function portEntries(c: DockerContainer): PortEntry[] {
    const seen = new Map<number, PortEntry>();
    for (const p of c.Ports || []) {
        if (!p || p.PublicPort <= 0) continue;
        if (p.Type && p.Type.toLowerCase() !== 'tcp') continue;
        if (p.IP && LOOPBACK.test(p.IP)) continue;
        if (!seen.has(p.PublicPort)) seen.set(p.PublicPort, { port: p.PublicPort, inside: p.PrivatePort });
    }
    return [...seen.values()].sort((a, b) => a.port - b.port);
}

/** The published TCP ports a browser elsewhere could reach, once each, lowest first. */
export function usablePorts(c: DockerContainer): number[] {
    return portEntries(c).map(e => e.port);
}

export function candidateUrl(c: Candidate, address: string): string {
    if (c.source !== 'port') return c.url || '';
    const scheme = c.scheme || 'http';
    const defaultPort = scheme === 'https' ? 443 : 80;
    return c.port === defaultPort ? `${scheme}://${address}` : `${scheme}://${address}:${c.port}`;
}

function candidatesOf(c: DockerContainer): Candidate[] {
    const out: Candidate[] = [];
    if (c.UrlHint) out.push({ source: 'label', url: c.UrlHint });
    if (c.ProxyUrl && c.ProxyUrl !== c.UrlHint) out.push({ source: 'proxy', url: c.ProxyUrl });
    for (const { port, inside } of portEntries(c)) {
        // Served over TLS when either end is a TLS port: 443 inside, published as 8444 outside, is still https.
        out.push({ source: 'port', port, scheme: HTTPS_PORTS.includes(port) || HTTPS_PORTS.includes(inside) ? 'https' : 'http' });
    }
    return out;
}

/** Names to look up in the icon library: the image's, then the service's. */
export function iconNamesFor(c: DockerContainer): string[] {
    const names: string[] = [];
    const add = (n: string) => { if (n && !names.includes(n)) names.push(n); };
    const base = imageBase(c.Image);
    add(base);
    add(base.replace(/-(server|app|web|ce|core)$/, ''));
    add(serviceName(c).toLowerCase());
    return names;
}

/** The first name the library has, or '' (the board's own glyph). */
export function pickIconName(names: string[], index: Map<string, string>): string {
    for (const n of names) {
        if (index.has(n) || index.has(n.replace(/_/g, '-'))) return n;
    }
    return '';
}

export function discoverDocker(containers: DockerContainer[], input: DiscoverInput): Discovery {
    const proposals: ServiceProposal[] = [];
    let withoutAddress = 0;
    const hostId = input.host?.id ?? '';

    for (const c of containers) {
        if (isOwnContainer(c)) continue;
        const name = containerName(c);
        const candidates = candidatesOf(c);
        const hostNetwork = c.NetworkMode === 'host';
        if (candidates.length === 0 && !hostNetwork) {
            withoutAddress++;
            continue;
        }

        const running = c.Status === 'running';
        const linkedTo = input.linkedLabel(name);
        const note: ProposalNote = hostNetwork && candidates.length === 0 ? 'host_network' : running ? '' : 'stopped';
        proposals.push({
            key: `${hostId}/${name}`,
            hostId,
            containerName: name,
            name: prettyName(serviceName(c)) || name,
            candidates,
            project: c.Project || '',
            chosenIcon: input.chosenIcon(name),
            iconNames: iconNamesFor(c),
            linkedTo,
            note,
            selected: running && candidates.length > 0 && !linkedTo,
        });
    }
    return { proposals, withoutAddress };
}

export type GroupBy = 'host' | 'project';

/**
 * Where each proposal goes. A Compose project with one service in it is not a
 * group worth a section of its own: it joins the host's.
 */
export function sectionTitleFor(p: ServiceProposal, groupBy: GroupBy, hostName: string, projectSize: Map<string, number>): string {
    if (groupBy === 'project' && p.project && (projectSize.get(p.project) ?? 0) > 1) return p.project;
    return hostName;
}

export interface NewService {
    proposal: ServiceProposal;
    name: string;
    url: string;
}

/** A bookmark of the plan, with the index of the service it came from. */
export type PlannedService = PlanItem & { x: number; y: number; ref: number };
export interface ServicesPlan { name: string; sections: (Omit<PlanSection, 'items'> & { items: PlannedService[] })[] }

/** One section per title, with the bookmarks laid out inside it the way an import lays them out. */
export function planServices(services: NewService[], groupBy: GroupBy, hostName: string, cols: number): ServicesPlan {
    const size = new Map<string, number>();
    for (const s of services) if (s.proposal.project) size.set(s.proposal.project, (size.get(s.proposal.project) ?? 0) + 1);
    const items = services.map((s, ref) => ({
        title: s.name,
        url: s.url,
        group: sectionTitleFor(s.proposal, groupBy, hostName, size),
        ref,
    }));
    const [plan] = planImport([{ name: hostName, items }], cols, hostName);
    return (plan ?? { name: hostName, sections: [] }) as ServicesPlan;
}
