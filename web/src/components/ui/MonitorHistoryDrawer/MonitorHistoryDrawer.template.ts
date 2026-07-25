import { i18n } from '../../../services/i18n';
import { escapeHtml } from '../../../services/escape';

export interface HistoryCheck {
    checked_at: string;
    up: boolean;
    latency_ms: number | null;
    status_code: number;
}

export interface Incident {
    start: string;
    end: string | null;
    duration_sec: number;
}

export interface HistoryData {
    range: string;
    current: HistoryCheck | null;
    uptime_pct: number;
    total: number;
    checks: HistoryCheck[];
    incidents: Incident[];
}

export const RANGES = ['24h', '7d', '30d'];

const header = (name: string) => `
    <header class="mhd__header">
        <h2 class="mhd__title">${escapeHtml(name) || 'Monitor'}</h2>
        <button class="mhd__close" aria-label="${i18n.t('action.close') || 'Close'}">&times;</button>
    </header>`;

const rangeBar = (current: string) => `
    <div class="mhd__ranges">
        ${RANGES.map(r => `<button class="mhd__range ${r === current ? 'mhd__range--active' : ''}" data-range="${r}">${r}</button>`).join('')}
    </div>`;

export const shell = (open: boolean, inner: string) => `
    <div class="mhd__overlay ${open ? 'mhd__overlay--open' : ''}"></div>
    <aside class="mhd__panel ${open ? 'mhd__panel--open' : ''}" role="dialog" aria-modal="true" aria-label="${i18n.t('settings.monitoring') || 'Monitoring'}">
        ${inner}
    </aside>`;

export const loadingInner = (name: string) => `
    ${header(name)}
    <div class="mhd__state">${i18n.t('general.loading') || 'Loading…'}</div>`;

export const emptyInner = (name: string, mode: string, range: string) => `
    ${header(name)}
    ${rangeBar(range)}
    <div class="mhd__state">
        <div class="mhd__state-icon">📡</div>
        <p>${mode === 'background'
        ? (i18n.t('monitor.no_data_yet') || 'No history recorded yet. Checks will appear shortly.')
        : (i18n.t('monitor.no_data') || 'No history yet. Enable 24/7 monitoring to record it.')}</p>
    </div>`;

// Parse the UTC "YYYY-MM-DD HH:MM:SS" timestamp into a local Date.
const parseTs = (s: string) => new Date(s.replace(' ', 'T') + 'Z');

const fmtTime = (s: string) => parseTs(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDuration = (sec: number): string => {
    if (sec < 60) return `${sec}s`;
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h} h ${rm} min` : `${h} h`;
};

// Latency line chart as an inline SVG polyline (up checks only).
const sparkline = (checks: HistoryCheck[]): string => {
    const pts = checks.filter(c => c.up && c.latency_ms != null).map(c => c.latency_ms as number);
    if (pts.length < 2) return `<div class="mhd__spark-empty">—</div>`;

    const w = 100, h = 34;
    const min = Math.min(...pts), max = Math.max(...pts);
    const range = max - min || 1;
    const step = w / (pts.length - 1);
    const coords = pts.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(2)}`);
    const line = coords.join(' ');
    const area = `0,${h} ${line} ${w},${h}`;

    return `
        <svg class="mhd__spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="${area}" class="mhd__spark-fill"></polygon>
            <polyline points="${line}" class="mhd__spark-line"></polyline>
        </svg>
        <div class="mhd__spark-scale"><span>${max} ms</span><span>${min} ms</span></div>`;
};

const incidentList = (incidents: Incident[]): string => {
    if (!incidents.length) {
        return `<div class="mhd__no-incidents">${i18n.t('monitor.no_incidents')}</div>`;
    }
    // Newest first.
    return incidents.slice().reverse().map(inc => {
        const start = fmtTime(inc.start);
        const end = inc.end ? fmtTime(inc.end) : i18n.t('monitor.ongoing');
        return `
            <div class="mhd__incident">
                <span class="mhd__incident-dot"></span>
                <span class="mhd__incident-range">${escapeHtml(start)} – ${escapeHtml(end)}</span>
                <span class="mhd__incident-dur">${escapeHtml(fmtDuration(inc.duration_sec))}</span>
            </div>`;
    }).join('');
};

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

    const bars = data.checks.slice(-60).map(c => {
        const when = parseTs(c.checked_at).toLocaleString();
        const t = c.up ? `${i18n.t('status.online')} · ${when}` : `${i18n.t('status.unreachable')} · ${when}`;
        return `<span class="mhd__beat mhd__beat--${c.up ? 'up' : 'down'}" title="${escapeHtml(t)}"></span>`;
    }).join('');

    return `
        ${header(name)}
        ${rangeBar(data.range)}
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

            <div class="mhd__section-label">${i18n.t('monitor.latency')}</div>
            <div class="mhd__spark-wrap">${sparkline(data.checks)}</div>

            <div class="mhd__section-label">${i18n.t('monitor.recent_checks')}</div>
            <div class="mhd__heartbeat">${bars}</div>

            <div class="mhd__section-label">${i18n.t('monitor.incidents')}</div>
            <div class="mhd__incidents">${incidentList(data.incidents)}</div>
        </div>`;
};
