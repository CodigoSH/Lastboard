import { describe, expect, test } from 'bun:test';
import { logoutDestination } from './logoutDestination';

describe('logoutDestination', () => {
    test('a plain sign-out goes to the sign-in page', () => {
        expect(logoutDestination('')).toBe('/login');
        expect(logoutDestination('{}')).toBe('/login');
    });
    test("behind a proxy, the proxy's own sign-out", () => {
        expect(logoutDestination('{"logout_url":"https://auth.example.lan/logout"}')).toBe('https://auth.example.lan/logout');
    });
    test('never an address that is not http or https', () => {
        expect(logoutDestination('{"logout_url":"javascript:alert(1)"}')).toBe('/login');
        expect(logoutDestination('{"logout_url":"//evil.example"}')).toBe('/login');
    });
});
