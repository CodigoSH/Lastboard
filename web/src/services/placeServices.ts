import { collisionService } from './collisionService';
import { GRID_MAX } from './importPlan';

/**
 * Where the services a person ticked go on a board that already has things on it.
 *
 * Pure geometry on purpose: it says what would be created and where, and the
 * caller sends it. A section that already carries the host's name takes the new
 * bookmarks into its free cells; it grows only when nothing sits in the way, and
 * when it cannot, a new section with the same title is made instead — never two
 * things on the same cells.
 */

export interface BoardItem {
    id: number;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    parent_id?: number | null;
    content: string;
}

/** A section to put on the board, with its bookmarks laid out inside it (as `planImport` lays them out). */
export interface SectionToPlace<T> {
    title: string;
    w: number;
    h: number;
    items: (T & { x: number; y: number })[];
}

export interface Placed<T> { x: number; y: number; item: T }

export type Placement<T> =
    | { kind: 'new'; title: string; x: number; y: number; w: number; h: number; items: Placed<T>[] }
    | { kind: 'into'; sectionId: number; title: string; oldH: number; newH: number | null; items: Placed<T>[] };

interface Rect { x: number; y: number; w: number; h: number }

function sectionTitle(item: BoardItem): string {
    try {
        const c = JSON.parse(item.content);
        return typeof c?.title === 'string' ? c.title.trim().toLowerCase() : '';
    } catch {
        return '';
    }
}

const rectOf = (i: { x: number; y: number; w?: number; h?: number }): Rect => ({ x: i.x, y: i.y, w: i.w || 1, h: i.h || 1 });

export function planPlacement<T>(sections: SectionToPlace<T>[], board: BoardItem[], gridCols: number): Placement<T>[] {
    const cols = Math.max(1, Math.min(gridCols || 12, GRID_MAX));
    // What is on the board's own grid, plus what this very run has already put there.
    const topLevel: (Rect & { id?: number })[] = board.filter(i => i.parent_id == null).map(i => ({ ...rectOf(i), id: i.id }));
    const taken = new Set<number>(); // sections already used in this run, so two titles cannot share one
    const out: Placement<T>[] = [];

    for (const sec of sections) {
        const title = sec.title.trim().toLowerCase();
        const existing = board.find(i => i.type === 'section' && i.parent_id == null && !taken.has(i.id) && sectionTitle(i) === title);

        if (existing) {
            const inside: Rect[] = board.filter(i => i.parent_id === existing.id).map(rectOf);
            const placed: Placed<T>[] = [];
            let bottom = existing.h;
            for (const it of sec.items) {
                const slot = collisionService.findAvailableSlot(1, 1, inside, existing.w);
                inside.push({ x: slot.x, y: slot.y, w: 1, h: 1 });
                placed.push({ x: slot.x, y: slot.y, item: it });
                bottom = Math.max(bottom, slot.y);
            }
            let newH: number | null = null;
            let fits = true;
            if (bottom > existing.h) {
                const grown = { x: existing.x, y: existing.y, w: existing.w, h: bottom };
                fits = bottom <= GRID_MAX && !topLevel.some(r => r.id !== existing.id && collisionService.isOverlap(grown, r));
                newH = fits ? bottom : null;
            }
            if (fits) {
                taken.add(existing.id);
                if (newH != null) {
                    const at = topLevel.find(r => r.id === existing.id);
                    if (at) at.h = newH;
                }
                out.push({ kind: 'into', sectionId: existing.id, title: sec.title, oldH: existing.h, newH, items: placed });
                continue;
            }
        }

        const slot = collisionService.findCompactPosition(sec.w, sec.h, topLevel as never, cols);
        topLevel.push({ x: slot.x, y: slot.y, w: sec.w, h: sec.h });
        out.push({ kind: 'new', title: sec.title, x: slot.x, y: slot.y, w: sec.w, h: sec.h, items: sec.items.map(it => ({ x: it.x, y: it.y, item: it })) });
    }
    return out;
}
