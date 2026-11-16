import { describe, expect, test } from 'bun:test';
import { createDetected, ITEM_LIMIT, undoCreated, type ItemApi, type NewBookmark } from './createDetected';
import type { BoardItem, SectionToPlace } from './placeServices';

/** A server that numbers what it creates, and can be told to refuse. */
function fakeApi(refuse: (body: Record<string, unknown>, nth: number) => string | null = () => null) {
    const calls: { op: string; body?: Record<string, unknown>; id?: number; h?: number }[] = [];
    let next = 100;
    let n = 0;
    const api: ItemApi = {
        async createItem(body) {
            const why = refuse(body, ++n);
            if (why) throw new Error(why);
            calls.push({ op: 'create', body });
            return { id: next++ };
        },
        async updateItem(body) { calls.push({ op: 'update', id: body.id, h: body.h }); return {}; },
        async deleteItem(id) { calls.push({ op: 'delete', id }); return {}; },
    };
    return { api, calls };
}
const noRetry = <T>(run: () => Promise<T>) => run();

const section = (title: string, n: number): SectionToPlace<NewBookmark> => ({
    title, w: 4, h: Math.max(1, Math.ceil(n / 4)),
    items: Array.from({ length: n }, (_, k) => ({ content: `{"label":"${title}${k}"}`, x: 1 + (k % 4), y: 1 + Math.floor(k / 4) })),
});
const run = (sections: SectionToPlace<NewBookmark>[], api: ItemApi, board: BoardItem[] = []) =>
    createDetected({ boardId: 3, gridCols: 12, sections, board, api, retry: noRetry });

describe('creating', () => {
    test('a section is created first and its bookmarks go inside it, on the chosen board', async () => {
        const { api, calls } = fakeApi();
        const r = await run([section('Home', 2)], api);
        expect(r).toMatchObject({ created: 2, failed: 0, notFit: 0 });
        expect(calls[0].body).toMatchObject({ dashboard_id: 3, type: 'section', content: '{"title":"Home"}' });
        expect(calls[1].body).toMatchObject({ dashboard_id: 3, parent_id: 100, type: 'bookmark', x: 1, y: 1, w: 1, h: 1 });
        expect(calls[2].body).toMatchObject({ parent_id: 100, x: 2, y: 1 });
        expect(r.log).toEqual({ sectionIds: [100], bookmarkIds: [101, 102], grown: [] });
    });
    test('a failure on one bookmark does not stop the others, and is counted', async () => {
        const { api } = fakeApi((body, nth) => (body.type === 'bookmark' && nth === 3 ? 'error.invalid' : null));
        const r = await run([section('Home', 3)], api);
        expect(r).toMatchObject({ created: 2, failed: 1, notFit: 0 });
    });
    test('the account\'s limit stops the run: what is left is counted as not fitting, not as failed', async () => {
        const { api, calls } = fakeApi((_body, nth) => (nth >= 4 ? ITEM_LIMIT : null)); // section, two bookmarks, then the limit
        const r = await run([section('A', 3), section('B', 2)], api);
        expect(r).toMatchObject({ created: 2, failed: 0, notFit: 3 });
        expect(calls.filter(c => c.op === 'create').length).toBe(3); // nothing was sent after the refusal
    });
    test('a section that cannot be created takes its bookmarks with it, as failed', async () => {
        const { api } = fakeApi(body => (body.type === 'section' ? 'error.invalid' : null));
        const r = await run([section('Home', 2)], api);
        expect(r).toMatchObject({ created: 0, failed: 2 });
    });
    test('a section that is already there takes the bookmarks, and grows when it has to', async () => {
        const full = Array.from({ length: 4 }, (_, k): BoardItem => ({ id: 10 + k, type: 'bookmark', x: 1 + k, y: 1, w: 1, h: 1, parent_id: 7, content: '{}' }));
        const board: BoardItem[] = [{ id: 7, type: 'section', x: 1, y: 1, w: 4, h: 1, parent_id: null, content: '{"title":"Home"}' }, ...full];
        const { api, calls } = fakeApi();
        const r = await run([section('home', 1)], api, board);
        expect(calls[0]).toEqual({ op: 'update', id: 7, h: 2 });
        expect(calls[1].body).toMatchObject({ parent_id: 7, x: 1, y: 2 });
        expect(r.log).toEqual({ sectionIds: [], bookmarkIds: [100], grown: [{ id: 7, oldH: 1 }] });
    });
    test('the requests go through the retry for a server that is asked too fast', async () => {
        const { api } = fakeApi();
        let retried = 0;
        await createDetected({
            boardId: 1, gridCols: 12, sections: [section('Home', 1)], board: [], api,
            retry: async run => { retried++; return run(); },
        });
        expect(retried).toBe(2); // the section and its bookmark
    });
});

describe('undoing', () => {
    test('takes back the bookmarks, then the sections, then the rows added to a section that was there', async () => {
        const { api, calls } = fakeApi();
        const removed = await undoCreated({ sectionIds: [100], bookmarkIds: [101, 102], grown: [{ id: 7, oldH: 2 }] }, { api, retry: noRetry });
        expect(removed).toBe(2);
        expect(calls).toEqual([
            { op: 'delete', id: 101 }, { op: 'delete', id: 102 }, { op: 'delete', id: 100 }, { op: 'update', id: 7, h: 2 },
        ]);
    });
    test('one that is already gone is no reason to stop', async () => {
        const calls: number[] = [];
        const api: ItemApi = {
            createItem: async () => ({ id: 0 }), updateItem: async () => ({}),
            async deleteItem(id) { calls.push(id); if (id === 101) throw new Error('error.not_found'); return {}; },
        };
        const removed = await undoCreated({ sectionIds: [100], bookmarkIds: [101, 102], grown: [] }, { api, retry: noRetry });
        expect(calls).toEqual([101, 102, 100]);
        expect(removed).toBe(1);
    });
});
