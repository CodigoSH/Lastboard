import type { PxGuest, PxHost, PxNode, PxStore } from './proxmoxApi';
import type { InfraUnit } from './infraUnits';

/**
 * What the Proxmox overview shows that is a rule and not a drawing: which
 * machines and stores need looking at and why, what every connected
 * hypervisor adds up to, and how a fleet's CPU curve is weighed. Pure, so each
 * rule can be read and tested without a DOM, and so the page and its summary
 * cannot disagree about what "needs attention" means.
 */

/** The label of the bookmark that backs a machine, or '' when none does. */
export type LinkOf = (hostId: string, guest: PxGuest) => string;

/** A hypervisor that answered. One that did not has no figures to add up. */
export const liveHosts = (hosts: PxHost[]): PxHost[] => hosts.filter(h => !h.error);

/** The key a machine is known by across hypervisors: two clusters may both have a machine 100. */
export const unitId = (hostId: string, vmid: number): string => `${hostId}/${vmid}`;

/** Stores of every hypervisor given, each counted once. */
export interface FleetStore extends PxStore { hostId: string; hostName: string }

/**
 * A SHARED store is reported by every node of the cluster, so adding them up
 * counts a Ceph pool three times in a cluster of three. The flag is in the
 * answer; the key drops the node for a shared one.
 */
