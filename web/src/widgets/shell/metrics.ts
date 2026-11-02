/**
 * Which readings a widget shows (CPU, memory, disk), kept the way the rest of a widget's settings are:
 * by absence. Nothing stored means every reading the widget can give is shown, so a widget saved before
 * this existed keeps looking exactly as it did; only a reading somebody turned off is written down.
 */

export type Metric = 'cpu' | 'mem' | 'disk';

export type MetricFlags = Record<Metric, boolean>;

/** The readings that are on, among the ones the widget can give at all. */
export function readMetrics(stored: unknown, allowed: readonly Metric[]): MetricFlags {
    const off = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
    const flag = (m: Metric) => allowed.includes(m) && off[m] !== false;
    return { cpu: flag('cpu'), mem: flag('mem'), disk: flag('disk') };
}

/** What to store: only the readings turned off, or nothing when every reading is on. */
export function storeMetrics(flags: MetricFlags, allowed: readonly Metric[]): Partial<Record<Metric, false>> | undefined {
    const off: Partial<Record<Metric, false>> = {};
    for (const m of allowed) if (!flags[m]) off[m] = false;
    return Object.keys(off).length ? off : undefined;
}

/** The readings that are on, in the order a widget draws them. */
export function metricsOn(flags: MetricFlags): Metric[] {
    return (['cpu', 'mem', 'disk'] as const).filter(m => flags[m]);
}

/** Whether the link to the full page is shown. On unless it was switched off. */
export function showsSeeAll(stored: unknown): boolean {
    return stored !== false;
}
