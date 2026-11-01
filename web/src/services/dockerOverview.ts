import { containerName, type DockerContainer, type DockerHost } from './dockerShared';
import { stateLevel, type ContainerStats, type HostRows } from './dockerPage';
import type { InfraUnit } from './infraUnits';

/**
 * What the Docker overview shows that is a rule and not a drawing: which
 * containers need looking at and why, the totals of the four indicators, and
 * the history the chart keeps for the session.
 */

/** Why a container is on the attention list. */
export type AttentionReason = 'unhealthy' | 'restarting' | 'failed' | 'paused';

export interface AttentionItem {
    hostId: string;
    name: string;
    reason: AttentionReason;
    exitCode?: number;
}

/**
 * The reason a container needs looking at, or null. A container that was
 * stopped on purpose (exit code 0) or has never run is not a warning; one that
 * ended with an error, keeps restarting, or fails its own check is.
 */
export function attentionReason(c: DockerContainer): AttentionReason | null {
    const state = (c.State || c.Status || '').toLowerCase();
    if (c.Health === 'unhealthy') return 'unhealthy';
    if (state === 'restarting') return 'restarting';
    if (state === 'paused') return 'paused';
    if (stateLevel(state) === 'off' && typeof c.ExitCode === 'number' && c.ExitCode !== 0) return 'failed';
    return null;
}

/** The attention list across hosts, the worst first: failing checks, then restarts, then the rest. */
export function attentionList(all: HostRows[]): AttentionItem[] {
    const order: Record<AttentionReason, number> = { unhealthy: 0, restarting: 1, failed: 2, paused: 3 };
    const out: AttentionItem[] = [];
    for (const h of all) {
        for (const c of h.containers) {
            const reason = attentionReason(c);
            if (!reason) continue;
            out.push({ hostId: h.host.id, name: containerName(c), reason, exitCode: c.ExitCode ?? undefined });
        }
    }
    return out.sort((a, b) => order[a.reason] - order[b.reason] || a.name.localeCompare(b.name));
}

/** The inventory units, one per container, over every host that answered. */
export function dockerUnits(all: HostRows[], stats: Record<string, ContainerStats> = {}): InfraUnit[] {
    const units: InfraUnit[] = [];
    for (const h of all) {
        for (const c of h.containers) {
            const name = containerName(c);
            const s = stats[c.ID];
            units.push({
                id: `${h.host.id}/${name}`,
                name,
                level: stateLevel(c.State || c.Status),
                attention: attentionReason(c) !== null,
                group: c.Project || '',
                haystack: `${name} ${c.Image || ''} ${c.Project || ''} ${(c.ID || '').slice(0, 12)} ${h.host.name}`.toLowerCase(),
                cpu: s?.CPUPercent,
                mem: s?.MemUsed,
            });
        }
    }
    return units;
}

export interface DockerTotals {
    total: number;
    running: number;
    stopped: number;
    attention: number;
    projects: number;
    /** CPU in use across the containers that reported, in cores (100 % = one core). */
    cores: number;
    memUsed: number;
    /** The largest limit any container reported; 0 when none has one. */
    memLimit: number;
    /** How many containers reported stats at all. */
    reporting: number;
}

export function dockerTotals(all: HostRows[], stats: Record<string, ContainerStats> = {}): DockerTotals {
    const t: DockerTotals = { total: 0, running: 0, stopped: 0, attention: 0, projects: 0, cores: 0, memUsed: 0, memLimit: 0, reporting: 0 };
    const projects = new Set<string>();
    for (const h of all) {
        for (const c of h.containers) {
            t.total++;
            if (stateLevel(c.State || c.Status) === 'up') t.running++; else t.stopped++;
            if (attentionReason(c)) t.attention++;
            if (c.Project) projects.add(`${h.host.id}/${c.Project}`);
            const s = stats[c.ID];
            if (s) {
                t.reporting++;
                t.cores += (s.CPUPercent || 0) / 100;
                t.memUsed += s.MemUsed || 0;
                t.memLimit = Math.max(t.memLimit, s.MemLimit || 0);
            }
        }
    }
    t.projects = projects.size;
    return t;
}

/** The projects of one host, with how many of their containers are up. */
export interface ProjectRow { host: DockerHost; name: string; running: number; total: number }

export function projectRows(all: HostRows[]): ProjectRow[] {
    const out: ProjectRow[] = [];
    for (const h of all) {
        const map = new Map<string, ProjectRow>();
        for (const c of h.containers) {
            if (!c.Project) continue;
            const row = map.get(c.Project) ?? { host: h.host, name: c.Project, running: 0, total: 0 };
            row.total++;
            if (stateLevel(c.State || c.Status) === 'up') row.running++;
            map.set(c.Project, row);
        }
        out.push(...[...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return out;
}

// ── The session history ────────────────────────────────────────────────────

/** One reading of the totals, for the chart. */
export interface HistoryPoint { t: number; cores: number; memUsed: number; running: number }

/** About half an hour at the page's own ten-second refresh. */
export const HISTORY_MAX = 180;

/**
 * The history after a reading: appended, and no longer than `max` — the oldest
 * fall off. A reading older than the last is dropped, so a slow answer that
 * arrives late cannot fold the line back on itself.
 */
export function pushHistory(history: HistoryPoint[], p: HistoryPoint, max = HISTORY_MAX): HistoryPoint[] {
    const last = history[history.length - 1];
    if (last && p.t <= last.t) return history;
    const all = history.concat(p);
    return all.length > max ? all.slice(all.length - max) : all;
}

// ── Figures ────────────────────────────────────────────────────────────────

export type ByteUnit = 'byte' | 'kilobyte' | 'megabyte' | 'gigabyte' | 'terabyte';

const BYTE_UNITS: ByteUnit[] = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];

/** A size in the largest unit it fills, in steps of 1024 as the daemon counts. */
export function byteUnit(n: number): { value: number; unit: ByteUnit } {
    let value = Number.isFinite(n) && n > 0 ? n : 0;
    let i = 0;
    while (value >= 1024 && i < BYTE_UNITS.length - 1) { value /= 1024; i++; }
    return { value, unit: BYTE_UNITS[i] };
}

/**
 * The top of a chart's axis: the smallest round figure (1, 2, 5 times a power of ten)
 * above the readings with a little room, and never so small that a quiet host draws a
 * wall.
 */
export function niceMax(highest: number, floor = 0.5): number {
    const target = Math.max(floor, (Number.isFinite(highest) ? highest : 0) * 1.2);
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    for (const step of [1, 2, 5, 10]) {
        if (step * pow >= target) return step * pow;
    }
    return 10 * pow;
}
