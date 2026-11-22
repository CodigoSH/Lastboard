import { containerName, type DockerContainer, type DockerHost } from './dockerShared';
import { GRID_MIN, planImport, type PlanItem, type PlanSection } from './importPlan';
import type { PxGuest } from './proxmoxApi';
import { iconKey } from './proxmoxIcons';
import { withoutOrdinal } from './proxmoxMatch';
import { isIconName } from './importIcons';

/**
 * What a host's containers could become on the board: one proposal each, for a
 * person to look over before anything is created.
 *
 * Pure on purpose — no store, no network — so a test can say what the window
 * would show. Anything that comes from a container (its name, its labels, its
 * ports) is only ever a suggestion in a box the person can change; escaping is
 * the template's job, and the values here are never trusted as markup.
 */

/**
 * A way to reach a service: an address a container named, a proxy's, a port it
 * publishes, the address a machine reports, or its console on the hypervisor.
 */
export interface Candidate {
    source: 'label' | 'proxy' | 'port' | 'ip' | 'console';
    /** The address, for everything but `port`. */
    url?: string;
    /** The published port and the scheme it is most likely served on, for `port`. */
    port?: number;
    scheme?: 'http' | 'https';
}

export type ProposalNote = '' | 'host_network' | 'stopped' | 'no_ip';

/** What a bookmark keeps to say which container or machine it serves. */
export type ServiceLink =
    | { docker: { host: string; name: string } }
    | { proxmox: { host: string; node: string; kind: string; vmid: number } };

export interface ServiceProposal {
    /** `host/name`, the key a container's own icon and bookmark link are filed under. */
    key: string;
    hostId: string;
    /** The container's name, or the machine's. */
    containerName: string;
    /** What the bookmark will say it serves. */
    link: ServiceLink;
    name: string;
    /** In the order they are offered; the first is the proposal. */
    candidates: Candidate[];
    /** The Compose project, when it has one. */
    project: string;
    /** An icon the person already chose for this container, as the address of the stored image. */
    chosenIcon: string;
    /** Names to look up in the icon library, best guess first. */
    iconNames: string[];
    /** An icon the container named by address, to be stored like any other. */
    labelIcon: string;
    /** The section the container says it belongs in, or ''. It wins over how the window groups. */
    group: string;
    /** The bookmark that already serves it, if one does. */
    linkedTo: string;
    /** The icon that bookmark wears, as it stores it; '' when there is none or no bookmark. */
    linkedIcon: string;
    /** A bookmark nobody tied to it that seems to be it (by name or by address), which could be tied now. */
    match: BookmarkMatch | null;
    note: ProposalNote;
    /** Whether it starts ticked. */
    selected: boolean;
}

/** A bookmark already on a board, found as the likely home of a service it is not yet tied to. */
export interface BookmarkMatch {
    label: string;
    /** The icon it wears, exactly as it stores it. */
    icon: string;
    itemId: number;
    boardId: number | null;
    /** Its content as the server holds it. */
    content: string;
}

