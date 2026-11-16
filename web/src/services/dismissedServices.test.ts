import { describe, expect, test } from 'bun:test';
import { dismissKey, countPending } from './dismissedServices';

describe('how a service is filed', () => {
    test('by kind, host and its own name', () => {
        expect(dismissKey({ docker: { host: 'h1', name: 'runner' } })).toBe('d:h1/runner');
        expect(dismissKey({ proxmox: { host: 'h2', node: 'pve', kind: 'lxc', vmid: 106 } })).toBe('p:h2/pve|106');
    });
});

describe('what is worth telling the person about', () => {
    const p = (name: string, linkedTo = '') => ({ link: { docker: { host: 'h', name } }, linkedTo });
    test('only what nothing serves and nobody left out', () => {
        expect(countPending([p('a'), p('b'), p('c', 'Already'), p('d')], new Set(['d:h/b']))).toBe(2);
        expect(countPending([], new Set())).toBe(0);
    });
});
