import { describe, expect, test } from 'bun:test';
import { dockerSettingsPayload, hostIdsToStore, hostsForWidget, type AccountDockerHost } from './dockerHostList';

const host = (over: Partial<AccountDockerHost> = {}): AccountDockerHost => ({
    id: 'a', name: 'A', type: 'agent', url: 'nas:9091', enabled: true, has_token: true, usable: true, ...over,
});

describe('hostsForWidget', () => {
    const all = [host({ id: 'a' }), host({ id: 'b' }), host({ id: 'c', enabled: false }), host({ id: 'd', usable: false })];

    test('no choice means every host that is on and usable', () => {
        expect(hostsForWidget(all).map(h => h.id)).toEqual(['a', 'b']);
        expect(hostsForWidget(all, []).map(h => h.id)).toEqual(['a', 'b']);
    });
    test('a choice narrows it, and never brings back a host that cannot be used', () => {
        expect(hostsForWidget(all, ['b']).map(h => h.id)).toEqual(['b']);
        expect(hostsForWidget(all, ['c', 'd']).map(h => h.id)).toEqual([]);
    });
    test('a host added later joins a widget that never chose', () => {
        expect(hostsForWidget([...all, host({ id: 'e' })]).map(h => h.id)).toEqual(['a', 'b', 'e']);
    });
    test('carries no token', () => {
        expect(JSON.stringify(hostsForWidget(all))).not.toContain('token');
    });
});

describe('hostIdsToStore', () => {
    const all = [host({ id: 'a' }), host({ id: 'b' }), host({ id: 'c', enabled: false })];
    test('everything ticked stores nothing, so later hosts still join', () => {
        expect(hostIdsToStore(all, ['a', 'b'])).toBeUndefined();
    });
    test('a subset is stored', () => {
        expect(hostIdsToStore(all, ['b'])).toEqual(['b']);
    });
});

describe('dockerSettingsPayload', () => {
    test('sends what was typed over the dots', () => {
        const out = dockerSettingsPayload([{ ...host(), tokenBox: 'new' }]).hosts[0];
        expect(out).toMatchObject({ id: 'a', type: 'agent', token: 'new' });
        expect(out.clear_token).toBeUndefined();
    });
    test('an emptied box is the only way to remove a token', () => {
        expect(dockerSettingsPayload([{ ...host(), tokenBox: '' }]).hosts[0]).toMatchObject({ clear_token: true });
    });
    test('dots alone, or a host not touched, say nothing about the token', () => {
        for (const box of ['••••••••', undefined]) {
            const out = dockerSettingsPayload([{ ...host(), tokenBox: box }]).hosts[0];
            expect(out.token).toBeUndefined();
            expect(out.clear_token).toBeUndefined();
        }
    });
    test('only an agent has a token, and a local socket has no address', () => {
        const out = dockerSettingsPayload([{ ...host({ type: 'local', url: 'x' }), tokenBox: 'zzz' }]).hosts[0];
        expect(out.token).toBeUndefined();
        expect(out.url).toBe('');
    });
});
