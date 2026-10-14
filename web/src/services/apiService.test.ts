import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

const realFetch = globalThis.fetch;
const g = globalThis as any;
const hadDocument = 'document' in g;
const hadWindow = 'window' in g;
let reply: { status: number; body: string } = { status: 200, body: '' };

beforeAll(() => {
    if (!hadWindow) g.window = g;
    if (!hadDocument) g.document = { cookie: '', querySelector: () => null };
    (globalThis as any).fetch = async () =>
        new Response(reply.body, { status: reply.status });
});
afterAll(() => {
    globalThis.fetch = realFetch;
    if (!hadDocument) delete g.document;
    if (!hadWindow) delete g.window;
});

describe('apiService answers', () => {
    test('parses a JSON body', async () => {
        const { apiService } = await import('./apiService');
        reply = { status: 200, body: '{"a":1}' };
        expect(await apiService.get<{ a: number }>('/x')).toEqual({ a: 1 });
    });

    test('an empty body is an empty object', async () => {
        const { apiService } = await import('./apiService');
        reply = { status: 204, body: '' };
        expect(await apiService.get('/x')).toEqual({});
    });

    test('a failure carries the message the server sent, for JSON and form posts alike', async () => {
        const { apiService } = await import('./apiService');
        reply = { status: 400, body: '{"error":"bad name"}' };
        await expect(apiService.post('/x', {})).rejects.toThrow(/^bad name$/);
        await expect(apiService.postForm('/x', new FormData())).rejects.toThrow(/^bad name$/);
        reply = { status: 500, body: 'plain text' };
        await expect(apiService.get('/x')).rejects.toThrow(/^plain text$/);
    });
});
