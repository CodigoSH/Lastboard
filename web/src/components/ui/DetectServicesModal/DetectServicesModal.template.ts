import { escapeHtml as e, safeImageSrc } from '../../../services/escape';
import type { GroupBy, ProposalNote } from '../../../services/discoverServices';

/**
 * The window that lists what a host's containers could become on the board.
 * Pure on purpose: the text arrives through `t` and everything that comes from a
 * container is escaped here, so a test can read what the window would say.
 */
export type T = (key: string, params?: Record<string, string>) => string;

export interface RowView {
    key: string;
    checked: boolean;
    name: string;
    /** What the address box holds. */
    url: string;
    /** More than one way to reach it: the addresses on offer. */
    candidates: string[];
    note: ProposalNote;
    /** The bookmark that already serves it, or ''. */
    linkedTo: string;
    /** The address of an icon to show, or ''. */
    iconUrl: string;
    /** Whether the address in the box answered when it was asked, or '' when it was not asked. */
    health: 'up' | 'down' | '';
    /** Left out on purpose the last time. */
    dismissed: boolean;
}

/** The words for a probe's answer; '' for none. */
export const healthText = (h: RowView['health'], t: T): string =>
    h === 'up' ? t('detect.reachable') : h === 'down' ? t('detect.unreachable') : '';

export type WindowState = 'loading' | 'ready' | 'empty' | 'nohost' | 'done';

/** What the window is listing the services of. */
export type Source = 'docker' | 'proxmox';

export interface ResultView {
    created: number;
    failed: number;
    notFit: number;
    /** What Undo would take back; 0 hides the button. */
    undoable: number;
    undone: number | null;
}

export interface WindowView {
    source: Source;
    state: WindowState;
    hostName: string;
    hosts: { id: string; name: string }[];
    hostId: string;
    address: string;
    groupBy: GroupBy;
    rows: RowView[];
    /** Containers with nothing to open, which are not listed. */
    withoutAddress: number;
    boards: { id: number; name: string }[];
    boardId: number | null;
    canPickBoard: boolean;
    selected: number;
    result: ResultView | null;
    busy: boolean;
    /** Why the host could not be read, already worded; '' when it could. */
    error: string;
}

const noteText = (n: ProposalNote, t: T): string =>
    n === 'host_network' ? t('detect.note_host_network')
        : n === 'stopped' ? t('detect.note_stopped')
            : n === 'no_ip' ? t('detect.note_no_ip') : '';

/** The letter a service wears until it has an icon: its first, past the ordinal a machine is filed under ("05 Bookorbit"). */
export function initialOf(name: string): string {
    const first = [...name.trim().replace(/^[\d\s._-]+/, '')][0] ?? '';
    return first.toUpperCase();
}

export interface SelectChoice { value: string; label: string }

/**
 * The product's own dropdown (`app-select`). Its options travel as data and are given to the element
 * after the markup is written, because an element takes its options as a property, not as markup.
 */
export function selectHtml(id: string, options: SelectChoice[], value: string, label: string, cls = '', menuMin = 0): string {
    return `<app-select${id ? ` id="${e(id)}"` : ''}${cls ? ` class="${e(cls)}"` : ''} value="${e(value)}" aria-label="${e(label)}"${menuMin ? ` menu-min-width="${menuMin}"` : ''} data-options="${e(JSON.stringify(options))}"></app-select>`;
}

export function rowHtml(r: RowView, t: T): string {
    const faceInner = r.iconUrl
        ? `<img src="${e(safeImageSrc(r.iconUrl))}" alt="" loading="lazy">`
        : `<span class="face__letter" aria-hidden="true">${e(initialOf(r.name))}</span>`;
    // The tile is the button that opens the icon search, as a bookmark's icon is in its own window.
    const face = `<span class="face-cell"><button type="button" class="face" aria-label="${e(t('detect.choose_icon'))}" title="${e(t('detect.choose_icon'))}">${faceInner}<svg class="face__edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"></path></svg></button></span>`;
    const choose = r.candidates.length > 1
        ? selectHtml('', r.candidates.map(c => ({ value: c, label: c })), r.url, t('detect.url'), 'alt', 460)
        : '';
    // The pills say what is known about it: whether its address answers, then what else there is to say. The first is
    // always in place (empty until it is known), so the line keeps its height and the rows keep one rhythm.
    const chips = [
        `<span class="row__health" title="${e(healthText(r.health, t))}" data-h="${e(r.health)}">${e(healthText(r.health, t))}</span>`,
        noteText(r.note, t) ? `<span class="chip">${e(noteText(r.note, t))}</span>` : '',
        r.linkedTo ? `<span class="chip chip--linked">${e(t('detect.already', { name: r.linkedTo }))}</span>` : '',
        r.dismissed && !r.linkedTo ? `<span class="chip">${e(t('detect.dismissed'))}</span>` : '',
    ].join('');
    return `<div class="row${r.linkedTo ? ' is-linked' : ''}" data-key="${e(r.key)}" data-search="${e(`${r.name} ${r.key}`.toLowerCase())}">
        <input type="checkbox" class="pick" aria-label="${e(r.name)}"${r.checked ? ' checked' : ''}>
        ${face}
        <div class="row__id">
            <input type="text" class="name" value="${e(r.name)}" aria-label="${e(t('detect.name'))}" maxlength="80">
            <div class="row__meta">${chips}</div>
        </div>
        <div class="row__url">${choose}<input type="text" class="addr" value="${e(r.url)}" aria-label="${e(t('detect.url'))}" spellcheck="false" autocomplete="off"></div>
    </div>`;
}

