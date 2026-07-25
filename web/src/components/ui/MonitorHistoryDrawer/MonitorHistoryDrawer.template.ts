import { i18n } from '../../../services/i18n';
import { escapeHtml } from '../../../services/escape';

export interface HistoryCheck {
    checked_at: string;
    up: boolean;
    latency_ms: number | null;
    status_code: number;
}

export interface HistoryData {
    range: string;
    current: HistoryCheck | null;
    uptime_pct: number;
    total: number;
    checks: HistoryCheck[];
    incidents: unknown[];
}

const header = (name: string) => `
    <header class="mhd__header">
        <h2 class="mhd__title">${escapeHtml(name) || 'Monitor'}</h2>
        <button class="mhd__close" aria-label="${i18n.t('action.close') || 'Close'}">&times;</button>
    </header>`;

export const shell = (open: boolean, inner: string) => `
    <div class="mhd__overlay ${open ? 'mhd__overlay--open' : ''}"></div>
    <aside class="mhd__panel ${open ? 'mhd__panel--open' : ''}" role="dialog" aria-modal="true" aria-label="${i18n.t('settings.monitoring') || 'Monitoring'}">
        ${inner}
    </aside>`;

export const loadingInner = (name: string) => `
    ${header(name)}
    <div class="mhd__state">${i18n.t('general.loading') || 'Loading…'}</div>`;

export const emptyInner = (name: string) => `
    ${header(name)}
    <div class="mhd__state">
        <div class="mhd__state-icon">📡</div>
        <p>${i18n.t('monitor.no_data') || 'No data yet. Enable 24/7 monitoring to record history.'}</p>
    </div>`;

export const dataInner = (name: string, data: HistoryData): string => {
    const status = data.current ? (data.current.up ? 'up' : 'down') : 'unknown';
    const statusLabel = status === 'up'
        ? i18n.t('status.online')
        : status === 'down'
            ? i18n.t('status.unreachable')
            : i18n.t('monitor.status_unknown');

    const uptime = data.uptime_pct < 0 ? '—' : `${data.uptime_pct.toFixed(1)}%`;
    const latency = data.current?.up && data.current.latency_ms != null
        ? `${data.current.latency_ms} ms`
        : '—';

    // Heartbeat: last 60 checks, oldest→newest, one colored bar each.
    const bars = data.checks.slice(-60).map(c => {
        const when = new Date(c.checked_at.replace(' ', 'T') + 'Z').toLocaleString();
        const t = c.up ? `${i18n.t('status.online')} · ${when}` : `${i18n.t('status.unreachable')} · ${when}`;
        return `<span class="mhd__beat mhd__beat--${c.up ? 'up' : 'down'}" title="${escapeHtml(t)}"></span>`;
    }).join('');

    return `
        ${header(name)}
        <div class="mhd__body">
            <div class="mhd__status mhd__status--${status}">
                <span class="mhd__dot"></span>${escapeHtml(statusLabel)}
            </div>

            <div class="mhd__stats">
                <div class="mhd__stat">
                    <div class="mhd__stat-value">${uptime}</div>
                    <div class="mhd__stat-label">${i18n.t('monitor.uptime')} (${escapeHtml(data.range)})</div>
                </div>
                <div class="mhd__stat">
                    <div class="mhd__stat-value">${latency}</div>
                    <div class="mhd__stat-label">${i18n.t('monitor.latency')}</div>
                </div>
            </div>

            <div class="mhd__section-label">${i18n.t('monitor.recent_checks')}</div>
            <div class="mhd__heartbeat">${bars}</div>
        </div>`;
};
