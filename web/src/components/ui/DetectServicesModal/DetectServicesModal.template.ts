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
    /** Where it is listed: to add, already on the board, or ignored. */
    group: RowGroup;
    /** The address in use is its console in the hypervisor's own interface, which is long and not one to read. */
    console: boolean;
}

/** One section of what is about to be added, as the board will show it: its title and the tiles that go in it. */
export interface PreviewSection { title: string; tiles: { name: string; iconUrl: string }[] }

/** The three places a service can be: what there is to do, what is already done, and what the person set aside. */
export type RowGroup = 'add' | 'linked' | 'ignored';

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
    /** Which of the two folded groups are unfolded. */
    open: { linked: boolean; ignored: boolean };
    /** The title the person gave the section, or '' to let the window choose. */
    sectionName: string;
    /** The titles the window would choose for what is ticked. */
    autoSections: string[];
    /** What is ticked, laid out as the sections it would make. */
    preview: PreviewSection[];
    /** Titles of the sections the chosen board already has. */
    boardSections: string[];
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

const faceButton = (r: RowView, t: T): string => {
    const inner = r.iconUrl
        ? `<img src="${e(safeImageSrc(r.iconUrl))}" alt="" loading="lazy">`
        : `<span class="face__letter" aria-hidden="true">${e(initialOf(r.name))}</span>`;
    // On a row to add, the tile is the button that opens the icon search, as a bookmark's icon is in its own window.
    return r.group === 'add'
        ? `<span class="face-cell"><button type="button" class="face" aria-label="${e(t('detect.choose_icon'))}" title="${e(t('detect.choose_icon'))}">${inner}<svg class="face__edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"></path></svg></button></span>`
        : `<span class="face-cell"><span class="face face--still">${inner}</span></span>`;
};

const act = (cls: string, label: string): string => `<button type="button" class="act act--${cls}">${e(label)}</button>`;

/**
 * One service. What it shows depends on what there is to do with it: a row to add can be ticked and edited and
 * ignored; one that is already on the board only says so, and can be added anyway; one that is ignored can be
 * taken back. The inputs of a row to add are folded away until it is edited, because nearly nobody edits.
 */
export function rowHtml(r: RowView, t: T): string {
    const head = `<div class="row row--${r.group}" data-key="${e(r.key)}" data-group="${r.group}" data-search="${e(`${r.name} ${r.key}`.toLowerCase())}">`;
    const note = noteText(r.note, t) ? `<span class="chip" title="${e(noteText(r.note, t))}">${e(noteText(r.note, t))}</span>` : '';
    if (r.group === 'linked') {
        return `${head}
        ${faceButton(r, t)}
        <div class="row__body"><div class="row__title"><span class="row__name">${e(r.name)}</span></div><div class="row__sub"><span class="chip chip--linked" title="${e(t('detect.already', { name: r.linkedTo }))}">${e(t('detect.already', { name: r.linkedTo }))}</span></div></div>
        <div class="row__actions">${act('anyway', t('detect.add_anyway'))}</div>
    </div>`;
    }
    if (r.group === 'ignored') {
        return `${head}
        ${faceButton(r, t)}
        <div class="row__body"><div class="row__title"><span class="row__name">${e(r.name)}</span></div><div class="row__sub"><span class="row__addr">${e(r.url)}</span></div></div>
        <div class="row__actions">${act('unignore', t('detect.unignore'))}</div>
    </div>`;
    }
    const choose = r.candidates.length > 1
        ? selectHtml('', r.candidates.map(c => ({ value: c, label: c })), r.url, t('detect.url'), 'alt', 460)
        : '';
    // What is known of it is said in words: whether its address answers, and what else there is to say.
    const addr = r.console
        ? `<span class="row__addr row__addr--console" title="${e(r.url)}">${e(t('detect.console_label'))}</span>`
        : `<span class="row__addr">${e(r.url)}</span>`;
    const sub = `${addr}<span class="row__health" title="${e(healthText(r.health, t))}" data-h="${e(r.health)}">${e(healthText(r.health, t))}</span>${note}`;
    return `${head}
        <input type="checkbox" class="pick" aria-label="${e(r.name)}"${r.checked ? ' checked' : ''}>
        ${faceButton(r, t)}
        <div class="row__body">
            <div class="row__title"><span class="row__name">${e(r.name)}</span></div>
            <div class="row__sub">${sub}</div>
        </div>
        <div class="row__actions">${act('edit', t('detect.edit'))}${act('ignore', t('detect.ignore'))}</div>
        <div class="row__edit" hidden>
            <label class="field"><span>${e(t('detect.name'))}</span><input type="text" class="name" value="${e(r.name)}" maxlength="80"></label>
            <div class="field"><span>${e(t('detect.url'))}</span><div class="row__url">${choose}<input type="text" class="addr" value="${e(r.url)}" aria-label="${e(t('detect.url'))}" spellcheck="false" autocomplete="off"></div></div>
            ${act('done', t('detect.done'))}
        </div>
    </div>`;
}

