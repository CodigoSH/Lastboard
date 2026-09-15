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
const formatterCache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat>(
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
 * This is the only place in the app that turns seconds into words. It has to
 * be: it already existed, with these tests, while two components went on
 * dividing by 86400 themselves — one of them printing "16 d" and the other
 * capping at hours, which is how an incident came to be labelled "231 h".
 */
export function formatDuration(locale: string, seconds: number): string {
    const s = Math.max(0, Math.round(seconds));

    // Hours up to two days: "36 hours" reads better than "2 days" for something
    // that is not two days, and days take over once the hours stop being useful.
    const [value, unit]: [number, Intl.NumberFormatOptions['unit']] =
        s < 60 ? [s, 'second']
            : s < 3600 ? [Math.round(s / 60), 'minute']
                : s < 48 * 3600 ? [Math.round(s / 3600), 'hour']
                    : [Math.round(s / 86400), 'day'];

    return formatNumber(locale, value, { style: 'unit', unit, unitDisplay: 'long' });
}

/**
 * How long ago something was.
 *
 * Under a minute there is no number worth showing; the caller says "now". That
 * is the only difference from formatDuration, which answers "45 seconds"
 * because for a length of time that is a real answer.
 */
export function formatSpan(
    locale: string,
    fromMs: number,
    nowMs: number = Date.now(),
): string | null {
    const minutes = Math.max(0, Math.round((nowMs - fromMs) / 60000));
    if (minutes < 1) return null;
    return formatDuration(locale, minutes * 60);
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
