/**
 * Asking whether the addresses a window proposes answer, with the same probe the
 * status dots use. The question is split the way a board's check splits it, so
 * the quick answers are shown while the slow ones are still being waited for.
 */

/** What the server accepts in one request. */
export const MAX_PROBE = 100;
/** What it probes at once: a group this size answers as one. */
const CHUNK = 10;

/** The hypervisor's own web interface answers to anything, so a console address says nothing. */
const CONSOLE = '/#v1:0:=';

/** The addresses worth asking about: http(s) only, each once, and not a console. */
export function probeable(urls: string[]): string[] {
    const out = new Set<string>();
    for (const u of urls) {
        if (/^https?:\/\/\S+$/i.test(u) && !u.includes(CONSOLE)) out.add(u);
        if (out.size >= MAX_PROBE) break;
    }
    return [...out];
}

export type Probe = (urls: string[]) => Promise<Record<string, string>>;

const realProbe: Probe = async urls => (await import('./dashboardService')).dashboardService.checkHealthBatch(urls);

/**
 * Asks about each address and hands every group's answer to `onAnswer` as it
 * arrives. A group that fails to answer is simply unknown: nothing is thrown.
 * `alive` lets the caller stop wanting the answers (the window moved on).
 */
export async function probeAddresses(
    urls: string[],
    onAnswer: (answers: Record<string, 'up' | 'down'>) => void,
    opts: { probe?: Probe; alive?: () => boolean } = {},
): Promise<void> {
    const probe = opts.probe ?? realProbe;
    const list = probeable(urls);
    for (let i = 0; i < list.length; i += CHUNK) {
        if (opts.alive && !opts.alive()) return;
        try {
            const raw = await probe(list.slice(i, i + CHUNK));
            if (opts.alive && !opts.alive()) return;
            const answers: Record<string, 'up' | 'down'> = {};
            for (const [u, s] of Object.entries(raw ?? {})) if (s === 'up' || s === 'down') answers[u] = s;
            onAnswer(answers);
        } catch { /* these stay unknown */ }
    }
}