const CHEVRON = '<svg class="group__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';

/** A group of the list. The one to add is always open and carries the ticking; the other two fold. */
export function groupHtml(group: RowGroup, rows: RowView[], v: Pick<WindowView, 'open'>, t: T): string {
    if (group !== 'add' && rows.length === 0) return '';
    const title = e(t(`detect.group_${group === 'add' ? 'new' : group}`, { count: String(rows.length) }));
    if (group === 'add') {
        // Its title, its count and the explanation of what "not answering" means are the fixed head of the frame (see headHtml).
        return `<section class="group group--add" data-group="add">
            <div class="group__rows">${rows.length ? rows.map(r => rowHtml(r, t)).join('') : `<p class="group__empty">${e(t('detect.nothing_new'))}</p>`}</div>
        </section>`;
    }
    const open = v.open[group];
    return `<section class="group group--${group}" data-group="${group}">
            <button type="button" class="group__head group__head--fold" data-fold="${group}" aria-expanded="${open}">${CHEVRON}<span class="group__title">${title}</span></button>
            <div class="group__rows"${open ? '' : ' hidden'}>${rows.map(r => rowHtml(r, t)).join('')}</div>
        </section>`;
}

/** The list: what there is to add, then what is already on the board, then what was set aside. */
export function listHtml(v: Pick<WindowView, 'rows' | 'open'>, t: T): string {
    return (['add', 'linked', 'ignored'] as const).map(g => groupHtml(g, v.rows.filter(r => r.group === g), v, t)).join('');
}

const MAX_TILES = 18;

/** What is about to be added, as the board will show it: a box for each section with its title on the border and a tile for each bookmark. */
export function previewHtml(sections: PreviewSection[], t: T): string {
    return sections.map(sec => {
        const shown = sec.tiles.slice(0, MAX_TILES);
        const more = sec.tiles.length - shown.length;
        const tiles = shown.map(x => `<span class="tile" title="${e(x.name)}">${x.iconUrl ? `<img src="${e(safeImageSrc(x.iconUrl))}" alt="">` : `<span class="tile__letter">${e(initialOf(x.name))}</span>`}</span>`).join('');
        return `<div class="preview__box"><span class="preview__title" title="${e(sec.title)}">${e(sec.title)}</span><div class="preview__tiles">${tiles}${more > 0 ? `<span class="tile tile--more">+${more}</span>` : ''}</div></div>`;
    }).join('') || `<p class="preview__none">${e(t('detect.preview_none'))}</p>`;
}

/**
 * The head of the frame, which stays where it is while the rows go by: what the list is, how many there are, how many
 * are ticked, and — only while some row does not answer — what that means.
 */
export function headHtml(rows: RowView[], t: T): string {
    const add = rows.filter(r => r.group === 'add');
    const ticked = add.filter(r => r.checked).length;
    const down = add.some(r => r.health === 'down');
    return `<div class="head__line">
            <span class="head__title">${e(t('detect.group_new_title'))}</span><span class="head__count">${add.length}</span>
            <span class="head__sel" id="dt-sel" title="${ticked} / ${add.length}"><b>${ticked}</b> / ${add.length}<i class="head__bar"><i style="inline-size:${add.length ? Math.round((ticked / add.length) * 100) : 0}%"></i></i></span>
        </div>
        <p class="head__hint" id="dt-hint-down"${down ? '' : ' hidden'}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path></svg><span>${e(t('detect.hint_down'))}</span></p>`;
}

/** Whether the section the person is about to name — or the ones the window would make — are on the chosen board already. */
export interface SectionStatus { kind: 'none' | 'exists' | 'free' | 'mixed'; existing: number; created: number }

export function sectionStatus(v: Pick<WindowView, 'preview' | 'boardSections'>): SectionStatus {
    if (v.preview.length === 0) return { kind: 'none', existing: 0, created: 0 };
    const have = new Set(v.boardSections.map(x => x.trim().toLowerCase()));
    const existing = v.preview.filter(p => have.has(p.title.trim().toLowerCase())).length;
    const created = v.preview.length - existing;
    return { kind: created === 0 ? 'exists' : existing === 0 ? 'free' : 'mixed', existing, created };
}

