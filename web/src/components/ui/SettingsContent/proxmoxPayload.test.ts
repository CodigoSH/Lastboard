import { describe, expect, it } from 'bun:test';
import { proxmoxPayload, type PayloadHost, newProxmoxHostIds } from './proxmoxPayload';

const host = (extra: Partial<PayloadHost> = {}): PayloadHost => ({
    id: 'px1', name: 'Lab', url: 'https://pve:8006', token_id: 'lb@pve!lb', insecure: true, enabled: true, ...extra,
});

describe('proxmoxPayload', () => {
    it('sends what was typed over the dots', () => {
        expect(proxmoxPayload([host({ secret: 'new' })]).hosts[0]).toMatchObject({ secret: 'new', clear_secret: false });
    });

    it('sends the mark for an emptied box, which is the only way a secret is removed', () => {
        expect(proxmoxPayload([host({ clear_secret: true })]).hosts[0]).toMatchObject({ secret: '', clear_secret: true });
    });

    it('says nothing about a host that was not touched', () => {
        expect(proxmoxPayload([host()]).hosts[0]).toMatchObject({ secret: '', clear_secret: false });
    });
});

describe('newProxmoxHostIds', () => {
    const h = (id: string, o: { enabled?: boolean; has_secret?: boolean } = {}) => ({ id, enabled: true, has_secret: true, ...o });
    it('a hypervisor that was not there before is new', () => {
        expect(newProxmoxHostIds([{ id: 'a' }], [h('a'), h('b')])).toEqual(['b']);
    });
    it('one that was only edited is not', () => {
        expect(newProxmoxHostIds([{ id: 'a' }], [h('a')])).toEqual([]);
    });
    it('one that is off, or has no secret to read it with, is not offered', () => {
        expect(newProxmoxHostIds([], [h('a', { enabled: false }), h('b', { has_secret: false }), h('c')])).toEqual(['c']);
    });
});
