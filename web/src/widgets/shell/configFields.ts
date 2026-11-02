import { escapeHtml as esc } from '../../services/escape';
import { storeMetrics, type Metric, type MetricFlags } from './metrics';

/**
 * The two settings every infrastructure widget has in common — which readings it shows and whether it
 * leads to the page — written once, so the three config screens ask for them in the same words and the
 * same place. The markup is pure (it is handed the translator); reading it back takes the screen's root.
 */

type T = (key: string) => string;

const LABELS: Record<Metric, string> = { cpu: 'widget.telemetry.cpu', mem: 'widget.telemetry.ram', disk: 'widget.proxmox.disk' };


export function metricsFieldHtml(flags: MetricFlags, allowed: readonly Metric[], t: T): string {
    const boxes = allowed.map(m => `
        <div class="field-group check-row">
            <input type="checkbox" id="wm-${m}" data-metric="${m}" ${flags[m] ? 'checked' : ''} />
            <label for="wm-${m}">${esc(t(LABELS[m]))}</label>
        </div>`).join('');
    return `<div class="field-group" id="w-metrics">
        <label>${esc(t('widget.shown_readings'))}</label>
        ${boxes}
        <small>${esc(t('widget.shown_readings_desc'))}</small>
    </div>`;
}

export function seeAllFieldHtml(checked: boolean, t: T): string {
    return `<div class="field-group">
        <div class="field-group check-row">
            <input type="checkbox" id="w-see-all" ${checked ? 'checked' : ''} />
            <label for="w-see-all">${esc(t('widget.show_see_all'))}</label>
        </div>
        <small>${esc(t('widget.show_see_all_desc'))}</small>
    </div>`;
}

/** What the screen's boxes say, as it is stored: the readings turned off, and the link when it is off. */
export function readCommonFields(root: ParentNode, allowed: readonly Metric[]): { metrics: Partial<Record<Metric, false>> | undefined; showAll: boolean } {
    const flags: MetricFlags = { cpu: false, mem: false, disk: false };
    for (const m of allowed) flags[m] = root.querySelector<HTMLInputElement>(`#wm-${m}`)?.checked ?? true;
    return { metrics: storeMetrics(flags, allowed), showAll: root.querySelector<HTMLInputElement>('#w-see-all')?.checked ?? true };
}
