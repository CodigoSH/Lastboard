/**
 * Synthetic Proxmox data for the demo.
 *
 * The demo has no backend, so these endpoints are served from here. Everything
 * is generated deterministically from the machine's id and the current time:
 * the same container always looks the same, load drifts organically instead of
 * flickering, and one machine is deliberately stopped — with a bookmark
 * pointing at it — because the whole point of the page is the sentence it can
 * then write: this service is down because the machine under it is.
 *
 * Pure module on purpose — no localStorage, no window, no i18n — so it can be
 * unit tested and reused by the overview and the series endpoints alike.
 */

export interface DemoPxNode {
    name: string; status: string;
    cpu: number; mem: number; disk: number;
    threads: number; cores: number; mem_total: number;
    uptime: number; loadavg: string[]; guests: number;
}

export interface DemoPxGuest {
    vmid: number; name: string; kind: 'lxc' | 'qemu'; node: string;
    running: boolean; cpu: number; mem: number; mem_total: number; uptime: number;
}

export interface DemoPxStore {
    name: string; node: string; kind: string;
    used: number; total: number; percent: number; shared: boolean;
}

export interface DemoPxOverview {
    cluster: boolean;
    caps: { read: boolean; power: boolean };
    nodes: DemoPxNode[];
    guests: DemoPxGuest[];
    stores: DemoPxStore[];
    icons: Record<string, string>;
}

export interface DemoPxSeries {
    range: string; cpu: number[]; mem: number[]; points: number; raw: number;
}

const GiB = 1024 * 1024 * 1024;

/** The machine the demo leaves stopped, so the page has something to explain. */
export const DEMO_STOPPED_VMID = 106;

/** Which range maps to how many raw points, matching a real host. */
const RAW_POINTS: Record<string, number> = { '1h': 60, '24h': 1440, '7d': 336 };

interface Seed { vmid: number; name: string; kind: 'lxc' | 'qemu'; cpu: number; mem: number; total: number }

/**
 * The machines the demo board runs, chosen to match its bookmarks: what makes
 * the page worth looking at is that these names are the same ones on the tiles.
 */
const GUESTS: Seed[] = [
    { vmid: 100, name: 'jellyfin', kind: 'lxc', cpu: 12, mem: 2.1, total: 4 },
    { vmid: 101, name: 'nextcloud', kind: 'lxc', cpu: 4, mem: 1.8, total: 4 },
    { vmid: 102, name: 'home-assistant', kind: 'qemu', cpu: 9, mem: 2.9, total: 4 },
    { vmid: 103, name: 'pihole', kind: 'lxc', cpu: 1, mem: 0.2, total: 1 },
    { vmid: 104, name: 'forgejo', kind: 'lxc', cpu: 2, mem: 0.9, total: 2 },
    { vmid: 105, name: 'immich', kind: 'qemu', cpu: 38, mem: 7.8, total: 12 },
    // The load it had before it stopped, and the load it gets back when a
    // visitor starts it: a machine that comes up at 0% looks like a button
    // that did nothing.
    { vmid: DEMO_STOPPED_VMID, name: 'plex', kind: 'lxc', cpu: 8, mem: 1.7, total: 4 },
    { vmid: 107, name: 'vaultwarden', kind: 'lxc', cpu: 1, mem: 0.3, total: 1 },
    { vmid: 108, name: 'paperless', kind: 'lxc', cpu: 6, mem: 1.4, total: 3 },
    { vmid: 109, name: 'uptime-kuma', kind: 'lxc', cpu: 3, mem: 0.6, total: 1 },
];

/**
 * A repeatable wobble in [-1, 1]. The same machine at the same minute always
 * drifts the same way, so a refresh does not make the numbers jump about.
 */
