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

export interface HeartbeatBucket {
    status: string; // up | down | none
    at: string;
}

export interface HistoryData {
    range: string;
    current: HistoryCheck | null;
    uptime_pct: number;
    total: number;
    checks: HistoryCheck[];
    incidents: Incident[];
    heartbeat: HeartbeatBucket[];
}

export const RANGES = ['24h', '7d', '30d'];

const header = (name: string) => `
    <header class="mhd__header">
        <h2 class="mhd__title">${escapeHtml(name) || 'Monitor'}</h2>
        <button class="mhd__close" aria-label="${i18n.t('general.close') || i18n.t('action.close') || 'Close'}">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
    </header>`;

const rangeBar = (current: string) => `
    <div class="mhd__ranges">
        ${RANGES.map(r => `<button class="mhd__range ${r === current ? 'mhd__range--active' : ''}" data-range="${r}">${r}</button>`).join('')}
    </div>`;

const footerBar = () => `
    <div class="mhd__footer">
        <span class="mhd__ago" id="mhd-ago"></span>
        <button class="mhd__refresh" aria-label="${i18n.t('monitor.refresh')}" title="${i18n.t('monitor.refresh')}">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0012 4a8 8 0 108 8h-2a6 6 0 11-6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/></svg>
            <span>${i18n.t('monitor.refresh')}</span>
        </button>
    </div>`;

export const shell = (open: boolean, inner: string) => `
    <div class="mhd__overlay ${open ? 'mhd__overlay--open' : ''}"></div>
    <aside class="mhd__panel ${open ? 'mhd__panel--open' : ''}" role="dialog" aria-modal="true" aria-label="${i18n.t('settings.monitoring') || 'Monitoring'}">
        ${inner}
    </aside>
    <div class="mhd__tip" hidden></div>`;

export interface SparkPoint { xPct: number; yPct: number; value: number; at: string; }

// Compute latency chart points (up checks only) as viewBox percentages so the
// component can overlay a hover marker without SVG aspect-ratio distortion.
const SPARK_MAX_POINTS = 150;

export function computeSpark(checks: HistoryCheck[]): { min: number; max: number; points: SparkPoint[] } {
    let up = (checks || []).filter(c => c.up && c.latency_ms != null);
    if (up.length < 2) return { min: 0, max: 0, points: [] };

    // Downsample so the SVG and hover stay light regardless of range/interval.
    if (up.length > SPARK_MAX_POINTS) {
        const sampled: HistoryCheck[] = [];
        for (let k = 0; k < SPARK_MAX_POINTS; k++) {
            sampled.push(up[Math.round(k * (up.length - 1) / (SPARK_MAX_POINTS - 1))]);
        }
        up = sampled;
    }

    const vals = up.map(c => c.latency_ms as number);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const points = up.map((c, i) => ({
        xPct: (i / (up.length - 1)) * 100,
        yPct: (1 - ((c.latency_ms as number) - min) / range) * 100,
        value: c.latency_ms as number,
        at: c.checked_at,
    }));
    return { min, max, points };
}

const statusLabelOf = (status: string) => status === 'down'
    ? i18n.t('status.unreachable')
    : status === 'up' ? i18n.t('status.online') : i18n.t('monitor.status_unknown');

export const barTooltipHtml = (status: string, at: string) => `
    <div class="mhd__tip-status mhd__tip-status--${status}"><span class="mhd__tip-dot"></span>${escapeHtml(statusLabelOf(status))}</div>
    <div class="mhd__tip-sub">${escapeHtml(parseTs(at).toLocaleString())}</div>`;

export const sparkTooltipHtml = (value: number, at: string) => `
    <div class="mhd__tip-value">${value} ms</div>
    <div class="mhd__tip-sub">${escapeHtml(parseTs(at).toLocaleString())}</div>`;

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
    </div>
    ${footerBar()}`;

// The API sends RFC3339 ("…T…Z"); tolerate the raw "YYYY-MM-DD HH:MM:SS" form too.
const parseTs = (s: string) => new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');

const fmtTime = (s: string) => parseTs(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDuration = (sec: number): string => {
    if (sec < 60) return `${sec}s`;
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h} h ${rm} min` : `${h} h`;
};

// Latency line chart as an inline SVG polyline (up checks only), with an HTML
// overlay layer (crosshair + dot) the component drives on hover.
const sparkline = (checks: HistoryCheck[]): string => {
    const { min, max, points } = computeSpark(checks);
    if (points.length < 2) return `<div class="mhd__spark-empty">—</div>`;

    const line = points.map(p => `${p.xPct.toFixed(2)},${p.yPct.toFixed(2)}`).join(' ');
    const area = `0,100 ${line} 100,100`;

    return `
        <div class="mhd__spark-plot">
            <svg class="mhd__spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polygon points="${area}" class="mhd__spark-fill"></polygon>
                <polyline points="${line}" class="mhd__spark-line"></polyline>
            </svg>
            <div class="mhd__spark-cross" hidden></div>
            <div class="mhd__spark-dot" hidden></div>
        </div>
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

    // Go marshals empty slices as null, so default all to [].
    const checks = data.checks || [];
    const incidents = data.incidents || [];
    const heartbeat = data.heartbeat || [];

    // Each bar spans a slice of the range: red if any check failed in it, green
    // if all checks passed, neutral if the bucket had no data. Data attributes
    // feed the component's hover tooltip.
    const bars = heartbeat.map(b =>
        `<span class="mhd__beat mhd__beat--${b.status}" data-status="${b.status}" data-at="${escapeHtml(b.at)}"></span>`
    ).join('');

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
            <div class="mhd__spark-wrap">${sparkline(checks)}</div>

            <div class="mhd__section-label">${i18n.t('monitor.recent_checks')}</div>
            <div class="mhd__heartbeat">${bars}</div>

            <div class="mhd__section-label">${i18n.t('monitor.incidents')}</div>
            <div class="mhd__incidents">${incidentList(incidents)}</div>
        </div>
        ${footerBar()}`;
};
