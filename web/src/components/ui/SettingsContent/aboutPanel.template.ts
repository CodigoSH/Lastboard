import { failureText } from '../../../services/notifyChannelList';
import { escapeHtml as esc } from '../../../services/escape';

/**
 * What About shows beside the product: the card with whatever needs the administrator, the dialog that lists
 * it all, and the dialog with the server's details behind a discreet button.
 *
 * Pure: the text and the formatting arrive as arguments, so a test can read every piece without the translation
 * singleton.
 */
export type T = (key: string, params?: Record<string, string>) => string;

export interface Fmt {
    num: (n: number) => string;
    date: (unixSeconds: number) => string;
    duration: (seconds: number) => string;
}

/** One thing the administrator should know and can fix, as the server lists it. */
export interface AttentionItem {
    key: string;
    tone: 'bad' | 'warn' | 'info';
    params?: Record<string, string | number | boolean>;
}

/** What the server says about itself for the details dialog. */
export interface ServerDetails {
    version?: string;
    go?: string;
    os?: string;
    uptime_seconds?: number;
    started_at?: number;
    database_bytes?: number;
    schema?: number;
    disk_free_bytes?: number;
    disk_total_bytes?: number;
    memory_bytes?: number;
    host?: { cpu_percent: number; cores: number; mem_total_bytes: number; mem_used_bytes: number; temperature?: number };
    config?: { trust_proxy: boolean; proxy_hops: number; auth_proxy: boolean; https: boolean };
}


