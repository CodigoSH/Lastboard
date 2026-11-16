import { describe, expect, test } from 'bun:test';
import { dismissKey, dismissalChanges, countPending } from './dismissedServices';

describe('how a service is filed', () => {
    test('by kind, host and its own name', () => {
        expect(dismissKey({ docker: { host: 'h1', name: 'runner' } })).toBe('d:h1/runner');
        expect(dismissKey({ proxmox: { host: 'h2', node: 'pve', kind: 'lxc', vmid: 106 } })).toBe('p:h2/pve|106');
    });
});

describe('what adding changes', () => {
    const row = (o: object) => ({ key: 'd:h/x', proposedTicked: false, dismissed: false, checked: false, ...o });
    test('a service proposed ticked and left unticked is dismissed', () => {
        expect(dismissalChanges([row({ proposedTicked: true, checked: false })])).toEqual({ add: ['d:h/x'], remove: [] });
    });
    test('one dismissed and now ticked is not any more', () => {
        expect(dismissalChanges([row({ dismissed: true, checked: true })])).toEqual({ add: [], remove: ['d:h/x'] });
    });
    test('nothing else moves', () => {
        expect(dismissalChanges([
            row({ proposedTicked: true, checked: true }),
            row({ dismissed: true, checked: false }),
            row({ proposedTicked: false, checked: false }), // already served, or off: never asked about
        ])).toEqual({ add: [], remove: [] });
    });
});

describe('what is worth telling the person about', () => {
    const p = (name: string, linkedTo = '') => ({ link: { docker: { host: 'h', name } }, linkedTo });
    test('only what nothing serves and nobody left out', () => {
        expect(countPending([p('a'), p('b'), p('c', 'Already'), p('d')], new Set(['d:h/b']))).toBe(2);
        expect(countPending([], new Set())).toBe(0);
    });
});
