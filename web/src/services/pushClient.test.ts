import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { install, type StandIns } from '../testing/standIns';
import { deviceRef } from './pushSupport';

// What a browser that took part in push has: permission, a worker, and a subscription it still holds.
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';
const KEY_BYTES = [4, 1, 2, 3];
const KEY_B64URL = 'BAECAw'; // the same four bytes, base64url without padding

let stand: StandIns;
let resyncPush: (label: string) => Promise<void>;
let calls: { method: string; url: string }[];
let listed: { ref: string }[];
const saved = new Map<string, PropertyDescriptor | undefined>();

function own(key: number[]) {
    return {
        endpoint: ENDPOINT,
        options: { applicationServerKey: new Uint8Array(key).buffer },
        toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'p', auth: 'a' } }),
    };
}

function browser(opts: { permission: string; subscription: ReturnType<typeof own> | null }) {
    const g = globalThis as any;
    Object.defineProperty(g, 'navigator', {
        configurable: true, writable: true, enumerable: true,
        value: {
            language: 'en-US', languages: ['en-US'], userAgent: 'test', maxTouchPoints: 0,
            serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => opts.subscription } }) },
        },
    });
    for (const [name, value] of [['PushManager', class {}], ['Notification', { permission: opts.permission }]] as const) {
        Object.defineProperty(g, name, { configurable: true, writable: true, enumerable: true, value });
    }
}

beforeAll(async () => {
    const g = globalThis as any;
    for (const name of ['PushManager', 'Notification']) saved.set(name, Object.getOwnPropertyDescriptor(g, name));
    stand = install();
    ({ resyncPush } = await import('./pushClient'));
    await stand.settle();
});

afterAll(() => {
    const g = globalThis as any;
    stand.restore();
    for (const [name, d] of saved) {
        if (d) Object.defineProperty(g, name, d); else delete g[name];
    }
});

function answer() {
    calls = [];
    stand.setFetch(async (url, init) => {
        const method = init?.method ?? 'GET';
        calls.push({ method, url });
        const body = url.endsWith('/api/push/key') ? { public_key: KEY_B64URL } : url.endsWith('/api/push/subscriptions') && method === 'GET' ? listed : {};
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
}

describe('putting a browser back on the server list when the app opens', () => {
    test('a browser the server forgot is subscribed again, under the name it is given', async () => {
        listed = [];
        answer();
        browser({ permission: 'granted', subscription: own(KEY_BYTES) });
        await resyncPush('Chrome on Linux');
        expect(calls.filter(c => c.method === 'POST').map(c => c.url)).toEqual(['/api/push/subscriptions']);
    });

    test('a browser the server still knows costs one request and writes nothing', async () => {
        listed = [{ ref: await deviceRef(ENDPOINT) }];
        answer();
        browser({ permission: 'granted', subscription: own(KEY_BYTES) });
        await resyncPush('x');
        expect(calls).toEqual([{ method: 'GET', url: '/api/push/subscriptions' }]);
    });

    test('a subscription made for another key is left for the person to enable again', async () => {
        listed = [];
        answer();
        browser({ permission: 'granted', subscription: own([9, 9, 9, 9]) });
        await resyncPush('x');
        expect(calls.some(c => c.method === 'POST')).toBe(false);
    });

    test('a browser that never took part asks nothing: no permission, or no subscription', async () => {
        for (const b of [
            { permission: 'default', subscription: own(KEY_BYTES) },
            { permission: 'denied', subscription: own(KEY_BYTES) },
            { permission: 'granted', subscription: null },
        ]) {
            answer();
            browser(b);
            await resyncPush('x');
            expect(calls).toEqual([]);
        }
    });
});
