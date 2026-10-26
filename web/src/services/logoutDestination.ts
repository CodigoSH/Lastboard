/**
 * Where the browser goes after signing out.
 *
 * Behind a proxy that signs people in, signing out of Lastboard alone is undone
 * by the next request, so the server answers with the proxy's own sign-out
 * address and the page goes there. Anything else — no answer, an empty one, an
 * address that is not http or https — means the sign-in page.
 */
export function logoutDestination(body: string): string {
    try {
        const url = JSON.parse(body)?.logout_url;
        if (typeof url === 'string' && /^https?:\/\//i.test(url)) return url;
    } catch { /* not JSON: a plain sign-out */ }
    return '/login';
}