/** The line beside the field's name that says whether the title is taken on the board: no section is made twice by accident. */
export function sectionStatusHtml(st: SectionStatus, t: T): string {
    if (st.kind === 'none') return '';
    const text = st.kind === 'exists' ? t('detect.section_exists')
        : st.kind === 'free' ? t('detect.section_free')
            : t('detect.section_mixed', { existing: String(st.existing), created: String(st.created) });
    return `<span class="status__dot" aria-hidden="true"></span>${e(text)}`;
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

/** What the section field shows while nothing has been typed: the title the window would choose, or that there are several. */
export function sectionPlaceholder(v: Pick<WindowView, 'autoSections'>, t: T): string {
    return v.autoSections.length === 1 ? v.autoSections[0] : v.autoSections.length > 1 ? t('detect.section_several') : '';
}

export function detectHtml(v: WindowView, t: T): string {
    const hostPick = v.hosts.length > 1
        ? `<div class="field"><span>${e(t('detect.host'))}</span>${selectHtml('dt-host', v.hosts.map(h => ({ value: h.id, label: h.name })), v.hostId, t('detect.host'))}</div>`
        : '';
    const boardPick = v.canPickBoard && v.boards.length > 1
        ? `<span class="where__label">${e(t('detect.board'))}</span><div class="where__control">${selectHtml('dt-board', v.boards.map(b => ({ value: String(b.id), label: b.name })), String(v.boardId ?? ''), t('detect.board'))}</div>`
        : '';

    let body: string;
    if (v.state === 'loading') body = `<div class="frame"><div class="list list--skeleton" aria-hidden="true"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div></div><p class="state" role="status">${e(t('detect.loading', { host: v.hostName }))}</p>`;
    else if (v.state === 'nohost') body = `<p class="state">${e(t(v.source === 'proxmox' ? 'detect.no_hypervisor' : 'detect.no_host'))}</p>`;
    else if (v.state === 'empty') body = `<p class="state">${e(v.error || t('detect.empty'))}</p>`;
    else {
        body = `<div class="tools">
                <label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg><input type="search" id="dt-search" placeholder="${e(t('detect.search'))}" aria-label="${e(t('detect.search'))}"></label>
                <span class="tools__group">
                    <button type="button" class="tool" id="dt-only-up"${v.rows.some(r => r.group === 'add' && r.health === 'up') && v.rows.some(r => r.group === 'add' && r.health === 'down') ? '' : ' hidden'}>${e(t('detect.only_up'))}</button>
                    <button type="button" class="tool" id="dt-all">${e(t('detect.all'))}</button>
                    <button type="button" class="tool" id="dt-none">${e(t('detect.none'))}</button>
                </span>
            </div>
            <div class="frame">${v.hostName ? `<span class="frame__title">${e(eyebrowText(v.source, v.hostName, t))}</span>` : ''}<div class="frame__head" id="dt-head">${headHtml(v.rows, t)}</div><div class="list" id="dt-list">${listHtml(v, t)}</div></div>
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
        <div class="footer${v.state === 'ready' ? ' footer--ready' : ''}">
            ${v.state === 'ready' ? `<div class="preview" id="dt-preview" aria-hidden="true">${previewHtml(v.preview, t)}</div>` : ''}
            <div class="footer__side">
                ${v.state === 'ready' ? `<div class="where__fields">
                    ${boardPick}
                    <label class="where__label" for="dt-section">${e(t('detect.section'))}</label>
                    <div class="where__control"><input type="text" id="dt-section" value="${e(v.sectionName)}" placeholder="${e(sectionPlaceholder(v, t))}" maxlength="60" autocomplete="off" spellcheck="false"></div>
                    <span class="status status--${sectionStatus(v).kind}" id="dt-section-status" role="status">${sectionStatusHtml(sectionStatus(v), t)}</span>
                </div>` : ''}
                <div class="footer__actions">
                    ${v.result ? resultHtml(v.result, t) : '<div class="result" id="dt-message" role="alert"></div>'}
                    <button type="button" class="btn" id="dt-cancel">${e(t('general.close'))}</button>
                    ${v.state === 'ready' ? `<button type="button" class="btn btn--primary" id="dt-create"${v.busy || v.selected === 0 ? ' disabled' : ''}>${e(t('detect.create', { count: String(v.selected) }))}</button>` : ''}
                </div>
            </div>
        </div>`;
}
