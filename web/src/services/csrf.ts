/**
 * Reads the CSRF token the server set as a cookie.
 *
 * Every state-changing request has to echo it back in `X-CSRF-Token`, so this
 * had been written out five times across services, widgets and components — and
 * the copies had already drifted: some decoded the value, some didn't. Today's
 * token is 64 hex characters, so the difference is invisible; it would stop
 * being invisible the day the format changed, which is a poor way to find out.
 *
 * Returns an empty string when there is no cookie. Callers send it anyway and
 * let the server answer 403, which is the honest outcome for a request made
 * without a session.
 */
export function csrfToken(): string {
    const match = document.cookie
        .split('; ')
        .find(c => c.startsWith('csrf_token='));
    return match ? decodeURIComponent(match.slice('csrf_token='.length)) : '';
}
