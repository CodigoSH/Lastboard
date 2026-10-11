import type { Dashboard } from '../../../types';

/**
 * The list the manager shows while it is open, kept in step with the store.
 *
 * Renaming or deleting a dashboard changes the store at once, while the order
 * being arranged here is only saved with the button. So the list the person is
 * dragging is theirs, and the store only corrects what it must: names and flags
 * come from the store, a dashboard that no longer exists drops out, and nothing
 * is moved. Anything the store has that the list does not (it cannot happen from
 * this window, but a second tab could) goes to the end.
 */
export function syncOrder(local: Dashboard[], store: Dashboard[]): Dashboard[] {
    const current = new Map(store.map(d => [d.id, d]));
    const kept = local.filter(d => current.has(d.id)).map(d => current.get(d.id)!);
    const known = new Set(kept.map(d => d.id));
    const added = store.filter(d => !known.has(d.id)).sort((a, b) => a.position - b.position);
    return [...kept, ...added];
}

/** The only dashboard cannot be deleted: the board would have nowhere to open. */
export function canDeleteDashboard(count: number): boolean {
    return count > 1;
}
