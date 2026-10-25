import { arrangeBy, mergeOrder } from './rowOrder';

/**
 * Which machines a Proxmox widget shows, in what order, and what is set on each.
 *
 * The same settings the Docker widget keeps for its containers, kept the same
 * way: pure, and shared by the widget that draws the list and the config screen
 * that edits it, so the two cannot disagree about what a saved setting means.
 * Dependency-free on purpose, so a test can import it without the network
 * client that proxmoxApi brings along.
 */

/** What is set on one machine. */
export interface GuestCfgEntry {
    /** Whether the tile leaves it out. Only meaningful together with {@link GuestSettings.showNew}. */
    hidden?: boolean;
    /** A name to show instead of the one the hypervisor gives it. */
    label?: string;
}

/** What the widget's content stores about its machines. */
export interface GuestSettings {
    /** Per-machine presentation, by {@link guestKey}. */
    guestConfig?: Record<string, GuestCfgEntry>;
    /** The order of each hypervisor's machines, by id. A machine not named here comes after. */
    guestOrder?: Record<string, string[]>;
    /** A machine nobody has chosen is shown. Only `false` turns that off. */
    showNew?: boolean;
}

/**
 * The key a machine's settings are stored under: its hypervisor and its id.
 *
 * Not its node. A machine moves between the nodes of a cluster, and a setting
 * kept by node was lost the day it was migrated. The id is what Proxmox keeps
 * for the life of the machine, and is unique within a cluster; the hypervisor
 * tells two clusters apart, which may well both have a machine 100.
 */
export function guestKey(hostId: string, vmid: number): string {
    return `${hostId}/${vmid}`;
}

/** What is set on a machine. */
export function guestEntry(settings: GuestSettings, hostId: string, vmid: number): GuestCfgEntry {
    return settings.guestConfig?.[guestKey(hostId, vmid)] ?? {};
}

/** Whether a machine nobody has chosen is shown. On unless it was switched off. */
export function showsNewGuests(settings: GuestSettings): boolean {
    return settings.showNew !== false;
}

/**
 * Whether a machine is on the tile.
 *
 * With new ones shown, a machine is shown unless it was hidden. With that off the
 * meaning flips: a machine is shown only if somebody chose it, which the config
 * screen writes as `hidden: false`. One that has never been seen is not.
 */
export function isGuestShown(settings: GuestSettings, hostId: string, vmid: number): boolean {
    const entry = guestEntry(settings, hostId, vmid);
    return showsNewGuests(settings) ? !entry.hidden : entry.hidden === false;
}

/** What a machine is called on the tile: the name somebody gave it here, or its own. */
export function guestLabel(settings: GuestSettings, hostId: string, vmid: number, name: string): string {
    return guestEntry(settings, hostId, vmid).label || name;
}

/**
 * A hypervisor's machines in the order that was chosen for it. A machine that is
 * not in the order — one that did not exist when it was set — goes after the ones
 * that are, in the order the hypervisor listed them.
 */
export function inGuestOrder<T extends { vmid: number }>(guests: T[], order: string[] | undefined): T[] {
    return arrangeBy(guests, g => String(g.vmid), order);
}

/** Whether anybody has arranged any hypervisor's machines. */
export function hasChosenOrder(settings: GuestSettings): boolean {
    return Object.values(settings.guestOrder || {}).some(order => order.length > 0);
}

/**
 * The machines the tile may draw: those that are on it, and, once somebody has
 * arranged them, in the order they chose — hypervisors in the order they were
 * connected, each one's machines in its own order. Before anyone has, the order
 * is left to the caller, who knows which machines need attention first.
 */
export function visibleGuests<T extends { vmid: number; host: string }>(
    settings: GuestSettings,
    guests: T[],
): T[] {
    const on = guests.filter(g => isGuestShown(settings, g.host, g.vmid));
    if (!hasChosenOrder(settings)) return on;
    const hostIds: string[] = [];
    for (const g of on) if (!hostIds.includes(g.host)) hostIds.push(g.host);
    return hostIds.flatMap(id => inGuestOrder(on.filter(g => g.host === id), settings.guestOrder?.[id]));
}

/** What the config screen read off one machine's row. */
export interface GuestRow {
    key: string;
    visible: boolean;
    label: string;
}

/**
 * The machine settings after the config screen is saved.
 *
 * Starts from what is stored, so a hypervisor that did not answer — and drew no
 * rows — keeps its machines' names. With new machines shown, hidden is the
 * exception and visible is the absence of a mark. With them off the meaning flips,
 * so a machine somebody wants has to say so, with an explicit `hidden: false`.
 */
export function settleGuests(
    stored: Record<string, GuestCfgEntry> | undefined,
    rows: GuestRow[],
    showNew: boolean,
): Record<string, GuestCfgEntry> {
    const cfg: Record<string, GuestCfgEntry> = { ...(stored || {}) };
    for (const row of rows) {
        const entry: GuestCfgEntry = { ...(cfg[row.key] ?? {}) };
        if (row.label) entry.label = row.label; else delete entry.label;
        if (!row.visible) entry.hidden = true;
        else if (showNew) delete entry.hidden;
        else entry.hidden = false;
        // Don't keep an entry that no longer says anything.
        if (Object.keys(entry).length) cfg[row.key] = entry;
        else delete cfg[row.key];
    }
    return cfg;
}

/**
 * The ids to store as one hypervisor's order, or none when nobody arranged them.
 *
 * Saving the screen writes down the rows as they stand, and for a hypervisor nobody
 * touched that is just the order Proxmox listed them in. Stored, it would count as
 * an arrangement — and the tile, which puts what needs attention first until
 * somebody has chosen otherwise, would stop doing that the moment anything at all
 * was saved here, such as hiding a single machine. So an order that is only the
 * natural one is not stored, unless one was already stored: then it is what the
 * person put it back to.
 */
export function arrangedIds(current: string[], natural: string[], stored: string[] | undefined): string[] {
    const same = current.length === natural.length && current.every((id, i) => id === natural[i]);
    return same && !(stored && stored.length) ? [] : current;
}

/**
 * The order to store for every hypervisor that has rows on the screen: the ids as
 * they stand, merged with what was stored. One with no rows — one that did not
 * answer — keeps the order it had. A machine that is stopped, or gone for a while,
 * keeps its place for when it is back.
 */
export function settleGuestOrder(
    stored: Record<string, string[]> | undefined,
    shown: Record<string, string[]>,
): Record<string, string[]> | undefined {
    const order: Record<string, string[]> = { ...(stored || {}) };
    for (const [hostId, ids] of Object.entries(shown)) {
        if (ids.length) order[hostId] = mergeOrder(ids, order[hostId]);
    }
    return Object.keys(order).length ? order : undefined;
}
