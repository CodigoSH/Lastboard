import { describe, it, expect } from 'bun:test';
import { translate, sortLocales, resolveLanguage, formatDateTime, formatNumber, directionOf, formatSpan, formatDuration } from './i18n.helpers';

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

    // The value comes back wrapped in FIRST STRONG ISOLATE … POP DIRECTIONAL
    // ISOLATE. They are invisible, and they are what keeps the punctuation
    // beside the value from drifting when the sentence reads right to left —
    // see i18n-isolate.test.ts.
    it('interpolates a single param', () => {
        expect(translate('welcome', es, en, { name: 'Ana' })).toBe('Welcome \u2068Ana\u2069');
    });

    it('interpolates multiple params', () => {
        expect(translate('multi', es, en, { a: 'X', b: 'Y' })).toBe('\u2068X\u2069 and \u2068Y\u2069');
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

describe('directionOf', () => {
    it('knows the languages Lastboard ships that read right to left', () => {
        expect(directionOf('ar')).toBe('rtl');
        expect(directionOf('fa')).toBe('rtl');
        expect(directionOf('ur')).toBe('rtl');
    });

    it('leaves everything else alone', () => {
        expect(directionOf('en')).toBe('ltr');
        expect(directionOf('es')).toBe('ltr');
        expect(directionOf('ja')).toBe('ltr');
    });

    it('ignores the region and the case', () => {
        expect(directionOf('ar-EG')).toBe('rtl');
        expect(directionOf('AR')).toBe('rtl');
        expect(directionOf('en-GB')).toBe('ltr');
    });
});

describe('formatSpan', () => {
    const now = new Date('2026-09-14T12:00:00Z').getTime();
    const ago = (minutes: number) => now - minutes * 60_000;

    it('says nothing under a minute, so the caller can say "now"', () => {
        expect(formatSpan('en', ago(0), now)).toBeNull();
        expect(formatSpan('en', ago(0.4), now)).toBeNull();
    });

    it('counts minutes, then hours, then days', () => {
        expect(formatSpan('en', ago(5), now)).toBe('5 minutes');
        expect(formatSpan('en', ago(90), now)).toBe('2 hours');
        expect(formatSpan('en', ago(24 * 60), now)).toBe('24 hours');
        // Two days is where hours stop being worth reading.
        expect(formatSpan('en', ago(47 * 60), now)).toBe('47 hours');
        expect(formatSpan('en', ago(7 * 24 * 60), now)).toBe('7 days');
        expect(formatSpan('en', ago(30 * 24 * 60), now)).toBe('30 days');
    });

    // The monitoring strip printed "720h" and "168h" for the 30-day and 7-day
    // ranges. Nobody reads a month out of 720.
    it('never leaves the reader dividing by 24', () => {
        for (const days of [7, 14, 30]) {
            const out = formatSpan('en', ago(days * 24 * 60), now) as string;
            expect(out).toContain('day');
            expect(out).not.toContain('h');
        }
    });

    it('speaks the language it is given, with no key to translate', () => {
        expect(formatSpan('es', ago(30 * 24 * 60), now)).toBe('30 días');
        expect(formatSpan('de', ago(30 * 24 * 60), now)).toBe('30 Tage');
        expect(formatSpan('fr', ago(24 * 60), now)).toContain('heures');
    });

    it('does not go negative when the clock disagrees with the server', () => {
        expect(formatSpan('en', now + 60_000, now)).toBeNull();
    });
});

describe('formatDuration', () => {
    it('counts seconds, then minutes, then hours, then days', () => {
        expect(formatDuration('en', 45)).toBe('45 seconds');
        expect(formatDuration('en', 5 * 60)).toBe('5 minutes');
        expect(formatDuration('en', 90 * 60)).toBe('2 hours');
        // Two days is where hours stop being worth reading.
        expect(formatDuration('en', 47 * 3600)).toBe('47 hours');
        expect(formatDuration('en', 16 * 86400)).toBe('16 days');
    });

    // The two bugs this exists to stop: a Proxmox node up for sixteen days
    // reading "16 d", and a nine-day outage reading "231 h".
    it('never hands the reader arithmetic', () => {
        expect(formatDuration('es', 16 * 86400)).toBe('16 días');
        expect(formatDuration('es', 231 * 3600)).toBe('10 días');
    });

    // A translated key of ours would carry one plural form per language and be
    // wrong in at least five of the twenty. This is why it is Intl.
    //
    // Note there is no one-day case to assert: hours run to 48, so the day unit
    // starts at 2 and "1 day" is unreachable. Russian still exercises the
    // singular, because 21 takes its "one" form.
    it('gets the plural right where a key of ours would not', () => {
        expect(formatDuration('es', 2 * 86400)).toBe('2 días');
        expect(formatDuration('ru', 2 * 86400)).toBe('2 дня');
        expect(formatDuration('ru', 5 * 86400)).toBe('5 дней');
        expect(formatDuration('ru', 21 * 86400)).toBe('21 день');
        // Polish says "dób", not the colloquial "dni": CLDR picks *doba*, the
        // word for a 24-hour period, which is what a duration actually is.
        // Left asserted rather than "fixed" — hand-maintaining plural tables
        // for twenty languages is the thing this formatter exists to avoid.
        expect(formatDuration('pl', 5 * 86400)).toBe('5 dób');
        expect(formatDuration('ru', 60)).toBe('1 минута');
    });

    it('does not go negative', () => {
        expect(formatDuration('en', -10)).toBe('0 seconds');
    });
});
