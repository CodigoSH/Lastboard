/**
 * What the inventory of an infrastructure page does with its items, whatever
 * they are — containers or machines: filter by what was typed and by state,
 * group, sort and count. Pure, so every rule can be read and tested without a
 * DOM, and so the two pages cannot disagree about what "with warnings" means.
 */

export type UnitLevel = 'up' | 'warn' | 'off';
export type StatusFilter = 'all' | 'up' | 'off' | 'warn';
export type SortKey = 'name' | 'state' | 'cpu' | 'mem';

/** One item of an inventory, reduced to what filtering and ordering need. */
export interface InfraUnit {
    id: string;
    name: string;
    level: UnitLevel;
    /** Needs looking at: unhealthy, restarting, failed. Independent of whether it runs. */
    attention: boolean;
    /** The group it falls under when grouped by something; empty means none. */
    group: string;
    /** Everything a search may match, lower-cased. */
    haystack: string;
    cpu?: number;
    mem?: number;
}

export const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'up', 'off', 'warn'];
export const SORT_KEYS: readonly SortKey[] = ['name', 'state', 'cpu', 'mem'];

export function isStatusFilter(v: unknown): v is StatusFilter {
    return typeof v === 'string' && (STATUS_FILTERS as readonly string[]).includes(v);
}

export function isSortKey(v: unknown): v is SortKey {
    return typeof v === 'string' && (SORT_KEYS as readonly string[]).includes(v);
}

/** Whether a unit passes the typed text and the chosen state chip. */
export function passes(u: InfraUnit, query: string, status: StatusFilter): boolean {
    const q = query.trim().toLowerCase();
    if (q && !u.haystack.includes(q)) return false;
    switch (status) {
        case 'up': return u.level === 'up';
        case 'off': return u.level === 'off';
        case 'warn': return u.attention;
        default: return true;
    }
}

const RANK: Record<UnitLevel, number> = { warn: 0, up: 1, off: 2 };

/** A new array, ordered. Ties always fall back to the name so the order is stable. */
export function sortUnits(list: InfraUnit[], key: SortKey): InfraUnit[] {
    const byName = (a: InfraUnit, b: InfraUnit) => a.name.localeCompare(b.name);
    const desc = (get: (u: InfraUnit) => number | undefined) => (a: InfraUnit, b: InfraUnit) =>
        (get(b) ?? -1) - (get(a) ?? -1) || byName(a, b);
    const cmp = key === 'state' ? (a: InfraUnit, b: InfraUnit) => RANK[a.level] - RANK[b.level] || byName(a, b)
        : key === 'cpu' ? desc(u => u.cpu)
            : key === 'mem' ? desc(u => u.mem)
                : byName;
    return [...list].sort(cmp);
}

export interface UnitGroup { name: string; units: InfraUnit[] }

/**
 * The units in groups, in the order they first appear. A unit with no group goes
 * in one nameless group, drawn last, so "no project" does not sort among names.
 */
export function groupUnits(list: InfraUnit[], grouped: boolean): UnitGroup[] {
    if (!grouped) return [{ name: '', units: list }];
    const map = new Map<string, InfraUnit[]>();
    for (const u of list) {
        const arr = map.get(u.group);
        if (arr) arr.push(u); else map.set(u.group, [u]);
    }
    const named = [...map.keys()].filter(k => k !== '').sort((a, b) => a.localeCompare(b));
    const out = named.map(name => ({ name, units: map.get(name)! }));
    if (map.has('')) out.push({ name: '', units: map.get('')! });
    return out;
}

export interface UnitCounts { all: number; up: number; off: number; warn: number }

/** How many units each chip would show, for the numbers on the chips. */
export function countUnits(list: InfraUnit[]): UnitCounts {
    const c: UnitCounts = { all: list.length, up: 0, off: 0, warn: 0 };
    for (const u of list) {
        if (u.level === 'up') c.up++;
        if (u.level === 'off') c.off++;
        if (u.attention) c.warn++;
    }
    return c;
}
