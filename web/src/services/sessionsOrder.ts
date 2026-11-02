/**
 * The order the sessions dialog lists sign-ins in: this device first, so it is
 * the one that is found without looking, then the rest as the server gave them
 * (the most recently used first). A new array; the input is not touched.
 */
export function sessionsInOrder<T extends { current: boolean }>(items: T[]): T[] {
    return [...items.filter(s => s.current), ...items.filter(s => !s.current)];
}
