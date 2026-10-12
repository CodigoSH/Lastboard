import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

// A preset never receives the key: it writes where the key goes, and the server
// fills it in from the widget's secret store. The server understands exactly
// three templates (resolveKey in widget_api_secrets.go); one that is spelled
// differently would reach the upstream service as literal text.
describe('presets and the key', () => {
    // The presets label their fields through i18n, which wants a browser. The
    // stand-ins are put back when this file is done: they are process-wide, and
    // the tests that talk to a real server use the real `fetch`. Left in place
    // they broke those tests, but only on a machine that happens to run this file
    // first — which is the CI's.
    const saved = {
        fetch: globalThis.fetch,
        navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
        localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    };
    let presets: typeof import('./apiPresets');

    beforeAll(async () => {
        (globalThis as any).fetch = async () => new Response('{}');
        Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-US' }, configurable: true });
        Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem: () => { }, removeItem: () => { } }, configurable: true });
        presets = await import('./apiPresets');
        await Bun.sleep(20); // let the i18n service finish its start-up fetch against the stand-in
    });

    afterAll(() => {
        globalThis.fetch = saved.fetch;
        for (const key of ['navigator', 'localStorage'] as const) {
            if (saved[key]) Object.defineProperty(globalThis, key, saved[key]!);
            else delete (globalThis as any)[key];
        }
    });

    test('where a key goes there is one of the three templates the server fills in', async () => {
        const { API_PRESETS } = presets;
        const known = new Set(['{{key}}', '{{key|base64}}', '{{key|url}}']);
        let templates = 0;
        for (const p of API_PRESETS) {
            const cfg = p.build('http://h', true, 'x');
            const text = JSON.stringify([cfg.url, cfg.headers]);
            for (const m of text.match(/\{\{[^}]*\}\}/g) ?? []) {
                expect(known.has(m)).toBe(true);
                templates++;
            }
            if (p.needsKey) expect(text).toMatch(/\{\{key/);
        }
        expect(templates).toBeGreaterThan(10);
    });

    test('with no key set a header is not sent as an empty template', async () => {
        const { API_PRESETS } = presets;
        for (const p of API_PRESETS) {
            const cfg = p.build('http://h', false, 'x');
            expect(JSON.stringify(cfg.headers ?? {})).not.toContain('{{key');
        }
    });
});
