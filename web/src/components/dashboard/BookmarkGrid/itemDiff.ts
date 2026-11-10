import type { GridItem } from '../../../types';

/**
 * What changed between the items the board drew and the ones the store holds now.
 *
 * The status system answers every few seconds and only ever changes `status`. Redrawing the whole board for
 * that would wipe the DOM — a menu held open, a widget in the middle of a reading — so the board tells the two
 * apart: a structural change (an item appeared, went, moved, was resized, was rewritten) needs the full
 * redraw; a change of status alone only needs its dot repainted.
 */
export interface ItemDiff {
    structural: boolean;
    /** At least one item's status differs. Also true next to `structural`, which then wins. */
    statusOnly: boolean;
}

export function diffItems(before: GridItem[], after: GridItem[]): ItemDiff {
    if (before.length !== after.length) return { structural: true, statusOnly: false };

    let statusOnly = false;
    for (let i = 0; i < after.length; i++) {
        const a = before[i];
        const b = after[i];

        if (a.id !== b.id ||
            a.x !== b.x ||
            a.y !== b.y ||
            a.w !== b.w ||
            a.h !== b.h ||
            a.parent_id !== b.parent_id ||
            a.content !== b.content ||
            a.mobile_order !== b.mobile_order) {
            return { structural: true, statusOnly };
        }

        if (a.status !== b.status) statusOnly = true;
    }
    return { structural: false, statusOnly };
}
