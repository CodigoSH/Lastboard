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

export interface MonitorStats {
    avg_ms_24h: number | null;
    uptime_24h: number;
    uptime_7d: number;
    uptime_30d: number;
}

export interface HistoryData {
    range: string;
    current: HistoryCheck | null;
    uptime_pct: number;
    total: number;
    checks: HistoryCheck[];
    incidents: Incident[];
    heartbeat: HeartbeatBucket[];
    stats: MonitorStats;
}

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
                <button class="mhd__clear" aria-haspopup="menu"
                        aria-label="${i18n.t('monitor.clear_data')}" title="${i18n.t('monitor.clear_data')}">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    <svg class="mhd__caret" viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="mhd__clear-menu" hidden>
                    <button class="mhd__clear-item" data-scope="item">${i18n.t('monitor.clear_this')}</button>
                    <button class="mhd__clear-item" data-scope="all">${i18n.t('monitor.clear_all_services')}</button>
                </div>
            </div>
            <button class="mhd__refresh" aria-label="${i18n.t('monitor.refresh')}" title="${i18n.t('monitor.refresh')}">
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0012 4a8 8 0 108 8h-2a6 6 0 11-6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/></svg>
            </button>
        </div>
    </div>`;

// The API sends RFC3339 ("…T…Z"); tolerate the raw "YYYY-MM-DD HH:MM:SS" form too.
const parseTs = (s: string) => new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');

const fmtDuration = (sec: number): string => {
    if (sec < 60) return `${sec}s`;
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h} h ${rm} min` : `${h} h`;
};

const fmtDateTime = (s: string) => i18n.formatDateTime(parseTs(s), {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

const statusLabelOf = (status: string) => status === 'down'
    ? i18n.t('status.unreachable')
    : status === 'up' ? i18n.t('status.online') : i18n.t('monitor.status_unknown');

export const barTooltipHtml = (status: string, at: string) => `
    <div class="mhd__tip-status mhd__tip-status--${status}"><span class="mhd__tip-dot"></span>${escapeHtml(statusLabelOf(status))}</div>
    <div class="mhd__tip-sub">${escapeHtml(i18n.formatDateTime(parseTs(at)))}</div>`;

export const sparkTooltipHtml = (value: number, at: string) => `
    <div class="mhd__tip-value">${value} ms</div>
    <div class="mhd__tip-sub">${escapeHtml(i18n.formatDateTime(parseTs(at)))}</div>`;

// Outage log as a table (Uptime-Kuma "Events"): status, when, duration.
const incidentTable = (incidents: Incident[]): string => {
    const head = `
        <div class="mhd__ev-head">
            <span>${i18n.t('monitor.ev_status')}</span>
            <span>${i18n.t('monitor.ev_when')}</span>
            <span>${i18n.t('monitor.ev_duration')}</span>
        </div>`;
    if (!incidents.length) {
        return `<div class="mhd__events">${head}<div class="mhd__ev-empty">${i18n.t('monitor.no_incidents')}</div></div>`;
    }
    const rows = incidents.slice().reverse().map(inc => {
        const ongoing = !inc.end;
        return `
            <div class="mhd__ev-row">
                <span class="mhd__ev-badge ${ongoing ? 'mhd__ev-badge--down' : 'mhd__ev-badge--recovered'}">${escapeHtml(ongoing ? i18n.t('status.unreachable') : i18n.t('monitor.ev_recovered'))}</span>
                <span class="mhd__ev-when">${escapeHtml(fmtDateTime(inc.start))}</span>
                <span class="mhd__ev-dur">${escapeHtml(fmtDuration(inc.duration_sec))}</span>
            </div>`;
    }).join('');
    return `<div class="mhd__events">${head}${rows}</div>`;
};

const statCard = (value: string, label: string, sub: string) => `
    <div class="mhd__stat">
        <div class="mhd__stat-value">${escapeHtml(value)}</div>
        <div class="mhd__stat-label">${escapeHtml(label)}</div>
        <div class="mhd__stat-sub">${escapeHtml(sub)}</div>
    </div>`;

const pct = (v: number) => (v < 0 ? '—' : `${v.toFixed(2)}%`);

const statsGrid = (data: HistoryData): string => {
    const s = data.stats || { avg_ms_24h: null, uptime_24h: -1, uptime_7d: -1, uptime_30d: -1 };
    const current = data.current?.up && data.current.latency_ms != null ? `${data.current.latency_ms} ms` : '—';
    const avg = s.avg_ms_24h != null ? `${s.avg_ms_24h} ms` : '—';
    return `
        <div class="mhd__stats">
            ${statCard(current, i18n.t('monitor.response'), i18n.t('monitor.current'))}
            ${statCard(avg, i18n.t('monitor.response'), i18n.t('monitor.avg_24h'))}
            ${statCard(pct(s.uptime_24h), i18n.t('monitor.uptime'), '24h')}
            ${statCard(pct(s.uptime_7d), i18n.t('monitor.uptime'), '7d')}
            ${statCard(pct(s.uptime_30d), i18n.t('monitor.uptime'), '30d')}
        </div>`;
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
    const statusLabel = statusLabelOf(status);
    const incidents = data.incidents || [];
    const heartbeat = data.heartbeat || [];

    return `
        ${header(name)}
        ${rangeBar(data.range)}
        <div class="mhd__body">
            <div class="mhd__statuspill mhd__statuspill--${status}">
                <span class="mhd__statuspill-dot"></span>${escapeHtml(statusLabel)}
            </div>

            ${statsGrid(data)}

            <div class="mhd__chart-head">
                <span class="mhd__section-label">${i18n.t('monitor.latency')}</span>
                <span class="mhd__legend"><span class="mhd__legend-dot"></span>${i18n.t('monitor.latency')} (ms)</span>
            </div>
            <div class="mhd__chart" id="mhd-chart"></div>

            <div class="mhd__section-label">${i18n.t('monitor.recent_checks')}</div>
            <div class="mhd__heartbeat">${heartbeatStrip(heartbeat)}</div>
            ${heartbeatScale(heartbeat)}

            <div class="mhd__section-label">${i18n.t('monitor.incidents')}</div>
            ${incidentTable(incidents)}
        </div>
        ${footerBar()}`;
};
