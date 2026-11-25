/** The part of an address before its path: user, host and port. */
export function addressAuthority(value: string): string {
    return value.trim().replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
}

/** True for an http(s) address the browser can open: a host with no spaces or stray characters. */
export function isWebAddress(value: string): boolean {
    const text = value.trim();
    // Some browsers swallow a space in the host (and write it as %20), so it is
    // refused here rather than left to `URL`.
    const authority = addressAuthority(text);
    if (authority === '' || /\s/.test(authority)) return false;
    try {
        const u = new URL(text);
        return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== '' && !u.hostname.includes('%');
    } catch {
        return false;
    }
}
