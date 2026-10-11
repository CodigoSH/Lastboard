import { describe, expect, test } from 'bun:test';

// A preset never receives the key: it writes where the key goes, and the server
// fills it in from the widget's secret store. The server understands exactly
// three templates (resolveKey in widget_api_secrets.go); one that is spelled
// differently would reach the upstream service as literal text.
describe('presets and the key', () => {
    // The presets label their fields through i18n, which wants a browser.
    (globalThis as any).fetch = async () => new Response('{}');
    Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-US' }, configurable: true });
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { } };

    test('where a key goes there is one of the three templates the server fills in', async () => {
        const { API_PRESETS } = await import('./apiPresets');
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
        const { API_PRESETS } = await import('./apiPresets');
        for (const p of API_PRESETS) {
            const cfg = p.build('http://h', false, 'x');
            expect(JSON.stringify(cfg.headers ?? {})).not.toContain('{{key');
        }
    });
});
