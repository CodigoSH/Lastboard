import type { Metric, MetricFlags } from '../widgets/shell/metrics';
import type { ShellMetric, ShellRow, ShellSpec, Tone } from '../widgets/shell/shell';
import { guestLabel, hasChosenOrder, visibleGuests, type GuestSettings } from './proxmoxGuests';

/**
 * What the Proxmox widget says, worked out from what the hypervisors answered. Pure: the widget
 * only fetches, hands it over and writes the result, so this can be looked at without a browser.
 */

export interface WNode { name: string; cpu: number; mem: number; disk: number }

export interface WGuest {
    host: string;
    vmid: number;
    name: string;
    kind: 'lxc' | 'qemu';
    node: string;
    running: boolean;
    cpu: number;
    mem: number;
    mem_total: number;
    disk?: number;
    disk_total?: number;
}

export interface WidgetInput {
    nodes: WNode[];
    guests: WGuest[];
    settings: GuestSettings;
    metrics: MetricFlags;
    /** Whether the line of totals under the name is drawn. */
    showSummary: boolean;
    showAll: boolean;
    /** The icon address for a machine: what its owner chose, then its bookmark's, then ''. */
    faceOf: (g: WGuest) => string;
    /** Whether a bookmark depends on this machine. */
    linked: (g: WGuest) => boolean;
    t: (key: string) => string;
    num: (n: number) => string;
    /** Set while the first answer has not come, or when it failed: said in place of the list. */
    state?: string;
}

const LABEL: Record<Metric, string> = { cpu: 'widget.telemetry.cpu', mem: 'widget.telemetry.ram', disk: 'widget.proxmox.disk' };
const pct = (n: number): number => (Number.isFinite(n) ? Math.max(0, n) : 0);

/** The node under most pressure: the one the line of totals speaks for. */
export function worstNode(nodes: WNode[]): WNode | null {
    if (!nodes.length) return null;
    return [...nodes].sort((a, b) => Math.max(b.cpu, b.mem, b.disk) - Math.max(a.cpu, a.mem, a.disk))[0];
}

function guestMetric(g: WGuest, m: Metric, i: WidgetInput): ShellMetric | null {
    if (m === 'cpu') return { label: i.t(LABEL.cpu), text: `${i.num(Math.round(g.cpu * 10) / 10)}%`, pct: pct(g.cpu) };
    if (m === 'mem') {
        if (!(g.mem_total > 0)) return null;
        const p = (g.mem / g.mem_total) * 100;
        return { label: i.t(LABEL.mem), text: `${Math.round(p)}%`, pct: pct(p) };
    }
    // A full virtual machine says nothing about its disk unless it runs the guest agent: no figure, not a zero.
    if (!((g.disk_total ?? 0) > 0)) return null;
    const p = ((g.disk ?? 0) / (g.disk_total ?? 1)) * 100;
    return { label: i.t(LABEL.disk), text: `${Math.round(p)}%`, pct: pct(p) };
}

function rowOf(g: WGuest, i: WidgetInput, on: Metric[]): ShellRow {
    // A stopped machine that a bookmark depends on is an outage; one nobody linked is usually on purpose.
    const flag = !g.running && i.linked(g);
    const tone: Tone = g.running ? 'ok' : flag ? 'bad' : 'off';
    return {
        sel: `guest|${g.host}|${g.vmid}`,
        face: i.faceOf(g),
        name: guestLabel(i.settings, g.host, g.vmid, g.name),
        sub: `${g.kind === 'lxc' ? 'LXC' : 'VM'} ${g.vmid}`,
        tone,
        flag,
        metrics: g.running ? on.map(m => guestMetric(g, m, i)).filter((x): x is ShellMetric => x !== null) : [],
        note: g.running ? undefined : i.t('docker.state_stopped'),
    };
}

/** The machines to draw, in the order to draw them. */
export function orderedGuests(guests: WGuest[], settings: GuestSettings, linked: (g: WGuest) => boolean): WGuest[] {
    const chosen = visibleGuests(settings, guests);
    if (hasChosenOrder(settings)) return chosen;
    // Until somebody arranges them, what needs saying comes first.
    const rank = (g: WGuest) => (g.running ? 2 : linked(g) ? 0 : 1);
    return [...chosen].sort((a, b) => rank(a) - rank(b) || a.vmid - b.vmid);
}

export function proxmoxShell(i: WidgetInput): ShellSpec {
    if (i.state !== undefined) return { summary: [], rows: [], foot: '', state: i.state };
    const on = (['cpu', 'mem', 'disk'] as const).filter(m => i.metrics[m]);
    const guests = orderedGuests(i.guests, i.settings, i.linked);
    if (!guests.length) return { summary: [], rows: [], foot: '', state: i.t('widget.proxmox.empty') };

    const node = i.showSummary ? worstNode(i.nodes) : null;
    const summary: ShellMetric[] = node
        ? on.map(m => ({ label: i.t(LABEL[m]), text: `${Math.round(pct(node[m]))}%`, pct: pct(node[m]) }))
        : [];
    const running = guests.filter(g => g.running).length;
    return {
        summary,
        rows: guests.map(g => rowOf(g, i, on)),
        foot: `${i.t('widget.running_label')}: ${running}/${guests.length}`,
        seeAll: i.showAll ? i.t('widget.see_all') : undefined,
    };
}
