import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { install, type StandIns } from '../testing/standIns';

/**
 * What the demo answers when the page asks the API for something. The demo has no server, so the
 * answers are made here; these pin the ones that are fixed, so moving or tidying the code that makes
 * them cannot change what a visitor to the demo sees.
 */
let stand: StandIns;
let warn: typeof console.warn;
beforeAll(() => {
    stand = install();
    (globalThis as any).LASTBOARD_CONFIG = { demo_mode: true };
    warn = console.warn;
    console.warn = () => { };
});
afterAll(async () => {
    console.warn = warn;
    await stand.settle();
    stand.restore();
});

async function api() {
    return (await import('./apiService')).apiService;
}

describe('the demo answers for the API', () => {
    test('sign-in extras are off: two steps and passkeys are not available', async () => {
        const a = await api();
        expect(await a.get('/api/2fa')).toEqual({ enabled: false, recovery_left: 0 });
        expect(await a.get('/api/passkeys')).toEqual({ available: false, passkeys: [] });
        expect(await a.post('/api/passkeys/1/remove', {})).toEqual({});
        expect(await a.post('/api/login/2fa', {})).toEqual({});
        expect(await a.post('/api/2fa/enable', {})).toEqual({ recovery_codes: ['demo-aaaa-bbbb-cccc', 'demo-dddd-eeee-ffff'] });
        expect((await a.post<{ secret: string }>('/api/2fa/setup', {})).secret).toBe('JBSWY3DPEHPK3PXP');
    });

    test('actions that would change an account say they were simulated', async () => {
        const a = await api();
        expect(await a.post('/api/user/change-password', {})).toEqual({ message: 'Password changed (Demo)' });
        expect(await a.post('/api/users', {})).toEqual({ message: 'Admin action simulated (Demo)' });
        expect(await a.post('/api/monitor/test', {})).toEqual({ ok: true });
    });

    test('Proxmox has one hypervisor and saving settings changes nothing', async () => {
        const a = await api();
        const s = await a.get<{ enabled: boolean; hosts: { id: string }[] }>('/api/proxmox/settings');
        expect(s.enabled).toBe(true);
        expect(s.hosts.map(h => h.id)).toEqual(['demo']);
        expect(await a.post('/api/proxmox/settings', {})).toEqual({ status: 'ok' });
    });

    test('a health check is up, and clearing monitor history deletes nothing', async () => {
        const a = await api();
        expect(await a.get('/api/dashboard/health?url=x')).toEqual({ status: 'up' });
        expect(await a.delete('/api/monitor/history?item_id=1')).toEqual({ ok: true, deleted: 0 });
    });

    test('the Server Health reading drifts but keeps its shape', async () => {
        const a = await api();
        const r = await a.get<{ ok: boolean; stats: Record<string, number | string> }>('/api/widget/7/remote-stats');
        expect(r.ok).toBe(true);
        expect(Object.keys(r.stats).sort()).toEqual(['cpu', 'ram', 'temp', 'version']);
    });

    test('boards are a list, and a URL the demo does not know answers with an empty object', async () => {
        const a = await api();
        expect(Array.isArray(await a.get('/api/dashboards'))).toBe(true);
        expect(await a.get('/api/never-heard-of-it')).toEqual({});
    });

    test('closing sessions is a no-op and listing them gives the visitor alone', async () => {
        const a = await api();
        expect(await a.delete('/api/sessions/3')).toEqual({});
        const list = await a.get<unknown>('/api/sessions');
        expect(list).toBeDefined();
    });

    test('with the demo off, the request goes to the network again', async () => {
        const a = await api();
        (globalThis as any).LASTBOARD_CONFIG = { demo_mode: false };
        stand.setFetch(async () => new Response('{"real":true}', { status: 200 }));
        expect(await a.get('/api/2fa')).toEqual({ real: true });
        (globalThis as any).LASTBOARD_CONFIG = { demo_mode: true };
    });
});
