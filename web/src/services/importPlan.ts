/**
 * Where an import puts things.
 *
 * Pure on purpose: it touches no store and no network, so a test can ask what
 * it would create. That is what was missing when every import failed — the
 * layout was computed and sent in one step, with coordinates counted from 0 to
 * a server that accepts them from 1, and nothing had ever looked at the numbers.
 */

export interface PlanItem {
    title: string;
    url: string;
    icon?: string;
    description?: string;
    status_check?: boolean;
}

export interface PlanSection {
    title: string;
    x: number; y: number; w: number; h: number;
    items: (PlanItem & { x: number; y: number })[];
}

export interface PlanDashboard {
    name: string;
    sections: PlanSection[];
}

/** The range the server accepts for a position or size. Counting starts at 1. */
export const GRID_MIN = 1;
export const GRID_MAX = 100;

export class ImportTooLargeError extends Error {
    constructor() {
        super('import.too_large');
        this.name = 'ImportTooLargeError';
    }
}

interface SourceDashboard { name: string; items: (PlanItem & { group?: string })[]; }

/**
 * One section per group, in the order the groups first appear, with the
 * bookmarks laid out inside. Sections go side by side across the board and
 * start a new band when the row is full — a long list of groups would
 * otherwise run down a single column and past the bottom edge the server allows.
 *
 * Throws ImportTooLargeError before anything is created when a layout cannot
 * fit: refusing is better than a board that is half there.
 */
export function planImport(
    dashboards: SourceDashboard[],
    gridCols: number,
    ungroupedLabel: string,
): PlanDashboard[] {
    const cols = Math.max(2, Math.min(gridCols || 12, GRID_MAX));
    const sectionW = Math.max(2, Math.min(cols, 4));
    const perBand = Math.max(1, Math.floor(cols / sectionW));

    const plans: PlanDashboard[] = [];
    for (const nd of dashboards) {
        if (!nd.items || nd.items.length === 0) continue;

        // Group items, preserving first-seen order.
        const groups = new Map<string, PlanItem[]>();
        for (const it of nd.items) {
            const g = ((it as { group?: string }).group || '').trim() || ungroupedLabel;
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g)!.push(it);
        }

        const sections: PlanSection[] = [];
        let bandY = GRID_MIN;
        let bandHeight = 0;
        let inBand = 0;
        for (const [title, its] of groups) {
            if (inBand === perBand) {
                // A blank row between bands: a section's name sits on its top edge.
                bandY += bandHeight + 1;
                bandHeight = 0;
                inBand = 0;
            }
            const rows = Math.max(1, Math.ceil(its.length / sectionW));
            sections.push({
                title,
                x: GRID_MIN + inBand * sectionW,
                y: bandY,
                w: sectionW,
                h: rows,
                items: its.map((it, k) => ({
                    ...it,
                    x: GRID_MIN + (k % sectionW),
                    y: GRID_MIN + Math.floor(k / sectionW),
                })),
            });
            bandHeight = Math.max(bandHeight, rows);
            inBand++;
        }
        plans.push({ name: nd.name, sections });
    }

    // Nothing is created unless all of it is valid.
    for (const p of plans) {
        for (const s of p.sections) {
            const boxes = [s, ...s.items.map(i => ({ x: i.x, y: i.y, w: 1, h: 1 }))];
            for (const b of boxes) {
                for (const v of [b.x, b.y, b.w, b.h]) {
                    if (!Number.isInteger(v) || v < GRID_MIN || v > GRID_MAX) throw new ImportTooLargeError();
                }
            }
            if (s.x + s.w - 1 > cols) throw new ImportTooLargeError();
        }
    }
    return plans;
}
