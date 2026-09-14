import { describe, expect, test } from 'bun:test';
import { bookmarkKeys, buildNameIndex, guessByName, iconSlug, machineKey } from './proxmoxMatch';

/*
Every case below is taken from a real host: twenty-nine containers on one node,
a board of fifty-five bookmarks, and not one hand-made link between them. That
is the state this matching exists for.
*/

describe('what a machine is called', () => {
    test('drops the ordinal people file their containers under', () => {
        // Matching without this found two machines out of twenty-nine.
        expect(machineKey('15-myspeed')).toBe('myspeed');
        expect(machineKey('05-forgejo')).toBe('forgejo');
        expect(machineKey('90--haos')).toBe('haos');
        expect(machineKey('1. plex')).toBe('plex');
    });

    test('leaves a number that is part of the name alone', () => {
        expect(machineKey('adguard-1')).toBe('adguard1');
        expect(machineKey('iperf3')).toBe('iperf3');
    });

    test('ignores case and punctuation, which are filing too', () => {
        expect(machineKey('Home-Assistant')).toBe('homeassistant');
        expect(machineKey('paperless_ngx')).toBe('paperlessngx');
        expect(machineKey('  Plex  ')).toBe('plex');
    });

    test('a nameless machine gets no key at all', () => {
        expect(machineKey('')).toBe('');
        expect(machineKey('123-')).toBe('');
    });
});

describe('what a bookmark answers to', () => {
    test('reads the icon name out of a CDN URL', () => {
        // How a board built before icons were kept locally stores them.
        expect(iconSlug('https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/myspeed.webp')).toBe('myspeed');
        expect(iconSlug('/api/icons/6d9f4ff95f796ea9832b3dcf')).toBe('6d9f4ff95f796ea9832b3dcf');
        expect(iconSlug('plex')).toBe('plex');
        expect(iconSlug('')).toBe('');
    });

    test('is found by its name and by the icon it wears', () => {
        // The label says Donetic and the icon says donetick; the container is
        // called donetick, so the icon is what matches it.
        const keys = bookmarkKeys('Donetic', 'https://cdn.jsdelivr.net/gh/x/webp/donetick.webp', '');
        expect(keys).toContain('donetic');
        expect(keys).toContain('donetick');
    });

    test('says each key once', () => {
        const keys = bookmarkKeys('Plex', 'plex', 'plex');
        expect(keys).toEqual(['plex']);
    });
});

describe('the index', () => {
    const entry = (label: string, icon = '') => ({ keys: bookmarkKeys(label, icon, ''), value: label });

    test('matches the machines a real board would light up', () => {
        const index = buildNameIndex([
            entry('MySpeed', 'https://cdn/webp/myspeed.webp'),
            entry('Nextcloud'),
            entry('Immich'),
            entry('PairDrop'),
            entry('NTFY'),
        ]);
        expect(guessByName(index, '15-myspeed')).toBe('MySpeed');
        expect(guessByName(index, '20-nextcloud')).toBe('Nextcloud');
        expect(guessByName(index, '24-immich')).toBe('Immich');
        expect(guessByName(index, '10-pairdrop')).toBe('PairDrop');
        expect(guessByName(index, '11-ntfy')).toBe('NTFY');
    });

    test('refuses to answer where two bookmarks would fit', () => {
        // Naming the wrong service as the one that went down is worse than
        // naming none, so a clash resolves to nothing at all.
        const index = buildNameIndex([entry('Jellyfin'), entry('KiFlix', 'https://cdn/webp/jellyfin.webp')]);
        expect(guessByName(index, 'jellyfin')).toBeNull();
    });

    test('the same bookmark under two of its own keys is not a clash', () => {
        const index = buildNameIndex([entry('Immich', 'https://cdn/webp/immich.webp')]);
        expect(guessByName(index, '24-immich')).toBe('Immich');
    });

    test('says nothing about a machine nobody bookmarked', () => {
        const index = buildNameIndex([entry('Plex')]);
        // Ten of the twenty-nine measured machines are like this: internal
        // things with no service behind them.
        expect(guessByName(index, '26-pruebas')).toBeNull();
        expect(guessByName(index, 'tailscale')).toBeNull();
    });

    test('does not match across a language, which is what the manual link is for', () => {
        const index = buildNameIndex([entry('Jellyfin Music')]);
        expect(guessByName(index, '23-jellyfin-musica')).toBeNull();
    });

    test('an empty key never becomes a match', () => {
        const index = buildNameIndex([{ keys: bookmarkKeys('', '', ''), value: 'nameless' }]);
        expect(guessByName(index, '123-')).toBeNull();
        expect(guessByName(index, '')).toBeNull();
    });
});
