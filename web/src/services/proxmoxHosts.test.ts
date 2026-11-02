import { describe, expect, test } from 'bun:test';
import { curveQuery, CURVE_MAX_NODES, hostError, mergeHosts } from './proxmoxHosts';
import type { PxHost } from './proxmoxApi';

const host = (id: string, name: string, extra: Partial<PxHost> = {}): PxHost => ({
    id, name, cluster: false, caps: { read: true, power: false }, nodes: [], guests: [], stores: [], ...extra,
});

describe('the hosts of a round that arrives host by host', () => {
    const refs = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
    test('keep the order they were saved in, whichever answered first', () => {
        const fresh = new Map([['c', host('c', 'C')], ['a', host('a', 'A')]]);
        expect(mergeHosts(refs, [host('b', 'B-held')], fresh).map(h => h.name)).toEqual(['A', 'B-held', 'C']);
    });
    test('one that has not answered yet shows as it was last read, and one never read is not there', () => {
        expect(mergeHosts(refs, [host('a', 'A-held')], new Map()).map(h => h.name)).toEqual(['A-held']);
    });
    test('an answer replaces what was held, and a host switched off since is gone', () => {
        const fresh = new Map([['a', host('a', 'A-new')]]);
        expect(mergeHosts([refs[0]], [host('a', 'A-old'), host('z', 'Z-removed')], fresh).map(h => h.name)).toEqual(['A-new']);
    });
    test('a host that could not be read says why in its own place', () => {
        const h = hostError(refs[1], 'proxmox.connection_error');
        expect(h).toMatchObject({ id: 'b', name: 'B', error: 'proxmox.connection_error', nodes: [], guests: [], stores: [] });
    });
});

describe('the request for the fleet curve', () => {
    test('names each node under its host, escaped, and the range', () => {
        expect(curveQuery('24h', [{ hostId: 'px1', name: 'pve' }, { hostId: 'px2', name: 'a b' }])).toBe('range=24h&nodes=px1/pve,px2/a%20b');
    });
    test('never names more than the server takes', () => {
        const many = Array.from({ length: CURVE_MAX_NODES + 10 }, (_, i) => ({ hostId: 'h', name: `n${i}` }));
        expect(curveQuery('24h', many).split(',').length).toBe(CURVE_MAX_NODES);
    });
});
