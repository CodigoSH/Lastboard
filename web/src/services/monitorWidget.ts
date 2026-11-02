import type { ShellMetric, ShellRow, ShellSpec, Tone } from '../widgets/shell/shell';
import { escapeHtml as esc } from './escape';
import { chooseServices } from './monitorServices';

/**
 * What the Monitoring widget says, worked out from the overview the server gives. Pure, like the
 * other two: the widget fetches and writes; which services, under what name and icon, with what
 * readings, is decided here.
 */

export interface WRow {
    item_id: number;
    name: string;
    status: 'up' | 'down' | 'none';
    uptime_pct: number;
    latency_ms: number | null;
    heartbeat: { status: 'up' | 'down'; at: string }[];
    /** The icon of the bookmark, as the bookmark stores it. */
    icon?: string;
}

/** What is set on one service in this widget. */
export interface ItemCfg {
    /** A name to show instead of the bookmark's. */
    label?: string;
    /** An icon to show instead of the bookmark's: an address or the name of one. */
    icon?: string;
}

export interface MonitorShellInput {
    rows: WRow[];
    items: number[];
    itemOrder: number[];
    /** By the service's id, which survives the bookmark being renamed. */
    itemConfig: Record<string, ItemCfg>;
    showAll: boolean;
    resolveIcon: (icon: string) => string;
    t: (key: string) => string;
    num: (n: number) => string;
    time: (iso: string) => string;
    state?: string;
}

/** How many bars a row draws. */
export const BEATS = 30;

const uptimeTone = (pct: number): Tone => (pct >= 99 ? 'ok' : pct >= 95 ? 'warn' : 'bad');

/** What is stored for a service, read back tolerantly: anything that is not a name or an icon is not there. */
export function readItemConfig(raw: unknown): Record<string, ItemCfg> {
    const out: Record<string, ItemCfg> = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!v || typeof v !== 'object') continue;
        const e = v as Record<string, unknown>;
        const entry: ItemCfg = {};
        if (typeof e.label === 'string' && e.label.trim()) entry.label = e.label.trim();
        if (typeof e.icon === 'string' && e.icon.trim()) entry.icon = e.icon.trim();
        if (entry.label || entry.icon) out[id] = entry;
    }
    return out;
}

/** The strip of the last readings, padded on the left so every row ends at "now". */
export function beatsHtml(row: WRow, i: Pick<MonitorShellInput, 't' | 'time'>): string {
    const beats = (row.heartbeat || []).slice(-BEATS);
    const pad = Math.max(0, BEATS - beats.length);
    const label = (s: string) => (s === 'down' ? i.t('status.unreachable') : i.t('status.online'));
    return `<span class="sh-beats">${'<i data-s="none"></i>'.repeat(pad)}${beats.map(b => `<i data-s="${b.status === 'down' ? 'down' : 'up'}" title="${esc(`${label(b.status)} · ${i.time(b.at)}`)}"></i>`).join('')}</span>`;
}

function rowOf(r: WRow, i: MonitorShellInput): ShellRow {
    const cfg = i.itemConfig[String(r.item_id)] ?? {};
    const icon = cfg.icon || r.icon || '';
    const readings: ShellMetric[] = [];
    if (r.status !== 'none') {
        // The unit says what each figure is ("ms", "%"); a label beside every row would be what overflows a narrow tile.
        if (r.latency_ms != null) readings.push({ label: '', text: `${i.num(r.latency_ms)} ms` });
        if (r.uptime_pct >= 0) readings.push({ label: '', text: `${Math.round(r.uptime_pct)}%`, tone: uptimeTone(r.uptime_pct) });
    }
    return {
        sel: String(r.item_id),
        face: icon ? i.resolveIcon(icon) : '',
        name: cfg.label || r.name,
        tone: r.status === 'down' ? 'bad' : r.status === 'up' ? 'ok' : 'off',
        metrics: readings,
        extra: beatsHtml(r, i),
    };
}

export function monitorShell(i: MonitorShellInput): ShellSpec {
    if (i.state !== undefined) return { summary: [], rows: [], foot: '', state: i.state };
    if (!i.rows.length) return { summary: [], rows: [], foot: '', state: i.t('monitor.overview_empty') };
    // Chosen services that no longer exist (deleted, or monitoring turned off) leave the widget empty: say so.
    const shown = chooseServices(i.rows, i.items, i.itemOrder);
    if (!shown.length) return { summary: [], rows: [], foot: '', state: i.t('monitor.no_services_selected') };

    const measured = shown.filter(r => r.uptime_pct >= 0);
    const avgUp = measured.length ? measured.reduce((a, r) => a + r.uptime_pct, 0) / measured.length : null;
    const lat = shown.filter(r => r.status !== 'none' && r.latency_ms != null).map(r => r.latency_ms as number);
    const summary: ShellMetric[] = [];
    if (avgUp !== null) summary.push({ label: i.t('monitor.uptime'), text: `${Math.round(avgUp)}%`, pct: avgUp, tone: uptimeTone(avgUp) });
    if (lat.length) summary.push({ label: i.t('monitor.response'), text: `${i.num(Math.round(lat.reduce((a, b) => a + b, 0) / lat.length))} ms` });

    const up = shown.filter(r => r.status === 'up').length;
    return {
        summary,
        rows: shown.map(r => rowOf(r, i)),
        foot: `${i.t('status.online')}: ${up}/${shown.length}`,
        seeAll: i.showAll ? i.t('widget.see_all') : undefined,
    };
}
