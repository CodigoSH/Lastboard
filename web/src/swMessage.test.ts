import { describe as suite, expect, it } from 'bun:test';
import { describe, target } from './swMessage';

suite('target', () => {
    it('keeps a path inside the instance', () => {
        expect(target('/?view=monitor')).toBe('/?view=monitor');
        expect(target('/')).toBe('/');
    });

    // A push is signed by this server, but the page it opens is chosen by what the message says.
    it('sends anything that leaves the instance to the home page', () => {
        for (const bad of ['https://evil.example/', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'monitor', '', null, undefined, 42, {}]) {
            expect(target(bad)).toBe('/');
        }
    });
});

suite('describe', () => {
    it('shows what the server said', () => {
        const { title, options } = describe(JSON.stringify({ title: 'Router is down', body: 'Failed 3 checks', tag: 'service:7', url: '/?view=monitor', up: false }));
        expect(title).toBe('Router is down');
        expect(options.body).toBe('Failed 3 checks');
        expect(options.tag).toBe('service:7');
        expect((options.data as { url: string }).url).toBe('/?view=monitor');
    });

    it('keeps an outage on screen until it is dismissed and lets good news go', () => {
        expect(describe(JSON.stringify({ title: 'x', up: false })).options.requireInteraction).toBe(true);
        expect(describe(JSON.stringify({ title: 'x', up: true })).options.requireInteraction).toBe(false);
    });

    it('lets a recovery replace the outage it ends, and be noticed doing so', () => {
        expect(describe(JSON.stringify({ tag: 'service:7' })).options.renotify).toBe(true);
        // renotify without a tag is an error in some browsers.
        expect(describe(JSON.stringify({ title: 'x' })).options.renotify).toBe(false);
    });

    it('still says something when the message is empty or is not JSON', () => {
        expect(describe(null).title).toBe('Lastboard');
        expect(describe('').title).toBe('Lastboard');
        expect(describe('plain words').options.body).toBe('plain words');
        expect(describe('[1,2]').title).toBe('Lastboard');
        expect(describe('null').title).toBe('Lastboard');
    });

    it('does not take a field of the wrong type for text', () => {
        const { title, options } = describe(JSON.stringify({ title: 5, body: { a: 1 }, tag: [], url: 7 }));
        expect(title).toBe('Lastboard');
        expect(options.body).toBe('');
        expect(options.tag).toBeUndefined();
        expect((options.data as { url: string }).url).toBe('/');
    });
});
