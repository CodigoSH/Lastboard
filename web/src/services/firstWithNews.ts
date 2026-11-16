/**
 * When several hosts were added at once, the window that opens by itself is for the first one with something
 * to offer, not for the first one: asking them in order and stopping at the first that has news is one window,
 * and it is never an empty one. The others stay one click away, in the window's own list of hosts.
 *
 * `hasNews` is asked one host at a time, in order, and not again once one answers yes; a host that cannot be
 * read (it throws) is skipped, since it has nothing to say.
 */
export async function firstWithNews(ids: string[], hasNews: (id: string) => Promise<boolean>): Promise<string | null> {
    for (const id of ids) {
        try {
            if (await hasNews(id)) return id;
        } catch { /* it could not be read: next */ }
    }
    return null;
}
