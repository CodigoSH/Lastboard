import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { whenVisible } from './whenVisible';

const g = globalThis as any;
const hadDocument = 'document' in g;
const before = g.document;

beforeAll(() => { if (!hadDocument) g.document = { hidden: false }; });
afterAll(() => { if (!hadDocument) delete g.document; else g.document = before; });

describe('whenVisible', () => {
    test('runs the tick while the page is shown and skips it while hidden', () => {
        let calls = 0;
        const tick = whenVisible(() => { calls++; });
        g.document.hidden = false;
        tick();
        g.document.hidden = true;
        tick();
        tick();
        g.document.hidden = false;
        tick();
        expect(calls).toBe(2);
    });
});
