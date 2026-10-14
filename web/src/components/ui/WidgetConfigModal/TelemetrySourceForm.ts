import { i18n } from '../../../services/i18n';
import { escapeHtml as esc } from '../../../services/escape';
import { SECRET_MASK, SecretChange, secretChange } from '../../../services/secretField';
import { REMOTE_SOURCES, TelemetrySource, remoteErrorKey, telemetrySource } from '../../../widgets/core/remoteTelemetry';
import type { RemoteReply } from '../../../widgets/core/remoteTelemetry';
import type { SelectOption } from '../Select/Select.template';

/**
 * The "where do the numbers come from" part of the Server Health settings: this
 * server, or another one read through Glances, Netdata or a JSON endpoint.
 *
 * The address and the paths are plain fields kept in the widget; the password
 * and the header value are secrets, shown as dots, never read back (see
 * secretField.ts) and sent apart from the content.
 */


export function sourceOptions(): SelectOption[] {
    return [
        { value: 'local', label: i18n.t('widget.telemetry.remote.source_local') },
        { value: 'glances', label: 'Glances' },
        { value: 'netdata', label: 'Netdata' },
        { value: 'custom', label: i18n.t('widget.telemetry.remote.source_custom') },
    ];
}

const t = (k: string, vars?: Record<string, string>) => i18n.t(`widget.telemetry.remote.${k}`, vars);

function field(id: string, label: string, value: string, opts: { placeholder?: string; type?: 'text' | 'password'; hint?: string } = {}): string {
    const secret = opts.type === 'password';
    return `
        <div class="field-group">
            <label for="${id}">${label}</label>
            <input type="${opts.type || 'text'}" id="${id}" value="${esc(value)}" placeholder="${esc(opts.placeholder || '')}"
                spellcheck="false" autocomplete="${secret ? 'new-password' : 'off'}" ${secret ? 'data-secret' : ''} />
            ${opts.hint ? `<small>${opts.hint}</small>` : ''}
        </div>`;
}

export function telemetrySourceTemplate(content: any): string {
    const source = telemetrySource(content.source);
    const v = (k: string) => String(content[k] ?? '');
    const show = (which: TelemetrySource[]) => (which.includes(source) ? '' : 'hidden');

    return `
        <div class="field-group row-aligned">
            <label>${t('source')}</label>
            <app-select id="telemetry-source" value="${source}"></app-select>
        </div>
        <div class="remote-fields" data-for="glances netdata custom" ${show(REMOTE_SOURCES.slice())}>
            ${field('tel-url', t('url'), v('url'), { placeholder: 'http://192.168.1.20:61208' })}
        </div>
        <div class="remote-fields" data-for="glances" ${show(['glances'])}>
            ${field('tel-username', t('username'), v('username'), { placeholder: 'glances' })}
            ${field('tel-password', t('password'), '', { type: 'password', hint: t('password_hint') })}
        </div>
        <div class="remote-fields" data-for="custom" ${show(['custom'])}>
            ${field('tel-header-name', t('header_name'), v('header_name'), { placeholder: 'X-Api-Key' })}
            ${field('tel-header-value', t('header_value'), '', { type: 'password' })}
            ${field('tel-cpu-path', t('cpu_path'), v('cpu_path'), { placeholder: 'cpu.percent', hint: t('paths_hint') })}
            ${field('tel-ram-path', t('ram_path'), v('ram_path'), { placeholder: 'mem.percent' })}
            ${field('tel-ram-used-path', t('ram_used_path'), v('ram_used_path'), { placeholder: 'mem.used' })}
            ${field('tel-ram-total-path', t('ram_total_path'), v('ram_total_path'), { placeholder: 'mem.total' })}
            ${field('tel-temp-path', t('temp_path'), v('temp_path'), { placeholder: 'sensors[0].temp' })}
            ${field('tel-link', t('link'), v('link'), { placeholder: 'http://192.168.1.20/', hint: t('link_hint') })}
        </div>
        <div class="remote-fields" data-for="glances netdata custom" ${show(REMOTE_SOURCES.slice())}>
            <div class="field-group">
                <app-button variant="ghost" id="tel-test">${t('test')}</app-button>
                <small id="tel-test-result" role="status" aria-live="polite"></small>
            </div>
        </div>`;
}

