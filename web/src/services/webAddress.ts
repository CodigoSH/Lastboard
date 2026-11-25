/** True for an http(s) address the browser can open: a host with no spaces or stray characters. */
export function isWebAddress(value: string): boolean {
    const text = value.trim();
    // The host is what comes before the path. Some browsers swallow a space in
    // it (and write it as %20), so it is refused here rather than left to `URL`.
    const authority = text.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
    if (authority === '' || /\s/.test(authority)) return false;
    try {
        const u = new URL(text);
        return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== '' && !u.hostname.includes('%');
    } catch {
        return false;
    }
}
