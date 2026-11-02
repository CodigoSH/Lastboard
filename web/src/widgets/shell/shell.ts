import { escapeHtml as e } from '../../services/escape';

/**
 * The body every infrastructure widget — Docker, Proxmox, Monitoring — is drawn from: a line of totals
 * under the tile's own name, one row per thing with its icon, name and readings, and a foot that says
 * how many are doing well and leads to the page. Pure: a widget hands in what it knows and gets markup
 * back, so the three cannot drift apart and a test can look at the result.
 */

export type Tone = 'ok' | 'warn' | 'bad' | 'off' | '';

/** One reading: a label, how it is written, and how full it is when it has a scale. */
export interface ShellMetric {
    label: string;
    text: string;
    /** 0–100. Without it the reading is only a figure. */
    pct?: number;
    /** Overrides the colour the percentage would give it. */
    tone?: Tone;
}

export interface ShellRow {
    /** What a click on it asks the page for, written as the page's history writes it. */
    sel: string;
    /** The icon, as an address, or '' for the board's own fallback. */
    face: string;
    name: string;
    /** The small line under the name. */
    sub?: string;
    /** Green, amber, red, or grey for a thing that is off. */
    tone: Tone;
    /** Something the person depends on is down with it: the row says so with a mark on its leading edge. */
    flag?: boolean;
    metrics: ShellMetric[];
    /** Said in place of the readings when there are none to show (a stopped machine). */
    note?: string;
    /** More markup after the readings, already escaped (the heartbeat strip of a service). */
    extra?: string;
}

export interface ShellSpec {
    /** Totals under the name: the readings of the whole. */
    summary: ShellMetric[];
    rows: ShellRow[];
    /** The words of the foot, already put together. */
    foot: string;
    /** The label of the link to the page; without it the foot has none. */
    seeAll?: string;
    /** Said instead of everything when there is nothing to draw (loading, an error, an empty list). */
    state?: string;
}

/** The fallback a bookmark with no icon wears, so a row and a tile are the same kind of thing. */
export const SHELL_FALLBACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';

const levelOf = (pct: number): 'ok' | 'warn' | 'bad' => (pct >= 90 ? 'bad' : pct >= 60 ? 'warn' : 'ok');

function metricHtml(m: ShellMetric, withBar: boolean): string {
    const level = m.tone && m.tone !== 'off' ? m.tone : m.pct === undefined ? '' : levelOf(m.pct);
    const bar = withBar && m.pct !== undefined
        ? `<span class="sh-bar"${level ? ` data-l="${level}"` : ''}><i style="width:${Math.min(100, Math.max(0, m.pct))}%"></i></span>`
        : '';
    return `<span class="sh-m"><span class="sh-m__top"><i>${e(m.label)}</i><b${level && level !== 'ok' ? ` class="${level}"` : ''}>${e(m.text)}</b></span>${bar}</span>`;
}

export function rowHtml(r: ShellRow): string {
    const face = r.face
        ? `<img src="${e(r.face)}" alt="" loading="lazy">`
        : SHELL_FALLBACK;
    const readings = r.note
        ? `<span class="sh-note">${e(r.note)}</span>`
        : r.metrics.map(m => metricHtml(m, true)).join('');
    return `<button type="button" class="sh-row${r.tone ? ` sh-row--${r.tone}` : ''}${r.flag ? ' sh-row--flag' : ''}" data-sel="${e(r.sel)}">
        <span class="sh-face${r.face ? '' : ' sh-face--none'}">${face}</span>
        <span class="sh-name"><b>${e(r.name) || '—'}</b>${r.sub ? `<small>${e(r.sub)}</small>` : ''}</span>
        <span class="sh-ms">${readings}</span>${r.extra ?? ''}
    </button>`;
}

export function shellHtml(s: ShellSpec): string {
    if (s.state !== undefined) return `<div class="sh-state">${e(s.state)}</div>`;
    const summary = s.summary.length ? `<div class="sh-sum">${s.summary.map(m => metricHtml(m, true)).join('')}</div>` : '';
    const link = s.seeAll ? `<button type="button" class="sh-more" data-act="all">${e(s.seeAll)} →</button>` : '';
    return `${summary}<div class="sh-rows">${s.rows.map(rowHtml).join('')}</div><div class="sh-foot"><span>${e(s.foot)}</span>${link}</div>`;
}