export interface DiscoverInput {
    host: DockerHost | undefined;
    /** The label of the bookmark a container is tied to by hand, or ''. */
    linkedLabel: (name: string) => string;
    /** The icon that bookmark wears; '' when none. */
    linkedIcon?: (name: string) => string;
    /** The bookmark a container's name says it is, when none is tied to it. */
    matchOf?: (name: string) => BookmarkMatch | null;
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

/**
 * Service names that say what a container does in a stack, not what the stack
 * is: `immich-server` is the `server` service of the `immich` project, and a
 * bookmark called "Server" tells nobody anything.
 */
const ROLE_NAMES = new Set([
    'server', 'web', 'webserver', 'www', 'app', 'application', 'api', 'frontend', 'backend', 'ui', 'gui', 'site', 'main', 'core', 'service',
]);

/**
 * What a service is called on a bookmark. A stack of several apps (`media`:
 * `plex`, `sonarr`) names each by its service; a stack that is one app
 * (`immich`: `server`) is named by the stack, because its service names are
 * only roles. Returns the role too, so two roles of one stack can be told apart.
 */
export function displayName(c: DockerContainer): { name: string; role: string } {
    const service = serviceName(c);
    const project = (c.Project || '').trim();
    if (project && ROLE_NAMES.has(service.toLowerCase())) return { name: prettyName(project), role: service };
    return { name: prettyName(service), role: '' };
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

/** Names to look up in the icon library: what the container says, then the image's, then the service's. */
export function iconNamesFor(c: DockerContainer): string[] {
    const names: string[] = [];
    const add = (n: string) => { if (n && !names.includes(n)) names.push(n); };
    const hint = (c.HintIcon || '').trim();
    if (hint && isIconName(hint)) add(hint.toLowerCase());
    const base = imageBase(c.Image);
    add(base);
    add(base.replace(/-(server|app|web|ce|core)$/, ''));
    add(serviceName(c).toLowerCase());
    return names;
}

/** Words that say what a machine is and not what it runs: `plex-lxc`, `vm-plex`, `jellyfin-prod`. */
const MACHINE_ROLES = new Set(['lxc', 'ct', 'vm', 'srv', 'server', 'prod', 'dev', 'test', 'staging']);

/**
 * Names to look up in the icon library for a Proxmox machine, the exact one first: the number it is filed under
 * (`18-lastboard`), a numbered copy (`pihole01`, `pihole-2`) and the words that say what kind of machine it is
 * (`plex-lxc`) are taken off one at a time, so each name is tried before the next, plainer one. A name is never
 * cut down to nothing: a machine called `vm` stays `vm`.
 */
export function guestIconNames(name: string): string[] {
    const names: string[] = [];
    const add = (n: string) => { if (n && !names.includes(n)) names.push(n); };
    const lower = (name || '').trim().toLowerCase();
    add(lower);
    const bare = withoutOrdinal(lower);
    add(bare);
    const untailed = bare.replace(/[-_.]?\d+$/, '');
    add(untailed);
    const parts = untailed.split(/[-_.\s]+/).filter(Boolean);
    while (parts.length > 1 && MACHINE_ROLES.has(parts[0])) parts.shift();
    while (parts.length > 1 && MACHINE_ROLES.has(parts[parts.length - 1])) parts.pop();
    // What is left must name something: `lxc-test` is two words of role, not a service called `test`.
    if (!(parts.length === 1 && MACHINE_ROLES.has(parts[0]))) add(parts.join('-'));
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
    /** The role a proposal's name took from its stack, for telling two of one stack apart. */
    const roles = new Map<ServiceProposal, string>();

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
        const tied = input.linkedLabel(name);
        // A bookmark made by hand before this page existed is on the board already: it is told apart, not duplicated.
        const match = tied ? null : input.matchOf?.(name) ?? null;
        const linkedTo = tied || match?.label || '';
        const linkedIcon = tied ? input.linkedIcon?.(name) ?? '' : match?.icon ?? '';
        const note: ProposalNote = hostNetwork && candidates.length === 0 ? 'host_network' : running ? '' : 'stopped';
        const shown = displayName(c);
        const labelled = (c.HintName || '').trim();
        const proposal: ServiceProposal = {
            key: `${hostId}/${name}`,
            hostId,
            containerName: name,
            link: { docker: { host: hostId, name } },
            name: labelled || shown.name || name,
            candidates,
            project: c.Project || '',
            chosenIcon: input.chosenIcon(name),
            iconNames: iconNamesFor(c),
            labelIcon: /^https?:\/\//i.test((c.HintIcon || '').trim()) ? (c.HintIcon || '').trim() : '',
            group: (c.HintGroup || '').trim(),
            linkedTo,
            linkedIcon,
            match,
            note,
            selected: running && candidates.length > 0 && !linkedTo,
        };
        if (!labelled && shown.role) roles.set(proposal, shown.role);
        proposals.push(proposal);
    }
    // Two roles of one stack both took the stack's name ("Immich", "Immich"): say which is which.
    const taken = new Map<string, number>();
    for (const p of roles.keys()) taken.set(p.name, (taken.get(p.name) ?? 0) + 1);
    for (const [p, role] of roles) if ((taken.get(p.name) ?? 0) > 1) p.name = `${p.name} ${prettyName(role)}`;
    return { proposals, withoutAddress };
}

export type GroupBy = 'host' | 'project';

/**
 * Where each proposal goes. A Compose project with one service in it is not a
 * group worth a section of its own: it joins the host's.
 */
export function sectionTitleFor(p: ServiceProposal, groupBy: GroupBy, hostName: string, projectSize: Map<string, number>): string {
    // What the container says about where it belongs is its author's word: it wins however the window groups.
    if (p.group) return p.group;
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
/**
 * `forceTitle` is the section the person named: all of them go in it, whatever a container says about where it belongs.
 */
export function planServices(services: NewService[], groupBy: GroupBy, hostName: string, cols: number, forceTitle = ''): ServicesPlan {
    const size = new Map<string, number>();
    for (const s of services) if (s.proposal.project) size.set(s.proposal.project, (size.get(s.proposal.project) ?? 0) + 1);
    const items = services.map((s, ref) => ({
        title: s.name,
        url: s.url,
        group: forceTitle.trim() || sectionTitleFor(s.proposal, groupBy, hostName, size),
        ref,
    }));
    const [plan] = planImport([{ name: hostName, items }], cols, hostName);
    const out = (plan ?? { name: hostName, sections: [] }) as ServicesPlan;
    // A section is as big as what goes in it, not a fixed block the import uses: two bookmarks are 2 wide by 1 high, three are 3 by 1.
    for (const sec of out.sections) {
        const { w, h } = fitSection(sec.items.length, cols);
        sec.w = w;
        sec.h = h;
        sec.items.forEach((it, k) => { it.x = GRID_MIN + (k % w); it.y = GRID_MIN + Math.floor(k / w); });
    }
    return out;
}

/** The widest a section grows before its bookmarks wrap to a second row. */
export const SECTION_MAX_W = 4;

/**
 * The smallest box that holds `count` bookmarks in rows of at most four: one row up to four, then as many rows as that
 * needs, narrowed again so no cell is left over beyond the last row's own (5 are 3 by 2, not 4 by 2).
 */
export function fitSection(count: number, cols: number): { w: number; h: number } {
    const n = Math.max(1, count);
    const widest = Math.max(1, Math.min(SECTION_MAX_W, cols));
    const h = Math.ceil(n / Math.min(n, widest));
    return { w: Math.ceil(n / h), h };
}

// ── Proxmox ──────────────────────────────────────────────────────────────────

export interface ProxmoxDiscoverInput {
    host: { id: string; name: string };
    /** The hypervisor's own web address, `https://pve.lan:8006`, for the console; '' when unknown. */
    consoleBase: string;
    guests: PxGuest[];
    /** The address each machine reports, keyed `node|vmid`; a machine that reports none is not in it. */
    addresses: Record<string, string>;
    /** The address a machine's notes give for it, keyed the same way; it is offered first. */
    urls?: Record<string, string>;
    /** The label of the bookmark a machine is tied to by hand, or ''. */
    linkedLabel: (g: PxGuest) => string;
    /** The icon that bookmark wears; '' when none. */
    linkedIcon?: (g: PxGuest) => string;
    /** The bookmark a machine's name says it is, when none is tied to it. */
    matchOf?: (g: PxGuest) => BookmarkMatch | null;
    /** The address of the icon the person chose for a machine, or ''. */
    chosenIcon: (g: PxGuest) => string;
}

/** How the server keys the address it reports for a machine. */
export function addressKey(node: string, vmid: number): string {
    return `${node}|${vmid}`;
}

/** Where a machine opens in the hypervisor's own interface. */
export function consoleUrl(base: string, kind: 'lxc' | 'qemu', vmid: number): string {
    return base ? `${base.replace(/\/+$/, '')}/#v1:0:=${kind}%2F${vmid}` : '';
}

/**
 * What a hypervisor's machines could become on the board. A machine with an
 * address is proposed at it (`http://` and the address: the port is the person's
 * to add); one without — off, or a virtual machine with no guest agent — opens
 * its console on the hypervisor, and a machine that is off starts unticked.
 */
export function discoverProxmox(input: ProxmoxDiscoverInput): Discovery {
    const proposals: ServiceProposal[] = [];
    let withoutAddress = 0;
    const { host } = input;

    for (const g of input.guests) {
        const ip = input.addresses[addressKey(g.node, g.vmid)] ?? '';
        const candidates: Candidate[] = [];
        const noted = input.urls?.[addressKey(g.node, g.vmid)] ?? '';
        if (noted) candidates.push({ source: 'label', url: noted });
        if (ip) candidates.push({ source: 'ip', url: `http://${ip}` });
        const console = consoleUrl(input.consoleBase, g.kind, g.vmid);
        if (console) candidates.push({ source: 'console', url: console });
        if (candidates.length === 0) { withoutAddress++; continue; }

        const tied = input.linkedLabel(g);
        const match = tied ? null : input.matchOf?.(g) ?? null;
        const linkedTo = tied || match?.label || '';
        const linkedIcon = tied ? input.linkedIcon?.(g) ?? '' : match?.icon ?? '';
        proposals.push({
            key: iconKey(host.id, g.node, g.vmid),
            hostId: host.id,
            containerName: g.name,
            link: { proxmox: { host: host.id, node: g.node, kind: g.kind, vmid: g.vmid } },
            name: prettyName(g.name) || g.name,
            candidates,
            project: '',
            chosenIcon: input.chosenIcon(g),
            iconNames: guestIconNames(g.name),
            labelIcon: '',
            group: '',
            linkedTo,
            linkedIcon,
            match,
            note: !g.running ? 'stopped' : ip || noted ? '' : 'no_ip',
            selected: g.running && (!!ip || !!noted) && !linkedTo,
        });
    }
    return { proposals, withoutAddress };
}
