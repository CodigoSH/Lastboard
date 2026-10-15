import { containerName, shortId, type ContainerCfgEntry, type DockerContainer } from './dockerShared';
import { arrangeBy, mergeOrder } from './rowOrder';

/**
 * Which containers a Docker widget shows, in what order, and what is set on each.
 *
 * Pure, and shared by the widget that draws the list and the config screen that
 * edits it, so the two cannot disagree about what a saved setting means.
 */

/** What the widget's content stores about its containers. */
export interface ContainerSettings {
    /** Per-container presentation, by {@link containerKey}. Old content has it by short id. */
    containerConfig?: Record<string, ContainerCfgEntry>;
    /** The order of each host's containers, by name. A container not named here comes after. */
    containerOrder?: Record<string, string[]>;
    /** A container nobody has chosen is shown. Only `false` turns that off. */
    showNew?: boolean;
}

/**
 * The key a container's settings are stored under: its host and its name.
 *
 * Not its id. A container's id changes every time it is recreated — which is
 * what updating one is — so a setting kept by id was lost with each update: a
 * container somebody had hidden came back, and with it its name and address.
 * A name survives that. A slash cannot be part of a Docker name, so the key
 * cannot be taken for an old short id, which never contains one.
 */
export function containerKey(hostId: string, c: DockerContainer): string {
    return `${hostId}/${containerName(c)}`;
}

/**
 * What is set on a container. Content saved by an earlier version holds it under
 * the short id; it is read from there until the config screen is saved again and
 * writes it under the key, so nobody has to touch anything for it to keep working.
 */
export function entryOf(settings: ContainerSettings, hostId: string, c: DockerContainer): ContainerCfgEntry {
    const cfg = settings.containerConfig || {};
    return cfg[containerKey(hostId, c)] ?? cfg[shortId(c.ID)] ?? {};
}

/** Whether a container nobody has chosen is shown. On unless it was switched off. */
export function showsNew(settings: ContainerSettings): boolean {
    return settings.showNew !== false;
}

/**
 * Whether a container is on the widget.
 *
 * With new ones shown, a container is shown unless it was hidden. With that off
 * the meaning flips: a container is shown only if somebody chose it, which the
 * config screen writes as `hidden: false`. One that has never been seen is not.
 */
export function isShown(settings: ContainerSettings, hostId: string, c: DockerContainer): boolean {
    const entry = entryOf(settings, hostId, c);
    return showsNew(settings) ? !entry.hidden : entry.hidden === false;
}

/**
 * A host's containers in the order that was chosen for it. A name that is not in
 * the order — a container that did not exist when it was set — goes after the
 * ones that are, in the order the host listed them.
 */
export function inChosenOrder(containers: DockerContainer[], order: string[] | undefined): DockerContainer[] {
    return arrangeBy(containers, containerName, order);
}

/**
 * The order to store after the config screen was saved: the names as the list
 * stood, then any name that was stored before and is not on the list now. A
 * container that is down for a while keeps a place in the order for when it is
 * back, instead of being forgotten.
 */
export function mergedOrder(listed: string[], stored: string[] | undefined): string[] {
    return mergeOrder(listed, stored);
}

/** What the config screen read off one container's row. */
export interface ContainerRow {
    key: string;
    /** The short id earlier versions stored the row's settings under. */
    sid: string;
    visible: boolean;
    label: string;
    url: string;
}

/**
 * The container settings after the config screen is saved.
 *
 * Starts from what is stored, so a host that did not answer — and drew no rows —
 * keeps its containers' names and addresses. Each row carries over what an earlier
 * version stored under the short id and writes it under the key, so from here on
 * the setting follows the container's name and not its id.
 *
 * With new containers shown, hidden is the exception and visible is the absence of
 * a mark. With them off the meaning flips, so a container somebody wants has to say
 * so, with an explicit `hidden: false`.
 */
export function settleRows(
    stored: Record<string, ContainerCfgEntry> | undefined,
    rows: ContainerRow[],
    showNew: boolean,
): Record<string, ContainerCfgEntry> {
    const cfg: Record<string, ContainerCfgEntry> = { ...(stored || {}) };
    for (const row of rows) {
        const entry: ContainerCfgEntry = { ...(cfg[row.key] ?? cfg[row.sid] ?? {}) };
        if (row.sid) delete cfg[row.sid];
        if (row.label) entry.label = row.label; else delete entry.label;
        // Only an explicit address is stored. An empty field means the widget keeps
        // deriving one, so it follows the container.
        if (row.url) entry.url = row.url; else delete entry.url;
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
 * The order to store for every host that has rows on the screen: the names as they
 * stand, merged with what was stored. A host with no rows — one that did not answer —
 * keeps the order it had.
 */
export function settleOrder(
    stored: Record<string, string[]> | undefined,
    shown: Record<string, string[]>,
): Record<string, string[]> | undefined {
    const order: Record<string, string[]> = { ...(stored || {}) };
    for (const [hostId, names] of Object.entries(shown)) {
        if (names.length) order[hostId] = mergedOrder(names, order[hostId]);
    }
    return Object.keys(order).length ? order : undefined;
}
