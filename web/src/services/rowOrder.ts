/**
 * Putting a list in an order somebody chose, for the lists a widget lets you arrange
 * (Docker's containers, Monitoring's services). Pure, so the widget that draws the
 * list and the screen that edits it agree on what the saved order means.
 */

/**
 * The items in the chosen order. An item the order does not know — one that did not
 * exist when it was set — goes after the ones it does, in the order it was listed;
 * a key in the order that matches nothing, or is repeated, is ignored.
 */
export function arrangeBy<T, K>(items: T[], keyOf: (item: T) => K, order: K[] | undefined): T[] {
    if (!order || order.length === 0) return items;
    const place = new Map<K, number>();
    order.forEach((key, i) => { if (!place.has(key)) place.set(key, i); });
    const last = order.length;
    return items
        .map((item, listed) => ({ item, listed, at: place.get(keyOf(item)) ?? last }))
        .sort((a, b) => a.at - b.at || a.listed - b.listed)
        .map(x => x.item);
}

/**
 * The order to store after the settings were saved: the keys as the list stood, then
 * any key that was stored before and is not on the list now. Something that is gone
 * for a while keeps its place for when it is back, instead of being forgotten.
 */
export function mergeOrder<K>(listed: K[], stored: K[] | undefined): K[] {
    const seen = new Set(listed);
    return [...listed, ...(stored || []).filter(key => !seen.has(key))];
}
