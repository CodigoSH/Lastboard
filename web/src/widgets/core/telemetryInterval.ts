/**
 * How often the Server Health widget refreshes, in milliseconds.
 *
 * One list for every source of the widget — this server's own stream and a
 * remote one alike — so the setting means the same thing wherever the numbers
 * come from. Faster than five seconds shows nothing a person can read, and for
 * a remote server it is a request every second to somebody else's machine.
 *
 * Widgets saved before the list was narrowed carry 1000 or 2000. They are not
 * rewritten: they are read as the nearest value on the list, so they keep
 * working and the selector shows what they actually do.
 */
export const TELEMETRY_INTERVALS = [5000, 10000, 30000, 60000] as const;

export const DEFAULT_TELEMETRY_INTERVAL = 5000;

export function telemetryInterval(raw: unknown): number {
    const n = typeof raw === 'string' ? parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN;
    if (!Number.isFinite(n)) return DEFAULT_TELEMETRY_INTERVAL;
    let best: number = TELEMETRY_INTERVALS[0];
    for (const v of TELEMETRY_INTERVALS) {
        // Strictly closer wins, so a tie goes to the shorter wait.
        if (Math.abs(v - n) < Math.abs(best - n)) best = v;
    }
    return best;
}
