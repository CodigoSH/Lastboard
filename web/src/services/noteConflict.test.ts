import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { HAS_GO, startRealServer, type RealServer } from '../testing/realServer';
import { guardedUpdateBody } from './itemUpdate';

/**
 * Two devices, one note, against a real server.
 *
 * A note edited on one device was overwritten by a save from another that was
 * still holding the old text, and shown one reload late. Both are about what the
 * interface sends and what the server does with it, so this sends the body the
 * interface builds (guardedUpdateBody, the same function the app calls) to the
 * real server.
 */

let server: RealServer;
let other: Awaited<ReturnType<RealServer['anotherDevice']>>;
let noteId = 0;

const note = (text: string) => JSON.stringify({ widgetId: 'notepad', text });
interface Item { id: number; type: string; x: number; y: number; w: number; h: number; content: string }

async function stored(): Promise<Item> {
    const items = await server.ok<Item[]>('GET', '/api/dashboard');
    return items.find(i => i.id === noteId)!;
}
const textOf = (i: Item) => JSON.parse(i.content).text as string;

beforeAll(async () => {
    if (!HAS_GO) {
        console.warn('noteConflict: no Go toolchain here, so the real server is not started and this did not run');
        return;
    }
    server = await startRealServer();
    other = await server.anotherDevice();
    const items = await server.ok<Item[]>('GET', '/api/dashboard');
    noteId = items.find(i => i.type === 'widget' && i.content.includes('"notepad"'))!.id;
}, 180_000);

afterAll(() => server?.stop());

describe('a note saved from two devices', () => {
    it('the starter board has a note to work with', () => {
        if (!HAS_GO) return;
        expect(noteId).toBeGreaterThan(0);
    });

    it('sends the content and what it was based on, and nothing else', () => {
        // The old save sent the whole item, so an old position and size went with the text.
        const body = guardedUpdateBody({ id: 7, content: note('x') }, { text: 'before' });
        expect(Object.keys(body).sort()).toEqual(['content', 'expected']);
        expect(body.expected).toEqual({ text: 'before' });
    });

    it('accepts a save made from the current note', async () => {
        if (!HAS_GO) return;
        const base = textOf(await stored());
        await server.ok('PATCH', `/api/dashboard/item/${noteId}`, guardedUpdateBody({ id: noteId, content: note('device A, first') }, { text: base }));
        expect(textOf(await stored())).toBe('device A, first');
    });

    it('refuses a save made from an older copy, and keeps the newer note', async () => {
        if (!HAS_GO) return;
        const base = textOf(await stored());                       // both devices hold this
        await other.ok('PATCH', `/api/dashboard/item/${noteId}`,   // device B saves first
            guardedUpdateBody({ id: noteId, content: note('device B') }, { text: base }));

        const late = await server.call('PATCH', `/api/dashboard/item/${noteId}`,   // device A, still on the old text
            guardedUpdateBody({ id: noteId, content: note('device A, late') }, { text: base }));
        expect(late.status).toBe(409);
        expect((await late.text()).trim()).toBe('error.conflict');
        expect(textOf(await stored())).toBe('device B');
    });

    it('does not put back the position another device gave the widget', async () => {
        if (!HAS_GO) return;
        const base = textOf(await stored());
        await other.ok('PATCH', `/api/dashboard/item/${noteId}`, { x: 3, y: 4 });   // B moves it
        await server.ok('PATCH', `/api/dashboard/item/${noteId}`,
            guardedUpdateBody({ id: noteId, content: note('device A, after the move') }, { text: base }));
        const now = await stored();
        expect([now.x, now.y]).toEqual([3, 4]);
        expect(textOf(now)).toBe('device A, after the move');
    });

    it('asks again, rather than overwriting, when the note moved on a second time', async () => {
        if (!HAS_GO) return;
        const seen = textOf(await stored());
        await other.ok('PATCH', `/api/dashboard/item/${noteId}`,
            guardedUpdateBody({ id: noteId, content: note('device B, again') }, { text: seen }));
        const res = await server.call('PATCH', `/api/dashboard/item/${noteId}`,
            guardedUpdateBody({ id: noteId, content: note('device A, retry') }, { text: seen }));
        expect(res.status).toBe(409);
    });

    it('says the API must not be cached', async () => {
        if (!HAS_GO) return;
        const res = await server.call('GET', '/api/dashboard');
        expect(res.headers.get('cache-control')).toBe('no-store');
    });
});