export function fleetStores(hosts: PxHost[]): FleetStore[] {
    const seen = new Set<string>();
    const out: FleetStore[] = [];
    for (const h of liveHosts(hosts)) {
        for (const s of h.stores || []) {
            const key = s.shared ? `${h.id}|${s.name}` : `${h.id}|${s.node}|${s.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ ...s, hostId: h.id, hostName: h.name });
        }
    }
    return out;
}

export interface FleetNode extends PxNode { hostId: string; hostName: string }

export function fleetNodes(hosts: PxHost[]): FleetNode[] {
    return liveHosts(hosts).flatMap(h => h.nodes.map(n => ({ ...n, hostId: h.id, hostName: h.name })));
}

export interface FleetGuest extends PxGuest { hostId: string; hostName: string; link: string }

export function fleetGuests(hosts: PxHost[], linkOf: LinkOf): FleetGuest[] {
    return liveHosts(hosts).flatMap(h => (h.guests || []).map(g => ({ ...g, hostId: h.id, hostName: h.name, link: linkOf(h.id, g) })));
}

/** CPU of a set of nodes, weighted by cores: a node of 8 at 12 % and one of 32 at 78 % average to a number that describes neither. */
export function weightedCpu(nodes: Pick<PxNode, 'cpu' | 'cores'>[]): number {
    const cores = nodes.reduce((a, n) => a + n.cores, 0);
    if (cores <= 0) return nodes.length ? nodes.reduce((a, n) => a + n.cpu, 0) / nodes.length : 0;
    return nodes.reduce((a, n) => a + n.cpu * n.cores, 0) / cores;
}

export interface FleetTotals {
    guests: number; running: number; stopped: number; lxc: number; vm: number;
    nodes: number; cores: number; threads: number;
    cpu: number; memUsed: number; memTotal: number;
    storeCount: number; worstStore: FleetStore | null; storeFree: number;
    /** Hypervisors that did not answer. */
    down: number;
    /** Stopped machines a bookmark of the operator's points at: an outage, not a machine somebody turned off. */
    outages: number;
    attention: number;
}

export function fleetTotals(hosts: PxHost[], linkOf: LinkOf): FleetTotals {
    const nodes = fleetNodes(hosts);
    const guests = fleetGuests(hosts, linkOf);
    const stores = fleetStores(hosts);
    const worst = stores.reduce<FleetStore | null>((w, s) => (!w || s.percent > w.percent ? s : w), null);
    return {
        guests: guests.length,
        running: guests.filter(g => g.running).length,
        stopped: guests.filter(g => !g.running).length,
        lxc: guests.filter(g => g.kind === 'lxc').length,
        vm: guests.filter(g => g.kind !== 'lxc').length,
        nodes: nodes.length,
        cores: nodes.reduce((a, n) => a + n.cores, 0),
        threads: nodes.reduce((a, n) => a + n.threads, 0),
        cpu: weightedCpu(nodes),
        memUsed: nodes.reduce((a, n) => a + n.mem_used, 0),
        memTotal: nodes.reduce((a, n) => a + n.mem_total, 0),
        storeCount: stores.length,
        worstStore: worst,
        storeFree: stores.reduce((a, s) => a + Math.max(0, s.total - s.used), 0),
        down: hosts.length - liveHosts(hosts).length,
        outages: guests.filter(g => !g.running && g.link).length,
        attention: attentionList(hosts, linkOf).length,
    };
}

// ── Attention ──────────────────────────────────────────────────────────────

/** How hot a machine's CPU, a node's memory or a store's fill may get before it is listed. */
export const CPU_ATTENTION = 90;
/** A node's memory is worth a look from here, and is red from RED_ATTENTION: the point where its bar turns red. */
export const MEM_ATTENTION = 85;
export const RED_ATTENTION = 90;
export const STORE_ATTENTION = 90;
export const STORE_CRITICAL = 95;

/** A machine's RAM as a share of what it is given: the bar on its card. `mem` itself is bytes. */
export const guestRam = (g: Pick<PxGuest, 'mem' | 'mem_total'>): number => (g.mem_total > 0 ? (g.mem / g.mem_total) * 100 : 0);

export type AttentionKind = 'host' | 'guest' | 'node' | 'store';
export type AttentionReason = 'host_down' | 'outage' | 'cpu' | 'mem' | 'node_cpu' | 'node_mem' | 'node_disk' | 'store_full';

export interface AttentionItem {
    kind: AttentionKind;
    reason: AttentionReason;
    tone: 'bad' | 'warn';
    hostId: string;
    hostName: string;
    /** The machine's id, the node's name or the store's name: what the page needs to open it. */
    ref: string;
    /** The name shown. */
    title: string;
    /** The number the reason is about: a percentage, or the bookmark's name. */
    value: number;
    link?: string;
}

/**
 * Everything that needs a look, the worst first: a hypervisor that does not
 * answer, a stopped machine a bookmark depends on, a store nearly out of room,
 * then the things that are only hot. A machine somebody turned off is not here:
 * it is on the Machines tab, under Stopped.
 */
export function attentionList(hosts: PxHost[], linkOf: LinkOf): AttentionItem[] {
    const out: AttentionItem[] = [];
    for (const h of hosts) {
        if (h.error) out.push({ kind: 'host', reason: 'host_down', tone: 'bad', hostId: h.id, hostName: h.name, ref: h.id, title: h.name, value: 0 });
    }
    for (const g of fleetGuests(hosts, linkOf)) {
        if (!g.running && g.link) {
            out.push({ kind: 'guest', reason: 'outage', tone: 'bad', hostId: g.hostId, hostName: g.hostName, ref: String(g.vmid), title: g.name, value: 0, link: g.link });
        } else if (g.running && Math.max(g.cpu, guestRam(g)) >= RED_ATTENTION) {
            // What the machine's card paints red is what the list says: the worse of its two meters.
            const ram = guestRam(g), mem = ram > g.cpu;
            out.push({ kind: 'guest', reason: mem ? 'mem' : 'cpu', tone: 'bad', hostId: g.hostId, hostName: g.hostName, ref: String(g.vmid), title: g.name, value: mem ? ram : g.cpu });
        }
    }
    for (const s of fleetStores(hosts)) {
        if (s.percent >= STORE_ATTENTION) {
            out.push({ kind: 'store', reason: 'store_full', tone: s.percent >= STORE_CRITICAL ? 'bad' : 'warn', hostId: s.hostId, hostName: s.hostName, ref: s.name, title: s.name, value: s.percent });
        }
    }
    for (const n of fleetNodes(hosts)) {
        // A node's card is red when any of its three meters is, so the list says which one.
        const worst = ([['node_cpu', n.cpu], ['node_mem', n.mem], ['node_disk', n.disk]] as [AttentionReason, number][])
            .reduce((a, b) => (b[1] > a[1] ? b : a));
        if (worst[1] >= RED_ATTENTION) {
            out.push({ kind: 'node', reason: worst[0], tone: 'bad', hostId: n.hostId, hostName: n.hostName, ref: n.name, title: n.name, value: worst[1] });
        } else if (n.mem >= MEM_ATTENTION) {
            out.push({ kind: 'node', reason: 'node_mem', tone: 'warn', hostId: n.hostId, hostName: n.hostName, ref: n.name, title: n.name, value: n.mem });
        }
    }
    // The worst first: by tone, then by what it is — a hypervisor that does not answer, a machine a bookmark
    // depends on, a store out of room, a node, then a machine that is only hot. Array.sort is stable.
    const rank = { bad: 0, warn: 1 };
    const kind: Record<AttentionReason, number> = { host_down: 0, outage: 1, store_full: 2, node_cpu: 3, node_mem: 3, node_disk: 3, cpu: 4, mem: 4 };
    return out.sort((a, b) => rank[a.tone] - rank[b.tone] || kind[a.reason] - kind[b.reason]);
}

// ── The inventory ──────────────────────────────────────────────────────────

/** One machine as the inventory sees it. */
export function guestUnits(hosts: PxHost[], linkOf: LinkOf): InfraUnit[] {
    return fleetGuests(hosts, linkOf).map(g => ({
        id: unitId(g.hostId, g.vmid),
        name: g.name || String(g.vmid),
        level: g.running ? 'up' : 'off',
        attention: (!g.running && !!g.link) || (g.running && Math.max(g.cpu, guestRam(g)) >= RED_ATTENTION),
        group: g.node,
        haystack: `${g.name} ${g.vmid} ${g.node} ${g.hostName} ${g.link} ${g.kind === 'lxc' ? 'lxc' : 'vm'}`.toLowerCase(),
        cpu: g.running ? g.cpu : undefined,
        mem: g.running ? g.mem : undefined,
    }));
}

// ── The fleet's curve ──────────────────────────────────────────────────────

/**
 * One curve for several nodes, WEIGHTED, not averaged: CPU by cores, memory by bytes. The SHORTEST
 * series sets the length: nodes that joined a cluster at different times come back with different
 * numbers of points, and reading past the end of one would weigh it as zero.
 */
export function weightedSeries(series: { weight: number; values: number[] }[]): number[] {
    const got = series.filter(s => s.values.length > 0);
    if (!got.length) return [];
    const points = Math.min(...got.map(s => s.values.length));
    const total = got.reduce((a, s) => a + s.weight, 0) || 1;
    const curve: number[] = [];
    for (let i = 0; i < points; i++) {
        curve.push(Math.round(got.reduce((a, s) => a + s.values[i] * s.weight, 0) / total * 10) / 10);
    }
    return curve;
}

/** The CPU curve of several nodes, weighted by cores. */
export function weightedCurve(series: { cores: number; cpu: number[] }[]): number[] {
    return weightedSeries(series.map(s => ({ weight: s.cores, values: s.cpu })));
}

// ── How long something has been on ─────────────────────────────────────────

export interface UptimeParts { years: number; months: number; days: number }

/**
 * An uptime as the calendar a person counts in — years, months and days, never hours or minutes —
 * so that "400 days" reads "1 year, 1 month and 4 days". A year is 365 days and a month 30: what
 * is left after the years is cut into months, and what is left after those is days. Under a day
 * everything is zero.
 */
export function uptimeParts(sec: number): UptimeParts {
    const total = Math.floor((Number.isFinite(sec) && sec > 0 ? sec : 0) / 86400);
    const years = Math.floor(total / 365);
    const rest = total - years * 365;
    const months = Math.floor(rest / 30);
    return { years, months, days: rest - months * 30 };
}
