import { arrangeBy } from './rowOrder';

/** What the Monitoring widget needs to know about a service to place it. */
export interface ServiceRef {
    item_id: number;
}

/**
 * The services a Monitoring widget draws, in order.
 *
 * `items` is the selection, and empty means every monitored service — which is what
 * lets a service added later appear on its own. When it names some, they are shown
 * in the order the array lists them, as they always were; one that no longer exists
 * is skipped. `order` is the arrangement on top of that: it is kept apart from the
 * selection so that arranging "everything" does not turn it into a list of ids that
 * stops taking new services.
 */
export function chooseServices<T extends ServiceRef>(rows: T[], items: number[], order: number[] | undefined): T[] {
    let base = rows;
    if (items.length) {
        const byId = new Map(rows.map(r => [r.item_id, r]));
        base = items.map(id => byId.get(id)).filter((r): r is T => !!r);
    }
    return arrangeBy(base, r => r.item_id, order);
}
