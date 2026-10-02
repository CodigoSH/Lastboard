/**
 * Runs a request again, after a short wait, when the server says it is being
 * asked too fast.
 *
 * The server lets one address make about twenty requests a second. An import
 * of a hundred bookmarks makes a hundred of them back to back, and the last
 * ones were refused with a 429 — halfway through building a dashboard, with the
 * clean-up that was meant to tidy the rest refused as well. Waiting for the
 * allowance to refill is what the response asks for.
 *
 * Only that answer is retried. Any other failure is real and comes straight back.
 */
export const RATE_LIMITED = 'error.rate_limited';

export async function retryOnRateLimit<T>(
    run: () => Promise<T>,
    options: { attempts?: number; waitMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
    const attempts = options.attempts ?? 12;
    const waitMs = options.waitMs ?? 150;
    const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));

    for (let attempt = 1; ; attempt++) {
        try {
            return await run();
        } catch (err) {
            const limited = (err as Error)?.message === RATE_LIMITED;
            if (!limited || attempt >= attempts) throw err;
            // A little longer each time, so a busy second does not keep us
            // retrying into the same wall.
            await sleep(waitMs * attempt);
        }
    }
}
