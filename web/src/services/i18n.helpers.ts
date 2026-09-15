/**
 * Pure helpers for the i18n service.
 *
 * These are deliberately kept free of any environment access (no localStorage,
 * navigator, fetch or singletons) so they can be unit-tested in isolation and
 * reused by I18nService without triggering its side-effectful initialization.
 */

/**
 * Resolve a translation key against the current locale, falling back to the
 * English table, and finally to the key itself. Interpolates `{name}` params.
 */
/**
 * Whether a locale table that just arrived belongs to this build.
 *
 * The locale URL already carries the build stamp, and that stamp is a hash of
 * the whole output, so the URL is correct by construction. What it cannot do is
 * survive a cache that answers by path and ignores the query - a proxy keyed on
 * $uri, an edge rule with "ignore query string". The file is served with
 * "immutable, max-age=31536000", so such a cache pins it for a year.
 *
 * Measured in Sept-2026: a browser handed the app a dictionary from v1.7.5 while
 * running the 1.8.0 bundle. Everything added since rendered as its raw key, and
 * nothing in the app noticed, because a missing key and an old file look exactly
 * alike from translate(). The stamp inside the file is what tells them apart.
 *
 * "dev" means the sources are running outside a build (tests, ts-node), where no
 * file carries a stamp and there is nothing to compare against.
 */
export function localeIsStale(fileStamp: unknown, buildStamp: string): boolean {
    if (!buildStamp || buildStamp === 'dev') return false;
    return fileStamp !== buildStamp;
}

export function translate(
    key: string,
    current: Record<string, string> | undefined,
    fallback: Record<string, string> | undefined,
    params?: Record<string, string>,
): string {
    let text = current?.[key];

    // Fallback to the reference table (English) if missing.
    if (!text && fallback) {
        text = fallback[key];
    }

    // Return the key itself if still missing.
    if (!text) return key;

    if (params) {
        Object.keys(params).forEach((k) => {
            text = text!.replace(`{${k}}`, isolate(params[k]));
        });
    }

    return text;
}

/**
 * Wraps an interpolated value in FIRST STRONG ISOLATE … POP DIRECTIONAL ISOLATE.
 *
 * A value dropped into a translated sentence carries its own direction: a
 * version number or a count is left-to-right inside an Arabic sentence. Without
 * the isolate, the neutral characters around it — the comma, the colon, the
 * full stop — are placed by the direction of the paragraph rather than of the
 * value, so the punctuation drifts to the wrong end and a list of otherwise
 * correct strings comes out with two different alignments.
 *
 * The characters are invisible and inert in a left-to-right interface, so this
 * costs nothing in the other nineteen languages.
 */
function isolate(value: string): string {
    return `\u2068${value}\u2069`;
}

/**
 * Sort locales for display: Latin-script names first (alphabetical), then
 * non-Latin names (alphabetical). Pure — returns a new array.
 */