/** The look of it. Every colour is the theme's; every edge is logical, so the right-to-left languages mirror on their own. */
export const SHELL_CSS = `
:host {
    --ok: var(--success-color); --ok-rgb: var(--success-rgb);
    --warn: var(--warning-color); --warn-rgb: var(--warning-rgb);
    --danger: var(--danger-color);
    --track: color-mix(in srgb, var(--text-main) 9%, transparent);
    display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden;
    font-family: var(--font-sans); color: var(--text-main); box-sizing: border-box;
    /* The tile is whatever width the board gives it, and the rows answer to that — not to the viewport.
       The explicit width is not decoration: inline-size containment stops the box asking its contents how wide
       to be, and without a width of its own it collapses to nothing. */
    container-type: inline-size;
}
*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-align: start; }
.sh-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.sh-state { padding: 16px; font-size: 12px; color: var(--text-dim); text-align: center; margin: auto; }

.sh-sum { display: flex; gap: 12px; padding: 10px 14px 9px; flex-shrink: 0; border-bottom: 1px solid var(--border); }
.sh-m { flex: 1; min-width: 0; }
.sh-m__top { display: flex; justify-content: space-between; gap: 6px; font-family: var(--font-mono, monospace); font-size: 9.5px; letter-spacing: 0.08em; color: var(--text-dim); }
.sh-m__top i { font-style: normal; text-transform: uppercase; }
.sh-m__top b { color: var(--text-main); font-weight: 600; font-variant-numeric: tabular-nums; }
.sh-m__top b.warn { color: var(--warn); }
.sh-m__top b.bad { color: var(--danger); }
.sh-bar { display: block; height: 4px; border-radius: 99px; margin-top: 3px; background: var(--track); overflow: hidden; }
.sh-bar > i { display: block; height: 100%; border-radius: inherit; background: var(--ok); transition: width 0.6s var(--ease-out, ease), background 0.3s; }
.sh-bar[data-l="warn"] > i { background: var(--warn); }
.sh-bar[data-l="bad"] > i { background: var(--danger); }

.sh-rows { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
.sh-row {
    display: grid; grid-template-columns: 22px minmax(0, 1.4fr) minmax(0, 1.6fr); align-items: center; gap: 0 10px;
    width: 100%; padding: 7px 12px; border-bottom: 1px solid rgba(128, 128, 128, 0.08); transition: background 0.15s;
}
.sh-row:last-child { border-bottom: none; }
.sh-row:hover { background: rgba(var(--accent-rgb), 0.07); }
.sh-row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
/* Something the person depends on went down with it: the accent on the leading edge, on the side the reader starts from. */
.sh-row--flag { border-inline-start: 2px solid var(--accent); padding-inline-start: 10px; }
.sh-row--bad { background: rgba(var(--danger-rgb), 0.06); }
.sh-row--off .sh-name b { color: var(--text-dim); }

.sh-face { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 6px; overflow: hidden; background: var(--surface-solid); border: 1px solid var(--card-border); }
.sh-face img { width: 100%; height: 100%; object-fit: contain; }
.sh-face--none svg { width: 14px; height: 14px; fill: var(--text-dim); opacity: 0.6; }
.sh-row--bad .sh-face { border-color: rgba(var(--danger-rgb), 0.5); }
.sh-row--warn .sh-face { border-color: rgba(var(--warn-rgb), 0.5); }

.sh-name { min-width: 0; }
.sh-name b { display: block; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sh-name small { display: block; font-family: var(--font-mono, monospace); font-size: 10px; color: var(--text-dim); opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.sh-ms { display: flex; gap: 10px; align-items: center; justify-content: flex-end; min-width: 0; }
.sh-ms .sh-m { flex: 1 1 0; max-width: 90px; }
.sh-ms .sh-m__top { justify-content: flex-end; }
.sh-note { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--text-dim); }

/* A narrow tile keeps the name and the first reading and drops the bars; a very narrow one keeps the name alone. */
@container (max-width: 330px) { .sh-ms .sh-bar { display: none; } .sh-ms .sh-m { max-width: none; flex: none; } .sh-ms .sh-m__top i { display: none; } }
@container (max-width: 230px) { .sh-ms .sh-m:not(:first-child) { display: none; } .sh-sum .sh-m:not(:first-child) { display: none; } }

.sh-beats { grid-column: 2 / -1; display: flex; gap: 1px; height: 6px; margin-top: 5px; }
.sh-beats i { flex: 1 1 0; min-width: 0; border-radius: 1px; background: var(--track); }
.sh-beats i[data-s="up"] { background: var(--ok); }
.sh-beats i[data-s="down"] { background: var(--danger); }
.sh-beats i[data-s="none"] { opacity: 0.45; }

.sh-foot { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-top: 1px solid var(--border); flex-shrink: 0; font-family: var(--font-mono, monospace); font-size: 10.5px; color: var(--text-dim); }
.sh-more { margin-inline-start: auto; color: var(--accent); font-weight: 600; }
.sh-more:hover { text-decoration: underline; }
`;
