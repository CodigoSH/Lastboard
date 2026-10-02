import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GRID_MAX, GRID_MIN, ImportTooLargeError, planImport } from './importPlan';

const item = (title: string, group?: string) => ({ title, url: `https://${title}.example`, group });
const board = (groups: Record<string, number>) => ({
    name: 'Homepage',
    items: Object.entries(groups).flatMap(([g, n]) =>
        Array.from({ length: n }, (_, i) => item(`${g}-${i}`, g))),
});

/** Every position and size an import would send, flattened. */
function everyBox(plans: ReturnType<typeof planImport>) {
    return plans.flatMap(p => p.sections.flatMap(s => [
        { what: `section ${s.title}`, x: s.x, y: s.y, w: s.w, h: s.h },
        ...s.items.map(i => ({ what: `item ${i.title}`, x: i.x, y: i.y, w: 1, h: 1 })),
    ]));
}

describe('planImport', () => {
    // The bug: positions were counted from 0, the server accepts them from 1,
    // and every import ended in a 400 and an empty dashboard.
    it('counts from 1, never 0', () => {
        const plans = planImport([board({ A: 5, B: 1, C: 9 })], 12, 'Ungrouped');
        for (const b of everyBox(plans)) {
            for (const v of [b.x, b.y, b.w, b.h]) {
                expect(v).toBeGreaterThanOrEqual(1);
                expect(v).toBeLessThanOrEqual(100);
            }
        }
        const first = plans[0].sections[0];
        expect([first.x, first.y]).toEqual([1, 1]);
        expect([first.items[0].x, first.items[0].y]).toEqual([1, 1]);
    });

    it('holds the same bounds the server enforces', () => {
        // Written once in the handler and once here, so this reads the handler.
        const go = readFileSync(join(import.meta.dir, '../../../internal/web/api/dashboard_handler.go'), 'utf8');
        const low = /item\.X < (\d+) \|\| item\.Y < \d+/.exec(go);
        const high = /item\.X > (\d+) \|\| item\.Y > \d+/.exec(go);
        expect(low).not.toBeNull();
        expect(high).not.toBeNull();
        expect(GRID_MIN).toBe(Number(low![1]));
        expect(GRID_MAX).toBe(Number(high![1]));
    });

    it('puts three sections side by side on a 12-column board, then starts a new band', () => {
        const plans = planImport([board({ A: 8, B: 2, C: 4, D: 1 })], 12, 'Ungrouped');
        const [a, b, c, d] = plans[0].sections;
        expect([a.x, b.x, c.x]).toEqual([1, 5, 9]);
        expect([a.y, b.y, c.y]).toEqual([1, 1, 1]);
        // A is the tallest of its band (2 rows): D starts after it, and a blank row.
        expect([d.x, d.y]).toEqual([1, 1 + 2 + 1]);
    });

    it('keeps every bookmark inside its section and no two sections overlapping', () => {
        const plans = planImport([board({ A: 7, B: 3, C: 11, D: 2, E: 5 })], 12, 'Ungrouped');
        const secs = plans[0].sections;
        for (const s of secs) {
            for (const i of s.items) {
                expect(i.x).toBeLessThanOrEqual(s.w);
                expect(i.y).toBeLessThanOrEqual(s.h);
            }
        }
        for (let i = 0; i < secs.length; i++) {
            for (let j = i + 1; j < secs.length; j++) {
                const p = secs[i], q = secs[j];
                const overlap = p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y;
                expect(overlap).toBe(false);
            }
        }
    });

    it('never sets a section wider than the board', () => {
        for (const cols of [2, 3, 4, 6, 8, 12]) {
            const plans = planImport([board({ A: 5, B: 5, C: 5, D: 5 })], cols, 'Ungrouped');
            for (const s of plans[0].sections) expect(s.x + s.w - 1).toBeLessThanOrEqual(cols);
        }
    });

    it('names the group that has no name', () => {
        const plans = planImport([{ name: 'X', items: [item('a'), item('b', '  ')] }], 12, 'Ungrouped');
        expect(plans[0].sections.map(s => s.title)).toEqual(['Ungrouped']);
        expect(plans[0].sections[0].items).toHaveLength(2);
    });

    it('fits a configuration with dozens of groups', () => {
        // Stacked in one column this ran past the 100th row.
        const groups: Record<string, number> = {};
        for (let i = 0; i < 40; i++) groups[`G${i}`] = 9;
        const plans = planImport([board(groups)], 12, 'Ungrouped');
        expect(plans[0].sections).toHaveLength(40);
        for (const b of everyBox(plans)) expect(b.y + b.h - 1).toBeLessThanOrEqual(GRID_MAX);
    });

    it('refuses a layout that cannot fit, before anything is made', () => {
        const groups: Record<string, number> = {};
        for (let i = 0; i < 400; i++) groups[`G${i}`] = 9;
        expect(() => planImport([board(groups)], 12, 'Ungrouped')).toThrow(ImportTooLargeError);
    });

    it('skips a dashboard with nothing in it', () => {
        expect(planImport([{ name: 'Empty', items: [] }, board({ A: 1 })], 12, 'U')).toHaveLength(1);
    });
});
