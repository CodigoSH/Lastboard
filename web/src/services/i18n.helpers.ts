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
            text = text!.replace(`{${k}}`, params[k]);
        });
    }

    return text;
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
