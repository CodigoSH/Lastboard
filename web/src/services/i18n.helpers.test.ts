import { describe, it, expect } from 'bun:test';
import { translate, sortLocales, resolveLanguage, formatDateTime, formatNumber } from './i18n.helpers';

describe('translate', () => {
    const en = { greeting: 'Hello', welcome: 'Welcome {name}', multi: '{a} and {b}' };
    const es = { greeting: 'Hola' };

    it('returns the current-language value when present', () => {
        expect(translate('greeting', es, en)).toBe('Hola');
    });

    it('falls back to the reference table when the key is missing', () => {
        expect(translate('welcome', es, en)).toBe('Welcome {name}');
    });

    it('returns the key itself when missing everywhere', () => {
        expect(translate('nope', es, en)).toBe('nope');
    });

    it('interpolates a single param', () => {
        expect(translate('welcome', es, en, { name: 'Ana' })).toBe('Welcome Ana');
    });

    it('interpolates multiple params', () => {
        expect(translate('multi', es, en, { a: 'X', b: 'Y' })).toBe('X and Y');
    });

    it('handles an undefined current table', () => {
        expect(translate('greeting', undefined, en)).toBe('Hello');
    });

    it('returns the key when both tables are undefined', () => {
        expect(translate('greeting', undefined, undefined)).toBe('greeting');
    });
});

describe('sortLocales', () => {
    it('puts Latin-script names before non-Latin, each alphabetical', () => {
        const input = [
            { name: 'Русский' },
            { name: 'English' },
            { name: 'العربية' },
            { name: 'Català' },
        ];
        const out = sortLocales(input).map((l) => l.name);
        expect(out).toEqual(['Català', 'English', 'Русский', 'العربية']);
    });

    it('is case-insensitive within the Latin group', () => {
        const input = [{ name: 'banana' }, { name: 'Apple' }];
        expect(sortLocales(input).map((l) => l.name)).toEqual(['Apple', 'banana']);
    });

    it('does not mutate the input array', () => {
        const input = [{ name: 'B' }, { name: 'A' }];
        sortLocales(input);
        expect(input.map((l) => l.name)).toEqual(['B', 'A']);
    });
});

describe('resolveLanguage', () => {
    const codes = ['en', 'es', 'de'];

    it('prefers a saved choice when supported', () => {
        expect(resolveLanguage('de', 'es', codes)).toBe('de');
    });

    it('ignores an unsupported saved choice and uses the browser language', () => {
        expect(resolveLanguage('xx', 'es', codes)).toBe('es');
    });

    it('falls back to English when neither is supported', () => {
        expect(resolveLanguage(null, 'fr', codes)).toBe('en');
    });

    it('uses the browser language when nothing is saved', () => {
        expect(resolveLanguage(null, 'de', codes)).toBe('de');
    });
});

describe('formatting in the language the user picked', () => {
    // The whole point: the browser's language must not decide this. Someone
    // running Lastboard in Spanish on an English system was seeing English
    // month names and decimal points where their numbers use commas.
    const when = new Date(Date.UTC(2026, 2, 9, 15, 4, 0));
    const options: Intl.DateTimeFormatOptions = { month: 'long', timeZone: 'UTC' };

    it('formats the same date differently for different languages', () => {
        expect(formatDateTime('es', when, options)).toBe('marzo');
        expect(formatDateTime('en', when, options)).toBe('March');
        expect(formatDateTime('de', when, options)).toBe('März');
    });

    it('formats numbers with the separators of each language', () => {
        expect(formatNumber('en', 1234567.5)).toBe('1,234,567.5');
        expect(formatNumber('es', 1234567.5)).toBe('1.234.567,5');
    });

    it('falls back instead of throwing on a locale it does not know', () => {
        expect(() => formatDateTime('not-a-locale!!', when, options)).not.toThrow();
        expect(formatNumber('not-a-locale!!', 42)).toContain('42');
    });

    it('gives an empty string for a date that is not one, rather than "Invalid Date"', () => {
        expect(formatDateTime('en', new Date('nonsense'))).toBe('');
    });

    it('does not choke on infinity', () => {
        expect(formatNumber('en', Infinity)).toBe('Infinity');
    });
});
