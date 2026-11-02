import type { Metric, MetricFlags } from '../widgets/shell/metrics';
import type { ShellMetric, ShellRow, ShellSpec, Tone } from '../widgets/shell/shell';
import { attentionReason, type AttentionReason } from './dockerOverview';
import { entryOf, inChosenOrder, isShown, type ContainerSettings } from './dockerContainers';
import type { ContainerStats } from './dockerPage';
import { containerName, type DockerContainer, type DockerHost } from './dockerShared';

/**
 * What the Docker widget says, worked out from what the hosts answered. Pure, as the Proxmox one is:
 * the widget fetches and writes, this decides which containers, in what order, with which readings.
 */

export interface WHost {
    host: DockerHost;
    containers: DockerContainer[];
    /** The host stopped answering: its containers are the last ones seen. */
    failed: boolean;
    /** It has answered at least once. A host that never did has no containers to grey out, so it gets a line of its own. */
    everLoaded: boolean;
    errorKey?: string;
}

export type WStats = ContainerStats;

export interface WSize { cores: number; mem_total: number }

export interface DockerWidgetInput {
    hosts: WHost[];
    stats: Record<string, WStats>;
    /** What each host has, to read the CPU of its containers against; a host that did not say is missing. */
    sizes: Record<string, WSize>;
    /** The CPU and memory every container of a host uses together, as the host's share. Null where the host did not say how big it is. */
    use: Record<string, { cpu: number | null; mem: number | null }>;
    settings: ContainerSettings;
    metrics: MetricFlags;
    showAll: boolean;
    /** The icon address for a container, or ''. */
    faceOf: (hostId: string, name: string) => string;
    /** The bookmark a container serves, if any: a stopped one it depends on is an outage. */
    linkOf: (hostId: string, name: string) => string;
    t: (key: string) => string;
    num: (n: number) => string;
    /** Said in place of the list: loading, no hosts, an error. */
    state?: string;
}

const LABEL: Record<'cpu' | 'mem', string> = { cpu: 'widget.telemetry.cpu', mem: 'widget.telemetry.ram' };
const BAD: AttentionReason[] = ['unhealthy', 'failed', 'outage', 'memory'];
const clamp = (n: number): number => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);

const hasChosenOrder = (s: ContainerSettings): boolean => Object.values(s.containerOrder || {}).some(o => o.length > 0);

interface Entry { host: WHost; c: DockerContainer; reason: AttentionReason | null }

/** The containers to draw, in the order to draw them. */
export function dockerEntries(i: DockerWidgetInput): Entry[] {
    const out: Entry[] = [];
    for (const h of i.hosts) {
        for (const c of inChosenOrder(h.containers, i.settings.containerOrder?.[h.host.id])) {
            if (!isShown(i.settings, h.host.id, c)) continue;
            const name = containerName(c);
            out.push({ host: h, c, reason: attentionReason(c, !!i.linkOf(h.host.id, name), i.stats[c.ID]) });
        }
    }
    if (hasChosenOrder(i.settings)) return out;
    // Until somebody arranges them, what needs saying comes first.
    const rank = (e: Entry) => (e.reason === null ? 2 : BAD.includes(e.reason) ? 0 : 1);
    return out.map((e, n) => ({ e, n })).sort((a, b) => rank(a.e) - rank(b.e) || a.n - b.n).map(x => x.e);
}

function readings(c: DockerContainer, i: DockerWidgetInput, on: Metric[], size: WSize | undefined): ShellMetric[] {
    const s = i.stats[c.ID];
    if (c.Status !== 'running' || !s) return [];
    const out: ShellMetric[] = [];
    for (const m of on) {
        if (m === 'cpu') {
            // The figure is what Docker says (a whole core is 100%); the bar reads it against the host's cores.
            const scale = size && size.cores > 0 ? s.CPUPercent / size.cores : s.CPUPercent;
            out.push({ label: i.t(LABEL.cpu), text: `${i.num(Math.round(s.CPUPercent * 10) / 10)}%`, pct: clamp(scale) });
        } else if (m === 'mem') {
            out.push({ label: i.t(LABEL.mem), text: `${i.num(Math.round(s.MemPercent * 10) / 10)}%`, pct: clamp(s.MemPercent) });
        }
    }
    return out;
}

function rowOf(e: Entry, i: DockerWidgetInput, on: Metric[], showHost: boolean): ShellRow {
    const { host, c } = e;
    const name = containerName(c);
    const tone: Tone = c.Status !== 'running'
        ? (e.reason === 'outage' || e.reason === 'failed' ? 'bad' : e.reason === 'paused' ? 'warn' : 'off')
        : e.reason === null ? 'ok' : BAD.includes(e.reason) ? 'bad' : 'warn';
    const image = (c.Image || '').split('@')[0];
    const stateWord = c.Status === 'running' ? '' : i.t(`docker.state_${c.Status}`);
    return {
        sel: `${host.host.id}/${name}`,
        face: i.faceOf(host.host.id, name),
        name: entryOf(i.settings, host.host.id, c).label || name,
        sub: [image, showHost ? host.host.name : ''].filter(Boolean).join(' · '),
        tone,
        flag: c.Status !== 'running' && e.reason === 'outage',
        metrics: readings(c, i, on, i.sizes[host.host.id]),
        note: c.Status === 'running' ? (host.failed ? i.t('docker.host_unreachable') : undefined) : (stateWord || i.t('docker.state_stopped')),
    };
}

export function dockerShell(i: DockerWidgetInput): ShellSpec {
    if (i.state !== undefined) return { summary: [], rows: [], foot: '', state: i.state };
    const on = (['cpu', 'mem'] as const).filter(m => i.metrics[m]);
    const entries = dockerEntries(i);
    const silent = i.hosts.filter(h => h.failed && !h.everLoaded);
    if (!entries.length && !silent.length) return { summary: [], rows: [], foot: '', state: i.t('docker.no_containers') };

    const showHost = i.hosts.length > 1;
    const rows = entries.map(e => rowOf(e, i, on, showHost));
    // A host that was down when this loaded has no containers to grey out: it says so itself.
    for (const h of silent) {
        rows.push({
            sel: '', face: '', name: h.host.name, tone: 'bad', metrics: [],
            note: i.t(h.errorKey === 'docker.unauthorized' ? 'docker.unauthorized' : 'docker.host_unreachable'),
        });
    }

    // The totals are the hosts' own load: what its containers use, against what it has.
    const live = i.hosts.filter(h => !h.failed);
    const share = (m: 'cpu' | 'mem'): number | null => {
        const v = live.map(h => i.use[h.host.id]?.[m]).filter((x): x is number => typeof x === 'number');
        return v.length ? Math.max(...v) : null;
    };
    const summary: ShellMetric[] = [];
    for (const m of on) {
        const v = share(m);
        if (v !== null) summary.push({ label: i.t(LABEL[m]), text: `${Math.round(v)}%`, pct: clamp(v) });
    }

    const running = entries.filter(e => e.c.Status === 'running').length;
    return {
        summary,
        rows,
        foot: `${i.t('widget.running_label')}: ${running}/${entries.length}`,
        seeAll: i.showAll ? i.t('widget.see_all') : undefined,
    };
}