export function resultHtml(r: ResultView, t: T): string {
    const lines: string[] = [];
    if (r.undone != null) lines.push(`<span>${e(t('detect.undone', { count: String(r.undone) }))}</span>`);
    else {
        lines.push(`<span>${e(t('detect.added', { count: String(r.created) }))}</span>`);
        if (r.failed) lines.push(`<span class="bad">${e(t('detect.failed', { count: String(r.failed) }))}</span>`);
        if (r.notFit) lines.push(`<span class="bad">${e(t('detect.limit', { count: String(r.notFit) }))}</span>`);
    }
    const undo = r.undone == null && r.undoable > 0 ? `<button type="button" class="link" id="dt-undo">${e(t('detect.undo'))}</button>` : '';
    return `<div class="result" role="status">${lines.join('')}${undo}</div>`;
}

/** The product and the host, unless the host is already named after the product. */
export function eyebrowText(source: Source, host: string, t: T): string {
    const product = t(source === 'proxmox' ? 'widget.proxmox.name' : 'widget.docker.name');
    return host.toLowerCase().includes(product.toLowerCase()) ? host : `${product} · ${host}`;
}

/** How many are ticked of how many there are: the figures are the same in every language. */
export function countHtml(selected: number, total: number): string {
    return `<b>${selected}</b> / ${total}`;
}

export function detectHtml(v: WindowView, t: T): string {
    const hostPick = v.hosts.length > 1
        ? `<div class="field"><span>${e(t('detect.host'))}</span>${selectHtml('dt-host', v.hosts.map(h => ({ value: h.id, label: h.name })), v.hostId, t('detect.host'))}</div>`
        : '';
    const boardPick = v.canPickBoard && v.boards.length > 1
        ? `<div class="field"><span>${e(t('detect.board'))}</span>${selectHtml('dt-board', v.boards.map(b => ({ value: String(b.id), label: b.name })), String(v.boardId ?? ''), t('detect.board'))}</div>`
        : '';

    let body: string;
    if (v.state === 'loading') body = `<div class="frame"><div class="list list--skeleton" aria-hidden="true"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div></div><p class="state" role="status">${e(t('detect.loading', { host: v.hostName }))}</p>`;
    else if (v.state === 'nohost') body = `<p class="state">${e(t(v.source === 'proxmox' ? 'detect.no_hypervisor' : 'detect.no_host'))}</p>`;
    else if (v.state === 'empty') body = `<p class="state">${e(v.error || t('detect.empty'))}</p>`;
    else {
        body = `<div class="tools">
                <label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input type="search" id="dt-search" placeholder="${e(t('detect.search'))}" aria-label="${e(t('detect.search'))}"></label>
                <button type="button" class="link" id="dt-all">${e(t('detect.all'))}</button>
                <button type="button" class="link" id="dt-none">${e(t('detect.none'))}</button>
                <span class="count" id="dt-count">${countHtml(v.selected, v.rows.length)}</span>
            </div>
            <div class="frame">${v.hostName ? `<span class="frame__title">${e(eyebrowText(v.source, v.hostName, t))}</span>` : ''}<div class="list" id="dt-list">${v.rows.map(r => rowHtml(r, t)).join('')}</div></div>
            ${v.withoutAddress ? `<p class="hint">${e(t('detect.hidden', { count: String(v.withoutAddress) }))}</p>` : ''}`;
    }

    const showControls = v.state === 'ready' || v.state === 'done';
    // A machine has an address of its own; only a Docker host has one that its ports are built on.
    const dockerControls = v.source === 'docker'
        ? `<label class="field"><span>${e(t('detect.address'))}</span><input type="text" id="dt-address" value="${e(v.address)}" spellcheck="false" autocomplete="off"></label>
            <div class="field"><span>${e(t('detect.group'))}</span>${selectHtml('dt-group', [{ value: 'host', label: t('detect.group_host') }, { value: 'project', label: t('detect.group_project') }], v.groupBy, t('detect.group'))}</div>`
        : '';
    return `<div class="header">
            <div class="title-group"><h3 id="dt-title">${e(t('detect.title'))}</h3><p>${e(t('detect.subtitle'))}</p></div>
            <button type="button" class="close-btn" id="dt-close" aria-label="${e(t('general.close'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
        </div>
        ${showControls ? `<div class="controls">
            ${hostPick}
            ${dockerControls}
        </div>` : hostPick ? `<div class="controls">${hostPick}</div>` : ''}
        ${body}
        <div class="footer">
            ${boardPick}
            ${v.result ? resultHtml(v.result, t) : '<div class="result" id="dt-message" role="alert"></div>'}
            <button type="button" class="btn" id="dt-cancel">${e(t('general.close'))}</button>
            ${v.state === 'ready' ? `<button type="button" class="btn btn--primary" id="dt-create"${v.busy || v.selected === 0 ? ' disabled' : ''}>${e(t('detect.create', { count: String(v.selected) }))}</button>` : ''}
        </div>`;
}
