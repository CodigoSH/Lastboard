import { describe, expect, it } from 'bun:test';
import type { IconInfo } from './iconService';
import { buildIconIndex, isIconName, resolveImportedIcon } from './importIcons';

const icon = (name: string, url: string): IconInfo => ({ name, url, provider: 'p', format: 'svg' });
const library = [
    icon('plex', 'https://lib-a/plex.svg'),
    icon('sonarr', 'https://lib-a/sonarr.svg'),
    icon('Plex', 'https://lib-b/plex.svg'),       // same name, later library
    icon('uptime-kuma', 'https://lib-a/uptime-kuma.svg'),
];
const index = buildIconIndex(library);

describe('resolveImportedIcon', () => {
    it('turns a library name into the address of that icon', () => {
        expect(resolveImportedIcon('plex', index, true)).toBe('https://lib-a/plex.svg');
        expect(resolveImportedIcon('Sonarr', index, true)).toBe('https://lib-a/sonarr.svg');
    });

    it('takes the first library when several have the name', () => {
        expect(index.get('plex')).toBe('https://lib-a/plex.svg');
    });

    it('finds a name written with underscores', () => {
        expect(resolveImportedIcon('uptime_kuma', index, true)).toBe('https://lib-a/uptime-kuma.svg');
    });

    it('leaves a name no library has empty, so the board shows its default glyph', () => {
        expect(resolveImportedIcon('no-such-thing', index, true)).toBe('');
    });

    it('guesses the address when the indexes could not be loaded', () => {
        expect(resolveImportedIcon('jellyfin', new Map(), false))
            .toBe('https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/jellyfin.svg');
    });

    it('lets addresses, stored images and emoji through untouched', () => {
        for (const v of ['https://x/i.png', 'http://x/i.svg', '/api/icons/abc', 'data:image/png;base64,AA', '🩷', '🚀']) {
            expect(resolveImportedIcon(v, index, true)).toBe(v);
        }
    });

    it('is empty for nothing', () => {
        expect(resolveImportedIcon('', index, true)).toBe('');
        expect(resolveImportedIcon(undefined, index, true)).toBe('');
        expect(resolveImportedIcon('   ', index, true)).toBe('');
    });
});

describe('isIconName', () => {
    it('tells a name from an address and from an emoji', () => {
        expect(isIconName('plex')).toBe(true);
        expect(isIconName('uptime-kuma.v2')).toBe(true);
        expect(isIconName('https://x/y.png')).toBe(false);
        expect(isIconName('/api/icons/abc')).toBe(false);
        expect(isIconName('🩷')).toBe(false);
        expect(isIconName('two words')).toBe(false);
    });
});
