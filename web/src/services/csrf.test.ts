import { afterEach, describe, expect, test } from 'bun:test';
import { csrfToken } from './csrf';

/** Stands in for document.cookie, which bun:test has no DOM for. */
function withCookies(value: string) {
    (globalThis as any).document = { cookie: value };
}

afterEach(() => {
    delete (globalThis as any).document;
});

describe('csrfToken', () => {
    test('reads the token out of a cookie jar', () => {
        withCookies('session=abc; csrf_token=deadbeef; theme=dark');
        expect(csrfToken()).toBe('deadbeef');
    });

    test('finds it when it is the only cookie', () => {
        withCookies('csrf_token=deadbeef');
        expect(csrfToken()).toBe('deadbeef');
    });

    test('no cookie means an empty string, not a crash', () => {
        withCookies('session=abc');
        expect(csrfToken()).toBe('');
    });

    test('an empty jar means an empty string', () => {
        withCookies('');
        expect(csrfToken()).toBe('');
    });

    test('a cookie merely ending in the name is not it', () => {
        // "x_csrf_token" contains the name but is a different cookie.
        withCookies('x_csrf_token=wrong; csrf_token=right');
        expect(csrfToken()).toBe('right');
    });

    test('percent-encoding is undone', () => {
        // Today's token is hex, so this never bites — which is exactly why the
        // copies that skipped decoding looked correct for years.
        withCookies('csrf_token=a%2Bb%2Fc');
        expect(csrfToken()).toBe('a+b/c');
    });

    test('a value containing = survives', () => {
        // Splitting on "=" and taking [1] would have truncated this.
        withCookies('csrf_token=YWJj==');
        expect(csrfToken()).toBe('YWJj==');
    });
});
