import { describe, expect, test } from 'bun:test';
import { addressAuthority, isWebAddress } from './webAddress';

describe('isWebAddress', () => {
    test('accepts what a browser can open', () => {
        for (const ok of ['http://google.com', 'https://nas', 'http://192.168.1.10:8080/path?q=1', 'http://nas.local:5000/a path', 'https://[::1]:8443', 'http://localhost']) {
            expect(isWebAddress(ok)).toBe(true);
        }
    });

    test('refuses text that is not an address', () => {
        for (const bad of ['http://esto no es una url', 'http://', 'https://', 'http://a b.com', 'http://exa mple', 'http://exa%20mple', 'https://nas /x', '', 'ftp://x.com', 'javascript:alert(1)']) {
            expect(isWebAddress(bad)).toBe(false);
        }
    });
});

describe('addressAuthority', () => {
    // The space rule in isWebAddress reads this part, and a runtime that already
    // refuses a space in `URL` (Bun) would hide it: so it is checked on its own.
    test('is what comes before the path, query and fragment', () => {
        expect(addressAuthority('https://nas.local:5000/a path?q=1#x')).toBe('nas.local:5000');
        expect(addressAuthority('http://exa mple/x')).toBe('exa mple');
        expect(addressAuthority('  http://a.b  ')).toBe('a.b');
    });
});
