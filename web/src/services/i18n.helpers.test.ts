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

    // One unit, deliberately: this labels a span, and "the last 30 days and 4
    // hours" is noise. formatDuration is the one that says both.
    it('counts minutes, then hours, then days, in a single unit', () => {
        expect(formatSpan('en', ago(5), now)).toBe('5 minutes');
        expect(formatSpan('en', ago(90), now)).toBe('2 hours');
        expect(formatSpan('en', ago(24 * 60), now)).toBe('1 day');
        expect(formatSpan('en', ago(47 * 60), now)).toBe('2 days');
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
        // 24 hours is a day now, so French says "jour" — the assertion moved
        // with the threshold rather than the threshold with the assertion.
        // The space is U+00A0: French does not let a unit break away from its
        // number, and a plain ' ' here fails with two strings that look
        // character for character identical in the diff.
        expect(formatSpan('fr', ago(24 * 60), now)).toBe('1\u00a0jour');
        expect(formatSpan('fr', ago(3 * 60), now)).toContain('heures');
    });

    it('does not go negative when the clock disagrees with the server', () => {
        expect(formatSpan('en', now + 60_000, now)).toBeNull();
    });
});

describe('formatDuration', () => {
    it('says the unit and what is left over in the next one down', () => {
        expect(formatDuration('en', 45)).toBe('45 seconds');
        expect(formatDuration('en', 90)).toBe('1 minute and 30 seconds');
        expect(formatDuration('en', 90 * 60)).toBe('1 hour and 30 minutes');
        expect(formatDuration('en', 47 * 3600)).toBe('1 day and 23 hours');
    });

    // A clean figure stays clean: nobody writes "2 days and 0 hours".
    it('drops the second unit when there is no remainder', () => {
        expect(formatDuration('en', 5 * 60)).toBe('5 minutes');
        expect(formatDuration('en', 3 * 3600)).toBe('3 hours');
        expect(formatDuration('en', 16 * 86400)).toBe('16 days');
    });

    // The bugs this exists to stop: a node up for sixteen days reading "16 d",
    // a nine-day outage reading "231 h", and an uptime of just over a day
    // reading "25 hours" — each of them asking the reader to divide.
    it('never hands the reader arithmetic', () => {
        expect(formatDuration('es', 16 * 86400)).toBe('16 días');
        expect(formatDuration('es', 231 * 3600)).toBe('9 días y 15 horas');
        expect(formatDuration('es', 25 * 3600)).toBe('1 día y 1 hora');
    });

    // Rounding the remainder can fill the unit above it. "1 day and 24 hours"
    // is a sentence no one should ever read.
    it('carries when the remainder rounds up into the unit above', () => {
        expect(formatDuration('en', 86400 + 23 * 3600 + 59 * 60)).toBe('2 days');
        expect(formatDuration('en', 3600 + 59 * 60 + 40)).toBe('2 hours');
    });

    // The conjunction is the language's own, and so is where it goes.
    it('joins the two the way the language joins a list', () => {
        expect(formatDuration('en', 25 * 3600)).toBe('1 day and 1 hour');
        expect(formatDuration('ru', 25 * 3600)).toBe('1 день и 1 час');
        // Arabic drops the numeral in its "one" form, and joins without a
        // space before the conjunction. Neither is something we could get
        // right by writing " y " ourselves.
        expect(formatDuration('ar', 25 * 3600)).toBe('يوم وساعة');
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
        // Polish is whatever the runtime's CLDR says, and it changed: ICU 75
        // (Bun 1.3) said "dób", from *doba*; ICU 78 (Bun 1.4, and Chrome 154,
        // where this code actually runs) says "dni". Measured on both, 28 Sep
        // 2026. Asserted rather than hand-corrected either way — maintaining
        // plural tables for twenty languages is what this formatter avoids —
        // so a runtime update that moves it again fails here first.
        expect(formatDuration('pl', 5 * 86400)).toBe('5 dni');
        expect(formatDuration('ru', 60)).toBe('1 минута');
    });

    // A stopped clock read "0 days" while this floored at index 0, which is
    // days rather than the smallest unit.
    it('does not go negative, and floors at seconds rather than days', () => {
        expect(formatDuration('en', -10)).toBe('0 seconds');
        expect(formatDuration('en', 0)).toBe('0 seconds');
        expect(formatDuration('en', 1)).toBe('1 second');
    });
});
