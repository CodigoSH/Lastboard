import { describe, expect, test } from 'bun:test';
import { isDirectIconUrl, resolveIconUrl } from './iconUrl';

const HOMARR = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/';

describe('isDirectIconUrl', () => {
    test.each([
        ['https://example.com/i.png', true],
        ['http://nas.home/i.png', true],
        ['/api/icons/abc', true],
        ['data:image/png;base64,AAAA', true],
        ['plex', false],
        ['home-assistant', false],
        ['', false],
    ])('%s → %s', (value, want) => {
        expect(isDirectIconUrl(value)).toBe(want);
    });
});

describe('resolveIconUrl', () => {
    test('a bare provider name gets the CDN prefix', () => {
        expect(resolveIconUrl('plex')).toBe(`${HOMARR}plex.webp`);
    });

    test.each([
        'https://example.com/i.png',
        'http://nas.home/i.png',
        '/api/icons/abc',
        'data:image/png;base64,AAAA',
    ])('%s is already loadable and comes back untouched', (value) => {
        expect(resolveIconUrl(value)).toBe(value);
    });

    test.each([
        ['empty', ''],
        ['null', null],
        ['undefined', undefined],
    ])('%s means no icon, not a broken URL', (_label, value) => {
        // A prefix applied to nothing would produce ".../.webp", a request for
        // an icon that cannot exist.
        expect(resolveIconUrl(value)).toBe('');
    });
});
