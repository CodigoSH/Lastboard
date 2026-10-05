import { describe, expect, it } from 'bun:test';
import { proxmoxPayload, type PayloadHost } from './proxmoxPayload';

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
