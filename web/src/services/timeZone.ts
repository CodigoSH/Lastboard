/**
 * Time zone helpers.
 *
 * Kept out of the widget so it can be tested without pulling in the i18n
 * singleton (which touches fetch and localStorage on import).
 */

// Intl rejects unknown zones by throwing, and constructing a formatter is not
// free, so remember the verdict: callers run once per second.
const supportCache = new Map<string, boolean>();

/** True when the runtime's Intl accepts this IANA time zone name. */
export function isSupportedTimeZone(tz: string): boolean {
    const cached = supportCache.get(tz);
    if (cached !== undefined) return cached;

    let supported: boolean;
    try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        supported = true;
    } catch {
        supported = false;
    }
    supportCache.set(tz, supported);
    return supported;
}

/**
 * Resolves a configured time zone to a value safe to hand to Intl, or
 * `undefined` to mean "use the browser's local zone".
 *
 * The configured zone is not picked from a closed list — it comes from an
 * external API — so an unusable value can reach the config and must not be
 * allowed to throw mid-render.
 */
export function resolveTimeZone(tz?: string | null): string | undefined {
    if (!tz || tz === 'local') return undefined;
    if (typeof tz !== 'string') return undefined;
    return isSupportedTimeZone(tz) ? tz : undefined;
}
