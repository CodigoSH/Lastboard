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

export interface SparkPoint { xPct: number; yPct: number; value: number; at: string; }

export const RANGES = ['24h', '7d', '30d'];

const header = (name: string) => `
    <header class="mhd__header">
        <h2 class="mhd__title">${escapeHtml(name) || 'Monitor'}</h2>
    </header>`;

const rangeBar = (current: string) => `
    <div class="mhd__ranges">
        ${RANGES.map(r => `<button class="mhd__range ${r === current ? 'mhd__range--active' : ''}" data-range="${r}">${r}</button>`).join('')}
    </div>`;

const footerBar = () => `
    <div class="mhd__footer">
        <span class="mhd__ago" id="mhd-ago"></span>
        <div class="mhd__footer-actions">
            <div class="mhd__clear-wrap">
                <button class="mhd__clear" aria-haspopup="true">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    <span>${i18n.t('monitor.clear_data')}</span>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="mhd__clear-menu" hidden>
                    <button class="mhd__clear-item" data-scope="item">${i18n.t('monitor.clear_this')}</button>
                    <button class="mhd__clear-item" data-scope="all">${i18n.t('monitor.clear_all_services')}</button>
                </div>
            </div>
            <button class="mhd__refresh" aria-label="${i18n.t('monitor.refresh')}" title="${i18n.t('monitor.refresh')}">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0012 4a8 8 0 108 8h-2a6 6 0 11-6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/></svg>
                <span>${i18n.t('monitor.refresh')}</span>
            </button>
        </div>
    </div>`;

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

const SPARK_MAX_POINTS = 150;

// Compute latency chart points (up checks only) as viewBox percentages so the
// component can overlay a hover marker without SVG aspect-ratio distortion.
export function computeSpark(checks: HistoryCheck[]): { min: number; max: number; points: SparkPoint[] } {
    let up = (checks || []).filter(c => c.up && c.latency_ms != null);
    if (up.length < 2) return { min: 0, max: 0, points: [] };

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

// Heartbeat = the most recent beats, padded on the left with faint placeholders
// so the strip always fills from the right as data accrues (Uptime-Kuma style).
const HEARTBEAT_N = 40;

const heartbeatStrip = (beats: HeartbeatBucket[]): string => {
    const real = beats || [];
    const pad = Math.max(0, HEARTBEAT_N - real.length);
    const empties = `<span class="mhd__beat mhd__beat--empty"></span>`.repeat(pad);
    const bars = real.map(b =>
        `<span class="mhd__beat mhd__beat--${b.status}" data-status="${b.status}" data-at="${escapeHtml(b.at)}"></span>`
    ).join('');
    return empties + bars;
};

const heartbeatScale = (beats: HeartbeatBucket[]): string => {
    const real = beats || [];
    if (!real.length) return '';
    const mins = Math.max(0, Math.round((Date.now() - parseTs(real[0].at).getTime()) / 60000));
    const left = mins < 1 ? i18n.t('monitor.now') : mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
    return `<div class="mhd__hb-scale"><span>${escapeHtml(left)}</span><span>${escapeHtml(i18n.t('monitor.now'))}</span></div>`;
};

export const noSelectionInner = () => `
    <div class="mhd__state">
        <div class="mhd__state-icon">📈</div>
        <p>${i18n.t('monitor.select_service')}</p>
    </div>`;

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

    const checks = data.checks || [];
    const incidents = data.incidents || [];
    const heartbeat = data.heartbeat || [];

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
            <div class="mhd__heartbeat">${heartbeatStrip(heartbeat)}</div>
            ${heartbeatScale(heartbeat)}

            <div class="mhd__section-label">${i18n.t('monitor.incidents')}</div>
            <div class="mhd__incidents">${incidentList(incidents)}</div>
        </div>
        ${footerBar()}`;
};
