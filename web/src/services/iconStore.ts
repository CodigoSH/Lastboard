import { isDirectIconUrl } from './iconUrl';

/**
 * Keeps a chosen icon on this server instead of pointing at wherever it came
 * from.
 *
 * Provider icons used to be saved as a public CDN URL and re-requested on every
 * board paint: no icons when your own connection is down — which is exactly
 * when you open the dashboard to reach services that are still up — and a
 * standing record, at a third party, of your IP and the services you run.
 *
 * Downloading it once at save time also survives two things a cache wouldn't:
 * an icon whose URL is only reachable from inside your network, and a remote
 * file that later disappears.
 */

/** Icons already served from here need no round trip. */
function isLocal(source: string): boolean {
    return source.startsWith('/api/icons/');
}

/**
 * Returns the URL to store for this icon.
 *
 * Never throws and never blocks a save: if the icon can't be fetched — no
 * network, a host that's down, a file too big — the original source is returned
 * and the bookmark is saved with it, exactly as it behaved before. A missing
 * local copy is worth less than a lost bookmark.
 */
export async function materializeIcon(source: string | null | undefined): Promise<string> {
    const src = (source || '').trim();
    if (!src) return '';
    if (isLocal(src)) return src;

    // A bare provider name is resolved by the caller before it reaches here;
    // anything that still isn't a URL has nothing to download.
    if (!isDirectIconUrl(src)) return src;

    try {
        const res = await fetch('/api/icons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken(),
            },
            body: JSON.stringify({ source: src }),
        });
        if (!res.ok) return src;
        const data = await res.json();
        return typeof data?.url === 'string' && data.url ? data.url : src;
    } catch {
        return src;
    }
}

function csrfToken(): string {
    return document.cookie
        .split('; ')
        .find(r => r.startsWith('csrf_token='))
        ?.split('=')[1] ?? '';
}
