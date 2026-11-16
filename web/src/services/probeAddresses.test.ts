import { describe, expect, test } from 'bun:test';
import { probeable, probeAddresses, MAX_PROBE } from './probeAddresses';

describe('what is worth asking about', () => {
    test('http(s) only, once each, and never a hypervisor console', () => {
        expect(probeable([
            'http://a.lan', 'http://a.lan', 'https://b.lan:8443', 'ftp://c', 'javascript:alert(1)', '', 'http://',
            'https://pve.lan:8006/#v1:0:=lxc%2F106',
        ])).toEqual(['http://a.lan', 'https://b.lan:8443']);
    });
    test('no more than the server takes in a request', () => {
        const many = Array.from({ length: 250 }, (_, i) => `http://h${i}.lan`);
        expect(probeable(many).length).toBe(MAX_PROBE);
    });
});

describe('asking', () => {
    test('in groups, handing over each answer as it comes, and keeping only up or down', async () => {
        const asked: string[][] = [];
        const got: Record<string, string>[] = [];
        const urls = Array.from({ length: 23 }, (_, i) => `http://h${i}.lan`);
        await probeAddresses(urls, a => got.push(a), {
            probe: async u => { asked.push(u); return Object.fromEntries(u.map(x => [x, x.endsWith('1.lan') ? 'down' : x.endsWith('2.lan') ? 'weird' : 'up'])); },
        });
        expect(asked.map(a => a.length)).toEqual([10, 10, 3]);
        expect(got.length).toBe(3);
        expect(got[0]['http://h1.lan']).toBe('down');
        expect(got[0]['http://h2.lan']).toBeUndefined();
        expect(got[0]['http://h0.lan']).toBe('up');
    });
    test('a group that fails leaves its addresses unknown and the rest still answer', async () => {
        let n = 0;
        const got: Record<string, string>[] = [];
        await probeAddresses(Array.from({ length: 12 }, (_, i) => `http://h${i}.lan`), a => got.push(a), {
            probe: async u => { if (n++ === 0) throw new Error('x'); return Object.fromEntries(u.map(x => [x, 'up'])); },
        });
        expect(got.length).toBe(1);
        expect(Object.keys(got[0])).toEqual(['http://h10.lan', 'http://h11.lan']);
    });
    test('stops when the caller no longer wants the answers', async () => {
        let alive = true;
        const got: unknown[] = [];
        await probeAddresses(Array.from({ length: 30 }, (_, i) => `http://h${i}.lan`), a => got.push(a), {
            probe: async u => { alive = false; return Object.fromEntries(u.map(x => [x, 'up'])); },
            alive: () => alive,
        });
        expect(got.length).toBe(0);
    });
});