/** Shows only the fields of the chosen source. */
export function applySourceVisibility(root: ShadowRoot, source: TelemetrySource): void {
    root.querySelectorAll<HTMLElement>('.remote-fields').forEach(el => {
        el.hidden = !(el.dataset.for || '').split(' ').includes(source);
    });
}

/** The two secret boxes, by the name they are stored under. */
const SECRET_BOXES: Record<string, string> = { password: 'tel-password', header_value: 'tel-header-value' };

/** Puts the dots in the boxes whose secret is saved. */
export function showSavedSecrets(root: ShadowRoot, names: string[]): void {
    for (const name of names) {
        const box = root.getElementById(SECRET_BOXES[name] || '') as HTMLInputElement | null;
        if (box) { box.value = SECRET_MASK; box.dataset.saved = '1'; }
    }
}

/** Selecting the dots on entering the box: the first key replaces them, Delete empties the box. */
export function wireSecretBoxes(root: ShadowRoot): void {
    root.addEventListener('focusin', (e) => {
        const el = e.target as HTMLInputElement | null;
        if (el?.id === 'tel-password' || el?.id === 'tel-header-value') el.select();
    });
}

/** What became of each secret box. A box that never had a secret and is empty keeps nothing. */
export function secretChanges(root: ShadowRoot): Record<string, SecretChange> {
    const out: Record<string, SecretChange> = {};
    for (const [name, id] of Object.entries(SECRET_BOXES)) {
        const box = root.getElementById(id) as HTMLInputElement | null;
        if (box) out[name] = secretChange(box.value, box.dataset.saved === '1');
    }
    return out;
}

const val = (root: ShadowRoot, id: string) => ((root.getElementById(id) as HTMLInputElement | null)?.value ?? '').trim();

/** The source settings as they are stored in the widget's content. */
export function readSourceSettings(root: ShadowRoot): Record<string, string> {
    const source = telemetrySource((root.getElementById('telemetry-source') as HTMLInputElement | null)?.value);
    if (source === 'local') return { source };
    const out: Record<string, string> = { source, url: val(root, 'tel-url') };
    if (source === 'glances') out.username = val(root, 'tel-username');
    if (source === 'custom') {
        out.header_name = val(root, 'tel-header-name');
        out.cpu_path = val(root, 'tel-cpu-path');
        out.ram_path = val(root, 'tel-ram-path');
        out.ram_used_path = val(root, 'tel-ram-used-path');
        out.ram_total_path = val(root, 'tel-ram-total-path');
        out.temp_path = val(root, 'tel-temp-path');
        out.link = val(root, 'tel-link');
    }
    return out;
}

/** The sentence that answers a test: what connected, and what this server does not report. */
export function describeTest(reply: RemoteReply, metrics: string[]): string {
    if (!reply.ok || !reply.stats) return i18n.t(remoteErrorKey(reply.error));
    const s = reply.stats;
    const lines = [s.version ? t('test_ok_version', { version: String(s.version) }) : t('test_ok')];
    if (metrics.includes('temp') && s.temp === undefined) lines.push(t('test_no_sensor'));
    const missing = [
        s.cpu === undefined && metrics.includes('cpu') ? i18n.t('widget.telemetry.cpu') : '',
        s.ram === undefined && metrics.includes('ram') ? i18n.t('widget.telemetry.ram') : '',
    ].filter(Boolean);
    if (missing.length) lines.push(t('test_missing', { metrics: missing.join(', ') }));
    return lines.join(' ');
}
