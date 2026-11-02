/**
 * What the infrastructure widgets and the pages behind them have read, kept in one place so the two
 * do not each ask for the same thing.
 *
 * Two small things. A reading in flight is shared: a second asker for the same thing gets the
 * request already on its way, so a board with two Docker tiles and the page open on top of it makes
 * one request, not three. And the last reading is held for a while: a page that opens from a tile
 * starts from what the tile last read and draws at once, where it used to start empty and wait.
 * The page still asks afresh the moment it opens; the held reading is only what it shows until
 * that answer arrives.
 */

export type ReadingKind = 'proxmox' | 'docker' | 'monitor';

interface Held { at: number; value: unknown }

const held = new Map<ReadingKind, Held>();
const flying = new Map<string, Promise<unknown>>();

/** How old a reading may be and still be shown while a new one is on its way. */
export const HELD_READING_MS = 60_000;

export function holdReading(kind: ReadingKind, value: unknown, at = Date.now()): void {
    held.set(kind, { at, value });
}

/** The last reading of a kind, if it is not older than `maxAgeMs`. */
export function heldReading<T>(kind: ReadingKind, maxAgeMs = HELD_READING_MS, now = Date.now()): { at: number; value: T } | null {
    const h = held.get(kind);
    return h && now - h.at <= maxAgeMs ? { at: h.at, value: h.value as T } : null;
}

/** Forgets what was held, for a test or for when what it described changed under it. */
export function forgetReadings(): void {
    held.clear();
    flying.clear();
}

/** One request per `key` at a time: whoever asks while it is on its way gets that same answer. */
export function sharedRead<T>(key: string, read: () => Promise<T>): Promise<T> {
    const on = flying.get(key) as Promise<T> | undefined;
    if (on) return on;
    const p = read().finally(() => { if (flying.get(key) === p) flying.delete(key); });
    flying.set(key, p);
    return p;
}