function wobble(seed: number, step: number): number {
    const x = Math.sin(seed * 12.9898 + step * 78.233) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Machines the demo has started or stopped during this visit. */
const overrides = new Map<number, boolean>();

export function setRunning(vmid: number, running: boolean): void {
    overrides.set(vmid, running);
}

export function isRunning(vmid: number): boolean {
    const forced = overrides.get(vmid);
    if (forced !== undefined) return forced;
    return vmid !== DEMO_STOPPED_VMID;
}

/** Icons a visitor chose during this visit, keyed "node|vmid". */
const icons = new Map<string, string>();

export function setDemoIcon(node: string, vmid: number, icon: string): void {
    if (icon) icons.set(`${node}|${vmid}`, icon);
    else icons.delete(`${node}|${vmid}`);
}

export function demoIcons(): Record<string, string> {
    return Object.fromEntries(icons);
}

export function resetDemoProxmox(): void {
    overrides.clear();
    icons.clear();
}

export function buildOverview(now: number = Date.now()): DemoPxOverview {
    const minute = Math.floor(now / 60000);

    const guests: DemoPxGuest[] = GUESTS.map((g) => {
        const running = isRunning(g.vmid);
        const cpu = running ? clamp(round1(g.cpu + wobble(g.vmid, minute) * Math.max(1, g.cpu * 0.25)), 0, 100) : 0;
        const mem = running ? g.mem * GiB * (1 + wobble(g.vmid + 7, minute) * 0.04) : 0;
        return {
            vmid: g.vmid,
            name: g.name,
            kind: g.kind,
            node: 'pve',
            running,
            cpu,
            mem: Math.round(mem),
            mem_total: g.total * GiB,
            uptime: running ? 60 * 60 * 24 * 16 + g.vmid * 37 : 0,
        };
    });

    const running = guests.filter((g) => g.running);
    const nodeCpu = clamp(round1(running.reduce((a, g) => a + g.cpu, 0) / 10 + 4), 0, 100);
    const nodeMemUsed = running.reduce((a, g) => a + g.mem, 0) + 3.2 * GiB;
    const nodeMemTotal = 32 * GiB;

    const nodes: DemoPxNode[] = [{
        name: 'pve',
        status: 'online',
        cpu: nodeCpu,
        mem: round1((nodeMemUsed / nodeMemTotal) * 100),
        disk: 41.2,
        threads: 16,
        cores: 8,
        mem_total: nodeMemTotal,
        uptime: 60 * 60 * 24 * 42,
        loadavg: [round1(0.6 + wobble(1, minute) * 0.3).toFixed(2), '0.71', '0.68'],
        guests: guests.length,
    }];

    const stores: DemoPxStore[] = [
        { name: 'local', node: 'pve', kind: 'dir', used: 18 * GiB, total: 94 * GiB, percent: 19.1, shared: false },
        { name: 'local-lvm', node: 'pve', kind: 'lvmthin', used: 402 * GiB, total: 890 * GiB, percent: 45.2, shared: false },
        { name: 'tank', node: 'pve', kind: 'zfspool', used: 6963 * GiB, total: 11162 * GiB, percent: 62.4, shared: false },
        // Deliberately nearly full: a storage bar that never turns red teaches
        // nobody what a full one looks like.
        { name: 'backups', node: 'pve', kind: 'pbs', used: 3973 * GiB, total: 4096 * GiB, percent: 97.0, shared: true },
    ];

    return {
        cluster: false,
        // The demo shows the buttons, so the page can be tried in full.
        caps: { read: true, power: true },
        nodes,
        guests,
        stores,
        icons: demoIcons(),
    };
}

/**
 * A series shaped like the one Proxmox keeps, already resampled to the sixty
 * points the server would have cut it down to.
 */
export function buildSeries(range: string, vmid?: number, now: number = Date.now()): DemoPxSeries {
    const raw = RAW_POINTS[range] ?? 60;
    const minute = Math.floor(now / 60000);
    const seed = vmid ?? 1;
    const base = vmid ? (GUESTS.find((g) => g.vmid === vmid)?.cpu ?? 5) : 14;
    const stopped = vmid !== undefined && !isRunning(vmid);

    const cpu: number[] = [];
    const mem: number[] = [];
    for (let i = 0; i < 60; i++) {
        // A stopped machine's line falls to the floor partway through and stays
        // there, which is what its history actually looks like.
        const dead = stopped && i > 28;
        cpu.push(dead ? 0 : clamp(round1(base + wobble(seed, minute - 60 + i) * Math.max(2, base * 0.45)), 0, 100));
        mem.push(dead ? 0 : clamp(round1(46 + wobble(seed + 3, minute - 60 + i) * 6), 0, 100));
    }

    return { range, cpu, mem, points: 60, raw };
}