export function sortLocales<T extends { name: string }>(locales: T[]): T[] {
    const isLatin = (str: string) => /^[a-zA-Z]/.test(str);

    return [...locales].sort((a, b) => {
        const aIsLatin = isLatin(a.name);
        const bIsLatin = isLatin(b.name);

        if (aIsLatin && !bIsLatin) return -1;
        if (!aIsLatin && bIsLatin) return 1;

        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

/**
 * Decide which language to use at startup. Prefers an explicitly saved choice,
 * then the browser language, then English — but only when supported.
 */
export function resolveLanguage(
    saved: string | null,
    browserLang: string,
    availableCodes: string[],
): string {
    if (saved && availableCodes.includes(saved)) return saved;
    if (availableCodes.includes(browserLang)) return browserLang;
    return 'en';
}

/**
 * Date, time and number formatting in the language the user picked.
 *
 * Calling `toLocaleString()` with no argument formats in the *browser's*
 * language, which is not necessarily the app's: someone running Lastboard in
 * Spanish on an English system saw English month names and dots where their
 * numbers use commas. These take the app's language, so the whole interface
 * agrees with itself.
 *
 * The formatters are cached because building one is expensive and the monitor
 * tooltips ask for the same one once per heartbeat.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat | Intl.ListFormat>();

function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat | Intl.ListFormat>(
    kind: string,
    locale: string,
    options: object | undefined,
    build: () => T,
): T | null {
    const key = `${kind}|${locale}|${JSON.stringify(options ?? {})}`;
    const hit = formatterCache.get(key);
    if (hit) return hit as T;

    try {
        const made = build();
        formatterCache.set(key, made);
        return made;
    } catch {
        // An unknown locale tag, or options this engine does not support.
        // The caller falls back to the browser's own formatting rather than
        // showing nothing.
        return null;
    }
}

export function formatDateTime(
    locale: string,
    value: Date,
    options?: Intl.DateTimeFormatOptions,
): string {
    if (isNaN(value.getTime())) return '';
    const formatter = cached('date', locale, options, () => new Intl.DateTimeFormat(locale, options));
    return formatter ? formatter.format(value) : value.toLocaleString();
}

export function formatNumber(
    locale: string,
    value: number,
    options?: Intl.NumberFormatOptions,
): string {
    if (!isFinite(value)) return String(value);
    const formatter = cached('number', locale, options, () => new Intl.NumberFormat(locale, options));
    return formatter ? formatter.format(value) : value.toLocaleString();
}

/**
 * A length of time, in a unit a person reads without arithmetic.
 *
 * The monitoring strip printed hours whatever the number, so a month of history
 * was labelled "720h" and a week "168h" — true, and useless. Intl says it in the
 * app's own language, so this needs no translation key of its own: "30 days",
 * "30 días", "30 Tage" — and it gets the plural right in all twenty, including
 * the three Russian forms and the six Arabic ones, which a key of ours would
 * not. That is the whole reason this is Intl and not a translated string.
 *
 * Two units by default, because one leaves the reader doing the division the
 * other way: "25 hours" is a day and an hour, and saying so costs nothing. The
 * second unit is dropped when it is zero, so a clean figure stays clean —
 * "2 days", not "2 days and 0 hours".
 *
 * This is the only place in the app that turns seconds into words. It has to
 * be: it already existed, with these tests, while two components went on
 * dividing by 86400 themselves — one of them printing "16 d" and the other
 * capping at hours, which is how an incident came to be labelled "231 h".
 */
/** Seconds in each unit, largest first. */
const durationUnits: [number, Intl.NumberFormatOptions['unit']][] = [
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second'],
];

const oneUnit = (locale: string, value: number, unit: Intl.NumberFormatOptions['unit']) =>
    formatNumber(locale, value, { style: 'unit', unit, unitDisplay: 'long' });

/**
 * Two figures joined the way the language joins a list.
 *
 * Not " y " and not " and ": Intl.ListFormat knows the conjunction for all
 * twenty, puts it where the language puts it, and in Arabic joins without the
 * space that Spanish needs. One more thing not to translate by hand.
 */
function joinUnits(locale: string, parts: string[]): string {
    const formatter = cached('list', locale, { style: 'long', type: 'conjunction' },
        () => new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }));
    return formatter ? formatter.format(parts) : parts.join(' ');
}

export function formatDuration(locale: string, seconds: number, units: 1 | 2 = 2): string {
    const s = Math.max(0, Math.round(seconds));

    // The largest unit that has at least one of itself in there. Nothing fits
    // in zero, and the floor has to be the SMALLEST unit rather than index 0,
    // which is days: a stopped clock would have read "0 days".
    const found = durationUnits.findIndex(([size]) => s >= size);
    const top = found === -1 ? durationUnits.length - 1 : found;
    const [size, unit] = durationUnits[top];

    if (units === 1) return oneUnit(locale, Math.round(s / size), unit);

    const whole = Math.floor(s / size);
    const next = durationUnits[top + 1];
    if (!next) return oneUnit(locale, whole, unit);

    const rest = Math.round((s - whole * size) / next[0]);
    // The carry: rounding the remainder can fill the unit above it, and
    // "1 day and 24 hours" is a sentence no one should ever read.
    if (rest * next[0] >= size) return oneUnit(locale, whole + 1, unit);
    if (rest === 0) return oneUnit(locale, whole, unit);

    return joinUnits(locale, [oneUnit(locale, whole, unit), oneUnit(locale, rest, next[1])]);
}

/**
 * How long ago something was.
 *
 * One unit, not two. This labels a span — "the last 30 days" — where the odd
 * four hours on the end is noise; formatDuration answers "1 day and 1 hour"
 * because there the remainder is the thing being asked about.
 *
 * And under a minute there is no number worth showing: the caller says "now".
 */
export function formatSpan(
    locale: string,
    fromMs: number,
    nowMs: number = Date.now(),
): string | null {
    const minutes = Math.max(0, Math.round((nowMs - fromMs) / 60000));
    if (minutes < 1) return null;
    return formatDuration(locale, minutes * 60, 1);
}

/**
 * The languages Lastboard ships that are written right to left.
 *
 * Kept as a list rather than asked of Intl, because Intl.Locale's textInfo is
 * still missing in Firefox, and this list changes about as often as the set of
 * shipped languages does.
 */
const rightToLeft = new Set(['ar', 'fa', 'ur', 'he']);

/** Reading direction for a language code, for the `dir` attribute. */
export function directionOf(language: string): 'rtl' | 'ltr' {
    return rightToLeft.has(language.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr';
}
