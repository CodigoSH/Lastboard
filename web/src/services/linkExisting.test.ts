import { describe, expect, test } from 'bun:test';
import { isLinked, linkedContent } from './linkExisting';
import { placeOf } from './proxmoxMatch';

const docker = { docker: { host: 'h1', name: 'plex' } } as const;
const vm = { proxmox: { host: 'pve', node: 'n1', kind: 'qemu', vmid: 101 } } as const;
const plain = JSON.stringify({ label: 'Plex', url: 'http://nas:32400', icon: '/img/plex.svg', statusCheck: true, borderWidth: 3 });

describe('tying a bookmark that is already on the board', () => {
    test('only the link is added: everything else the person set stays as it is', () => {
        const next = linkedContent(plain, docker)!;
        expect(JSON.parse(next.content)).toEqual({ ...JSON.parse(plain), docker: { host: 'h1', name: 'plex' } });
    });

    test('a machine is tied the same way, under its own key', () => {
        const next = linkedContent(plain, vm)!;
        expect(JSON.parse(next.content).proxmox).toEqual({ host: 'pve', node: 'n1', kind: 'qemu', vmid: 101 });
        expect(JSON.parse(next.content).docker).toBeUndefined();
    });

    test('the save is conditional on the label, the address and there being no link yet', () => {
        expect(linkedContent(plain, docker)!.expected).toEqual({ docker: null, label: 'Plex', url: 'http://nas:32400' });
        expect(linkedContent(plain, vm)!.expected).toEqual({ proxmox: null, label: 'Plex', url: 'http://nas:32400' });
    });

    test('a bookmark that has no label or address asks for them to be absent, not for a string', () => {
        expect(linkedContent('{}', docker)!.expected).toEqual({ docker: null, label: null, url: null });
    });

    test('a bookmark that already serves something of that kind is not ours to change', () => {
        const tied = JSON.stringify({ label: 'Plex', docker: { host: 'h1', name: 'other' } });
        expect(linkedContent(tied, docker)).toBeNull();
        expect(isLinked(tied, docker)).toBe(true);
        // A container's link says nothing about a machine: that kind is still free.
        expect(isLinked(tied, vm)).toBe(false);
        expect(linkedContent(tied, vm)).not.toBeNull();
    });

    test('content that cannot be read is left alone, and counts as tied so it is never offered', () => {
        for (const bad of ['', 'not json', 'null', '[]', '"text"']) {
            expect(linkedContent(bad, docker)).toBeNull();
        }
        expect(isLinked('not json', docker)).toBe(true);
    });
});

describe('the place an address points at', () => {
    test('scheme, path and case do not count; host and port do', () => {
        expect(placeOf('http://NAS:32400/web/index.html')).toBe('nas:32400');
        expect(placeOf('nas:32400')).toBe('nas:32400');
        expect(placeOf('https://plex.lan')).toBe('plex.lan:443');
        expect(placeOf('http://plex.lan')).toBe('plex.lan:80');
        expect(placeOf('http://plex.lan:80')).toBe('plex.lan:80');
    });

    test('two services on one host are two places', () => {
        expect(placeOf('http://nas:32400')).not.toBe(placeOf('http://nas:8096'));
    });

    test('what is not a web address gives nothing', () => {
        for (const bad of ['', '   ', 'javascript:alert(1)', 'ftp://nas', 'http://']) expect(placeOf(bad)).toBe('');
    });
});
