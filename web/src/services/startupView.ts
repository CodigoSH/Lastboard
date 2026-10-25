/**
 * Which full-screen page an address asks for, as in `/?view=proxmox`.
 *
 * Pure, so the rule for what counts as a request is one place and has a test. The
 * answer is a name from a closed list, never the raw parameter: an address is typed
 * by anybody and must not choose what the app opens beyond what it knows how to.
 */
const VIEWS = ['proxmox'] as const;
export type StartupView = typeof VIEWS[number];

export function viewFromSearch(search: string): StartupView | null {
    const asked = new URLSearchParams(search).get('view');
    return (VIEWS as readonly string[]).includes(asked ?? '') ? (asked as StartupView) : null;
}

/**
 * The address without the request that was just honoured.
 *
 * A page that stays in the address would open again on every reload, and after
 * closing it the bar would still say it was open. Only `view` is dropped; whatever
 * else the address carried stays.
 */
export function withoutView(pathname: string, search: string, hash: string): string {
    const params = new URLSearchParams(search);
    params.delete('view');
    const rest = params.toString();
    return pathname + (rest ? `?${rest}` : '') + hash;
}