const svg = (path: string, size = 16) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${path}</svg>`;
const ICON = {
    warning: (s?: number) => svg('<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>', s),
    check: (s?: number) => svg('<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>', s),
    info: (s?: number) => svg('<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>', s),
    disk: (s?: number) => svg('<path d="M20 12H4v6h16v-6zM6 16a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM5.4 5.1 3 11h18l-2.4-5.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z"/>', s),
    bell: (s?: number) => svg('<path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>', s),
    pulse: (s?: number) => svg('<path d="M3 13h4l2-6 4 12 2-6h6v-2h-4.6L14 4.6 10 16.4 8.4 11H3z"/>', s),
    lock: (s?: number) => svg('<path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>', s),
    update: (s?: number) => svg('<path d="M21 10.12h-6.78l2.74-2.82A7 7 0 0 0 7.12 7.2a6.95 6.95 0 0 0 0 9.9 7.04 7.04 0 0 0 9.9 0A6.6 6.6 0 0 0 19 12.12h2a8.67 8.67 0 0 1-2.6 6.4 9.02 9.02 0 0 1-12.66 0A8.97 8.97 0 0 1 5.74 5.88a8.94 8.94 0 0 1 12.6 0L21 3v7.12z"/>', s),
    chevron: (s?: number) => svg('<path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>', s),
    chip: (s?: number) => svg('<path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7a2 2 0 0 0-2-2h-2V3h-2v2h-2V3H9v2H7a2 2 0 0 0-2 2v2H3v2h2v2H3v2h2v2a2 2 0 0 0 2 2h2v2h2v-2h2v2h2v-2h2a2 2 0 0 0 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/>', s),
    copy: (s?: number) => svg('<path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>', s),
    close: () => svg('<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>', 20),
};

/** Bytes for a person: the decimal units a disk is sold in. */
export function bytesText(n: number, fmt: Fmt): string {
    const units = ['B', 'kB', 'MB', 'GB', 'TB'];
    let v = n;
    let i = 0;
    while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
    return `${fmt.num(Math.round(v * 10) / 10)} ${units[i]}`;
}

const TONE_ORDER = { bad: 0, warn: 1, info: 2 } as const;

/** Worst first; the server's order within one tone. */
export function attentionInOrder(items: AttentionItem[]): AttentionItem[] {
    return items
        .map((item, i) => ({ item, i }))
        .sort((a, b) => TONE_ORDER[a.item.tone] - TONE_ORDER[b.item.tone] || a.i - b.i)
        .map(x => x.item);
}

interface Words { icon: string; title: string; why?: string; code?: string; act?: string; after?: string[]; link?: { label: string; attrs: string } }

/** The service file of a native installation and the command that makes a change in it count: never translated. */
export const SERVICE_FILE = '/etc/systemd/system/lastboard.service';
/** The line that opens it for editing: what a person types, not only where the file is. */
export const EDIT_COMMAND = `sudo nano ${SERVICE_FILE}`;
export const RESTART_COMMAND = 'sudo systemctl daemon-reload && sudo systemctl restart lastboard';

/**
 * What to do about a setting that is read at start: where it lives depends on how Lastboard is installed.
 * The file and the command are not part of the sentence, so they are not interpolated into it: the translation
 * wraps every interpolated value in marks that say which way to read it, invisible, and a command copied with
 * one at its end is not a command any more (systemctl: unit "lastboard\u2069" not found).
 */
export function restartWords(install: unknown, t: T): Pick<Words, 'act' | 'after'> {
    return install === 'container'
        ? { act: t('attention.restart_container') }
        : { act: t('attention.restart_native'), after: [EDIT_COMMAND, RESTART_COMMAND] };
}

/** What each kind of item says: what is wrong, why it matters, the one thing to do. Null for a kind this page does not know. */
function words(item: AttentionItem, t: T, fmt: Fmt): Words | null {
    const p = item.params ?? {};
    switch (item.key) {
        case 'disk':
            return {
                icon: ICON.disk(14), title: t('attention.disk'),
                why: t('attention.disk_why', { free: bytesText(Number(p.free_bytes), fmt), total: bytesText(Number(p.total_bytes), fmt) }),
                act: t('attention.disk_act'),
            };
        case 'channels': {
            const why = failureText(String(p.reason ?? ''));
            return {
                icon: ICON.bell(14), title: t('attention.channels', { count: fmt.num(Number(p.count)) }),
                why: t('attention.channels_why', { names: String(p.names ?? ''), reason: t(why.key, why.params) }),
                link: { label: t('attention.channels_act'), attrs: 'href="#" data-action="attention-open-section" data-section="notifications"' },
            };
        }
        case 'socket':
            return p.trust_proxy
                ? { icon: ICON.pulse(14), title: t('attention.socket'), why: t('attention.socket_why'), act: t('attention.socket_act_host') }
                : { icon: ICON.pulse(14), title: t('attention.socket'), why: t('attention.socket_why'), code: 'TRUST_PROXY=true', ...restartWords(p.install, t) };
        case 'proxy':
            return { icon: ICON.warning(14), title: t('attention.proxy'), why: t('attention.proxy_why'), code: 'TRUST_PROXY=true', ...restartWords(p.install, t) };
        case 'https':
            return { icon: ICON.lock(14), title: t('attention.https'), why: t('attention.https_why'), act: t('attention.https_act') };
        case 'update':
            return {
                icon: ICON.update(14), title: t('attention.update', { version: String(p.version ?? '') }),
                link: { label: t('attention.update_act'), attrs: 'href="#" data-action="attention-open-update"' },
            };
        default:
            return null;
    }
}

/** The card: how many, the worst three by name, the way to all. With nothing to say, says so in green and is not a button. */
export function attentionCardHtml(items: AttentionItem[], t: T, fmt: Fmt): string {
    const known = attentionInOrder(items).filter(i => words(i, t, fmt) !== null);
    const label = `<span class="about-attn__label">${esc(t('attention.title'))}</span>`;
    if (known.length === 0) {
        return `<div class="bento-card about-attn about-attn--ok" id="attention-card">
            <div class="about-attn__top">${label}${ICON.check()}</div>
            <p class="about-attn__ok">${esc(t('attention.all_good'))}</p>
            <p class="about-attn__sub">${esc(t('attention.nothing'))}</p>
        </div>`;
    }
    const tone = known[0]?.tone === 'info' ? 'info' : 'warn';
    const shown = known.slice(0, 3);
    return `<div class="bento-card about-attn about-attn--${tone}" id="attention-card" data-action="open-attention" role="button" tabindex="0" aria-haspopup="dialog">
        <div class="about-attn__top">${label}${tone === 'info' ? ICON.info() : ICON.warning()}</div>
        <div class="about-attn__main">
            <span class="about-attn__count">${esc(fmt.num(known.length))}</span>
            <span class="about-attn__list">${shown.map(i => `<span class="about-attn__item"><i class="about-dot about-dot--${i.tone}" aria-hidden="true"></i>${esc(words(i, t, fmt)!.title)}</span>`).join('')}${
                known.length > shown.length ? `<span class="about-attn__more">${esc(t('attention.more', { count: fmt.num(known.length - shown.length) }))}</span>` : ''}</span>
        </div>
        <div class="about-attn__foot"><span class="about-attn__see">${esc(t('attention.see_all'))}${ICON.chevron(14)}</span></div>
    </div>`;
}

/**
 * A command or a setting to type, with a button that puts it on the clipboard: selecting it by hand is where a
 * character is lost. What is copied is the attribute, never read back out of the page.
 */
function codeCopy(text: string, t: T): string {
    const label = esc(t('attention.copy'));
    return `<span class="about-code"><code>${esc(text)}</code><button type="button" class="about-code__copy" data-action="copy-code" data-copy="${esc(text)}" data-done="${esc(t('attention.copied'))}" aria-label="${label}" title="${label}"><span class="about-code__ic">${ICON.copy(13)}</span><span class="about-code__ok">${ICON.check(13)}</span></button></span>`;
}

/** Every item, worst first, each with what is wrong, why it matters and the one thing to do. */
export function attentionListHtml(items: AttentionItem[], t: T, fmt: Fmt): string {
    return attentionInOrder(items).map(item => {
        const w = words(item, t, fmt);
        if (!w) return '';
        const fix = `${w.code ? codeCopy(w.code, t) : ''}${w.act ? `<span>${esc(w.act)}</span>` : ''}${(w.after ?? []).map(c => codeCopy(c, t)).join('')}${
            w.link ? `<a class="about-need__link" ${w.link.attrs}>${esc(w.link.label)}${ICON.chevron(14)}</a>` : ''}`;
        return `<div class="about-need about-need--${item.tone}" data-attention-item="${esc(item.key)}">
            <span class="about-need__mark">${w.icon}</span>
            <span class="about-need__text"><b>${esc(w.title)}</b>${w.why ? `<span>${esc(w.why)}</span>` : ''}${fix ? `<span class="about-need__fix">${fix}</span>` : ''}</span>
        </div>`;
    }).join('');
}

/** What "Copy for support" puts on the clipboard: what a bug report needs, in one language for anyone. */
export function supportText(d: ServerDetails): string {
    return [
        `Lastboard ${d.version ?? '?'}`,
        `${d.os ?? '?'} · ${d.go ?? '?'}`,
        `schema ${d.schema ?? '?'}`,
        d.config ? `proxy ${d.config.trust_proxy ? `on (${d.config.proxy_hops})` : 'off'} · https ${d.config.https ? 'yes' : 'no'}` : '',
    ].filter(Boolean).join('\n');
}

const DIALOG_STYLE = 'background: var(--paper-bg); backdrop-filter: var(--modal-blur); -webkit-backdrop-filter: var(--modal-blur); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px;';

const dialog = (id: string, title: string, count: string, body: string, t: T) => `
    <dialog id="${id}" class="about-dialog" style="${DIALOG_STYLE} width: 640px; max-width: calc(100vw - 32px);">
        <div class="modal-header">
            <h3 class="modal-title">${esc(title)}${count ? `<span class="modal-count" id="${id}-count">${esc(count)}</span>` : ''}</h3>
            <button class="modal-close" data-action="close-modal" data-modal="${id}" aria-label="${esc(t('general.close'))}">${ICON.close()}</button>
        </div>
        ${body}
    </dialog>`;

export function attentionDialogHtml(items: AttentionItem[], t: T, fmt: Fmt): string {
    return dialog('attention-modal', t('attention.title'), fmt.num(items.length),
        `<div class="about-needs" id="attention-body">${attentionListHtml(items, t, fmt)}</div>`, t);
}

/** The details dialog: the machine, the installation and how it is set up, and the copy for support. */
export function serverDialogHtml(d: ServerDetails | null, t: T, fmt: Fmt): string {
    if (!d) return dialog('server-modal', t('server_info.title'), '', `<p class="settings-content__text-dim">…</p>`, t);
    const row = (label: string, value: string, extra = '') =>
        `<div class="about-kv"><span class="about-kv__k">${esc(label)}</span><span class="about-kv__v">${value}</span>${extra}</div>`;
    const meter = (used: number, total: number, label: string) => total > 0
        ? `<meter class="about-meter" min="0" max="${Math.round(total)}" value="${Math.round(used)}" low="${Math.round(total * 0.75)}" high="${Math.round(total * 0.9)}" optimum="0" aria-label="${esc(label)}"></meter>`
        : '';
    const state = (on: boolean, text: string) => `<i class="about-dot about-dot--${on ? 'ok' : 'off'}" aria-hidden="true"></i>${esc(text)}`;
    const small = (s: string) => ` <small>${esc(s)}</small>`;

    const machine: string[] = [];
    if (d.host) {
        const h = d.host;
        machine.push(row(t('server_info.cpu'), `${esc(fmt.num(Math.round(h.cpu_percent)))} %${small(t('server_info.cores', { count: fmt.num(h.cores) }))}`, meter(h.cpu_percent, 100, t('server_info.cpu'))));
        machine.push(row(t('server_info.memory'), esc(t('server_info.used_of', { used: bytesText(h.mem_used_bytes, fmt), total: bytesText(h.mem_total_bytes, fmt) })), meter(h.mem_used_bytes, h.mem_total_bytes, t('server_info.memory'))));
        machine.push(row(t('server_info.temperature'), h.temperature !== undefined ? `${esc(fmt.num(Math.round(h.temperature)))} °C` : esc(t('widget.telemetry.remote.no_sensor'))));
    }
    if (d.disk_free_bytes !== undefined && d.disk_total_bytes !== undefined) {
        machine.push(row(t('server_info.disk'), esc(t('server_info.free_of', { free: bytesText(d.disk_free_bytes, fmt), total: bytesText(d.disk_total_bytes, fmt) })),
            meter(d.disk_total_bytes - d.disk_free_bytes, d.disk_total_bytes, t('server_info.disk'))));
    }
    if (d.uptime_seconds !== undefined) {
        machine.push(row(t('server_info.uptime'), `${esc(fmt.duration(d.uptime_seconds))}${d.started_at !== undefined ? small(t('server_info.since', { date: fmt.date(d.started_at) })) : ''}`));
    }

    const install = [
        row(t('server_info.version'), esc(d.version || '—')),
        d.database_bytes !== undefined ? row(t('server_info.database'), `${esc(bytesText(d.database_bytes, fmt))}${d.schema !== undefined ? small(t('server_info.schema', { schema: fmt.num(d.schema) })) : ''}`) : '',
        d.memory_bytes !== undefined ? row(t('server_info.app_memory'), esc(bytesText(d.memory_bytes, fmt))) : '',
        row(t('server_info.platform'), esc([d.os, d.go].filter(Boolean).join(' · ') || '—')),
    ];

    const c = d.config;
    const config = c ? [
        row(t('server_info.proxy'), state(c.trust_proxy, c.trust_proxy ? t('server_info.proxy_yes', { hops: fmt.num(c.proxy_hops) }) : t('server_info.no'))),
        row(t('server_info.auth_proxy'), state(c.auth_proxy, t(c.auth_proxy ? 'server_info.set' : 'server_info.not_set'))),
        row(t('server_info.https'), state(c.https, t(c.https ? 'server_info.yes' : 'server_info.no'))),
    ] : [];

    const group = (title: string, rows: string[]) =>
        rows.filter(Boolean).length === 0 ? '' : `<p class="about-group">${esc(title)}</p><div class="about-kvs">${rows.join('')}</div>`;

    return dialog('server-modal', t('server_info.title'), '', `
        <div class="about-details">
            ${group(t('server_info.machine'), machine)}
            ${group(t('server_info.install'), install)}
            ${group(t('server_info.config'), config)}
            <textarea class="about-support" id="support-text" readonly hidden rows="4" aria-label="${esc(t('server_info.copy'))}">${esc(supportText(d))}</textarea>
            <div class="about-details__foot">
                <app-button data-action="copy-support">${ICON.copy(15)}<span>${esc(t('server_info.copy'))}</span></app-button>
            </div>
        </div>`, t);
}

/** The discreet way to the details, in the product card's corner. */
export function serverButtonHtml(t: T): string {
    return `<button type="button" class="about-server-btn" data-action="open-server">${ICON.chip(13)}<span>${esc(t('server_info.title'))}</span></button>`;
}
