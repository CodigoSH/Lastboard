import { describe, expect, test } from 'bun:test';
import { EMPTY_VIEW, OFFLINE_AFTER, nextRemoteView, remoteErrorKey, remoteSignature, serverLink, telemetrySource } from './remoteTelemetry';

const good = { ok: true, stats: { cpu: 12, ram: 40 } };

describe('source', () => {
    test('anything unknown is this server', () => {
        expect(telemetrySource(undefined)).toBe('local');
        expect(telemetrySource('prometheus')).toBe('local');
        expect(telemetrySource('glances')).toBe('glances');
    });
});

describe('readings', () => {
    test('a missing metric is a grey ring, not a zero', () => {
        const v = nextRemoteView(EMPTY_VIEW, good);
        expect(v.cpu).toBe(12);
        expect(v.temp).toBeNull();
        expect(v.offline).toBe(false);
    });

    test('one lost reading keeps the numbers; the second blanks them', () => {
        let v = nextRemoteView(EMPTY_VIEW, good);
        v = nextRemoteView(v, { ok: false, error: 'unreachable' });
        expect(v.offline).toBe(false);
        expect(v.cpu).toBe(12);
        for (let i = 1; i < OFFLINE_AFTER; i++) v = nextRemoteView(v, { ok: false, error: 'unreachable' });
        expect(v.offline).toBe(true);
        expect(v.cpu).toBeNull();
        expect(v.ram).toBeNull();
    });

    test('a good reading in between resets the count', () => {
        let v = nextRemoteView(EMPTY_VIEW, good);
        v = nextRemoteView(v, { ok: false, error: 'unreachable' });
        v = nextRemoteView(v, good);
        v = nextRemoteView(v, { ok: false, error: 'unreachable' });
        expect(v.offline).toBe(false);
    });

    test('wrong credentials do not wait to be believed', () => {
        const v = nextRemoteView(nextRemoteView(EMPTY_VIEW, good), { ok: false, error: 'auth_rejected' });
        expect(v.offline).toBe(true);
        expect(v.error).toBe('auth_rejected');
    });

    test('a non-number from the server is not a number', () => {
        const v = nextRemoteView(EMPTY_VIEW, { ok: true, stats: { cpu: NaN, ram: '5' as any } });
        expect(v.cpu).toBeNull();
        expect(v.ram).toBeNull();
    });
});

describe('the link', () => {
    test('glances and netdata open their own address', () => {
        expect(serverLink({ source: 'glances', url: 'http://nas:61208' })).toBe('http://nas:61208/');
        expect(serverLink({ source: 'netdata', url: 'https://mon.lan/' })).toBe('https://mon.lan/');
    });
    test('custom opens only the link typed, never the data endpoint', () => {
        expect(serverLink({ source: 'custom', url: 'http://x/api/stats' })).toBeNull();
        expect(serverLink({ source: 'custom', url: 'http://x/api/stats', link: 'http://x/' })).toBe('http://x/');
    });
    test('this server has no link', () => {
        expect(serverLink({ source: 'local', url: 'http://x', link: 'http://x' })).toBeNull();
        expect(serverLink(null)).toBeNull();
    });
    test('only web addresses become links', () => {
        for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://x', 'not a url', 'file:///etc/passwd']) {
            expect(serverLink({ source: 'glances', url: 'http://x', link: bad })).toBeNull();
        }
    });
});

describe('errors and signature', () => {
    test('every failure has a message and unknown ones read as unreachable', () => {
        expect(remoteErrorKey('auth_rejected')).toContain('auth_rejected');
        expect(remoteErrorKey('weird')).toContain('unreachable');
    });
    test('changing where the numbers come from changes the signature; the interval does not', () => {
        const a = remoteSignature({ source: 'glances', url: 'http://a', interval: 5000 });
        expect(remoteSignature({ source: 'glances', url: 'http://a', interval: 60000 })).toBe(a);
        expect(remoteSignature({ source: 'glances', url: 'http://b' })).not.toBe(a);
        expect(remoteSignature({ source: 'netdata', url: 'http://a' })).not.toBe(a);
    });
});
