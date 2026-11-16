import { describe, expect, test } from 'bun:test';
import { planPlacement, type BoardItem, type SectionToPlace } from './placeServices';

const item = (id: number, o: Partial<BoardItem> = {}): BoardItem => ({ id, type: 'bookmark', x: 1, y: 1, w: 1, h: 1, parent_id: null, content: '{}', ...o });
const section = (id: number, title: string, o: Partial<BoardItem> = {}): BoardItem =>
    item(id, { type: 'section', w: 4, h: 2, content: JSON.stringify({ title }), ...o });
/** A section of `n` bookmarks, four to a row, as an import lays them out. */
const toPlace = (title: string, n: number): SectionToPlace<{ name: string }> => ({
    title, w: 4, h: Math.max(1, Math.ceil(n / 4)),
    items: Array.from({ length: n }, (_, k) => ({ name: `s${k}`, x: 1 + (k % 4), y: 1 + Math.floor(k / 4) })),
});
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('a new section', () => {
    test('on an empty board it goes in the corner, with the bookmarks where the layout said', () => {
        const [p] = planPlacement([toPlace('Home', 5)], [], 12);
        expect(p).toMatchObject({ kind: 'new', title: 'Home', x: 1, y: 1, w: 4, h: 2 });
        expect(p.items.map(i => [i.x, i.y])).toEqual([[1, 1], [2, 1], [3, 1], [4, 1], [1, 2]]);
    });
    test('on a busy board it lands where nothing is', () => {
        const board = [item(1, { x: 1, y: 1 }), section(2, 'Other', { x: 2, y: 1 })];
        const [p] = planPlacement([toPlace('Home', 3)], board, 12);
        if (p.kind !== 'new') throw new Error('expected a new section');
        const rect = { x: p.x, y: p.y, w: p.w, h: p.h };
        for (const b of board) expect(overlap(rect, b)).toBe(false);
    });
    test('two sections in one run do not land on each other', () => {
        const [a, b] = planPlacement([toPlace('A', 8), toPlace('B', 8)], [], 12);
        if (a.kind !== 'new' || b.kind !== 'new') throw new Error('expected new sections');
        expect(overlap(a, b)).toBe(false);
    });
    test('the things inside other sections are not obstacles on the board', () => {
        // A child's x and y are counted inside its section: at 1,1 it blocks nothing out here.
        const board = [section(2, 'Other', { x: 6, y: 1 }), item(3, { x: 1, y: 1, parent_id: 2 })];
        const [p] = planPlacement([toPlace('Home', 2)], board, 12);
        expect(p).toMatchObject({ kind: 'new', x: 1, y: 1 });
    });
});

describe('a section that is already there', () => {
    test('is found by its title, whatever the case, and takes the bookmarks into its free cells', () => {
        const board = [section(7, 'home', { x: 3, y: 2, w: 4, h: 2 }), item(8, { x: 1, y: 1, parent_id: 7 })];
        const [p] = planPlacement([toPlace('Home', 2)], board, 12);
        expect(p).toMatchObject({ kind: 'into', sectionId: 7, oldH: 2, newH: null });
        expect(p.items.map(i => [i.x, i.y])).toEqual([[2, 1], [3, 1]]); // the cell taken by 8 is left alone
    });
    test('grows when what it was given does not fit and nothing is in the way', () => {
        const full = Array.from({ length: 8 }, (_, k) => item(10 + k, { x: 1 + (k % 4), y: 1 + Math.floor(k / 4), parent_id: 7 }));
        const board = [section(7, 'Home', { x: 1, y: 1, w: 4, h: 2 }), ...full];
        const [p] = planPlacement([toPlace('Home', 2)], board, 12);
        expect(p).toMatchObject({ kind: 'into', sectionId: 7, oldH: 2, newH: 3 });
        expect(p.items.map(i => [i.x, i.y])).toEqual([[1, 3], [2, 3]]);
    });
    test('does not grow over something below it: a new section with the same title is made instead', () => {
        const full = Array.from({ length: 8 }, (_, k) => item(10 + k, { x: 1 + (k % 4), y: 1 + Math.floor(k / 4), parent_id: 7 }));
        const board = [section(7, 'Home', { x: 1, y: 1, w: 4, h: 2 }), ...full, item(50, { x: 2, y: 3 })];
        const [p] = planPlacement([toPlace('Home', 2)], board, 12);
        if (p.kind !== 'new') throw new Error('expected a new section');
        expect(p.title).toBe('Home');
        for (const b of board.filter(i => i.parent_id == null)) expect(overlap({ x: p.x, y: p.y, w: p.w, h: p.h }, b)).toBe(false);
    });
    test('a section whose content cannot be read is not mistaken for it', () => {
        const board = [section(7, 'Home', { content: 'not json' })];
        const [p] = planPlacement([toPlace('Home', 1)], board, 12);
        expect(p.kind).toBe('new');
    });
    test('a bookmark is not a section, even with the same name', () => {
        const board = [item(7, { content: JSON.stringify({ title: 'Home' }) })];
        expect(planPlacement([toPlace('Home', 1)], board, 12)[0].kind).toBe('new');
    });
});
