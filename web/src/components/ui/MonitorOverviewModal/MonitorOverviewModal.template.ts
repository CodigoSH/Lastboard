import { i18n } from '../../../services/i18n';
import { escapeHtml } from '../../../services/escape';

export interface OverviewRow {
    item_id: number;
    name: string;
    status: string; // up | down | none
    uptime_pct: number;
    latency_ms: number | null;
    heartbeat: { status: string; at: string }[];
}

const miniHeartbeat = (heartbeat: { status: string }[]) =>
    (heartbeat || []).map(b => `<span class="mov-beat mov-beat--${b.status}"></span>`).join('');

const row = (r: OverviewRow) => {
    const uptime = r.uptime_pct < 0 ? '—' : `${r.uptime_pct.toFixed(1)}%`;
    const latency = r.status === 'up' && r.latency_ms != null ? `${r.latency_ms} ms` : '';
    return `
        <button class="mov-row" data-id="${r.item_id}" data-name="${escapeHtml(r.name)}">
            <span class="mov-status mov-status--${r.status}"></span>
            <span class="mov-name">${escapeHtml(r.name) || '—'}</span>
            <span class="mov-beats">${miniHeartbeat(r.heartbeat)}</span>
            <span class="mov-metrics">
                <span class="mov-uptime">${uptime}</span>
                <span class="mov-latency">${latency}</span>
            </span>
        </button>`;
};

export const shell = (inner: string) => `
    <dialog id="modal" aria-labelledby="mov-title">
        <div class="modal-header">
            <h3 class="modal-title" id="mov-title">${i18n.t('monitor.overview_title')}</h3>
            <button class="modal-close" id="modal-close" aria-label="${i18n.t('general.close')}">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <div class="mov-content" id="mov-body">${inner}</div>
    </dialog>`;

export const loadingBody = () => `<p class="mov-state">${i18n.t('general.loading')}</p>`;

export const emptyBody = () => `<p class="mov-state">${i18n.t('monitor.overview_empty')}</p>`;

export const listBody = (rows: OverviewRow[]) => `
    <div class="mov-list">${rows.map(row).join('')}</div>`;
