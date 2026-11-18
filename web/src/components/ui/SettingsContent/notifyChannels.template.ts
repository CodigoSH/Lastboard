import { escapeHtml as esc } from '../../../services/escape';
import { addableTypes, alertsOn, channelHost, failureText, type ChannelType, type NotifyChannel } from '../../../services/notifyChannelList';

/**
 * The channels alerts go to, as Preferences draws them: a card with the list, one row per channel with its own
 * switch, and the window that adds or edits one. Pure: the text arrives through `t` and the time through `when`,
 * so a test can read what the screen would say without the translation singleton. Everything that comes from
 * a channel (its name, its address) is escaped here.
 */
export type T = (key: string, params?: Record<string, string>) => string;

const ICON_EDIT = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DELETE = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19.41 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

/** The name of a kind. ntfy and Gotify are the products' own names and are not translated. */
export function typeLabel(type: ChannelType, t: T): string {
    switch (type) {
        case 'ntfy': return 'ntfy';
        case 'gotify': return 'Gotify';
        case 'webhook': return t('settings.notify_webhook');
        default: return t('settings.notify_push');
    }
}

/** What a row calls a channel: the name its owner gave, or else the kind. */
export const channelTitle = (c: Pick<NotifyChannel, 'name' | 'type'>, t: T): string => c.name.trim() || typeLabel(c.type, t);

export interface RowContext {
    /** How many browsers the account has subscribed to push; null while it is not known. */
    devices: number | null;
    /** A moment (Unix seconds) said in words, as "5 minutes ago". */
    when: (unixSeconds: number) => string;
}

/** The line under a channel: why it is quiet, how its last alert went, or where it goes. */
export function channelNote(c: NotifyChannel, t: T, ctx: RowContext): { text: string; tone: 'up' | 'bad' | 'off' | 'idle' } {
    if (!c.enabled) return { text: t('notify.off'), tone: 'off' };
    if (c.last) {
        const time = ctx.when(c.last.at);
        if (c.last.ok) return { text: t('notify.last_ok', { time }), tone: 'up' };
        const why = failureText(c.last.error);
        return { text: t('notify.last_failed', { time, reason: t(why.key, why.params) }), tone: 'bad' };
    }
    if (c.type === 'push') {
        return { text: ctx.devices === null ? typeLabel(c.type, t) : t('notify.devices_count', { count: String(ctx.devices) }), tone: 'idle' };
    }
    const host = channelHost(c.url);
    return { text: host ? `${typeLabel(c.type, t)} · ${host}` : typeLabel(c.type, t), tone: 'idle' };
}

export function channelRowHtml(c: NotifyChannel, index: number, t: T, ctx: RowContext): string {
    const note = channelNote(c, t, ctx);
    const title = channelTitle(c, t);
    return `
    <div class="settings-content__row px-row" data-channel="${esc(c.id)}">
        <span class="px-row__dot px-row__dot--${note.tone}"></span>
        <div class="px-row__body">
            <div class="px-row__name">${esc(title)}</div>
            <div class="px-row__note px-row__note--${note.tone}">${esc(note.text)}</div>
        </div>
        <label class="toggle-switch" title="${esc(t('notify.enabled'))}">
            <input type="checkbox" data-change="channel-toggle" data-index="${index}" aria-label="${esc(t('notify.enabled'))}: ${esc(title)}" ${c.enabled ? 'checked' : ''}>
            <span class="slider"></span>
        </label>
        <div class="user-actions">
            <button class="user-action-btn edit" data-action="edit-channel" data-index="${index}"
                    title="${esc(t('general.edit'))}" aria-label="${esc(t('general.edit'))}: ${esc(title)}">${ICON_EDIT}</button>
            <button class="user-action-btn delete" data-action="delete-channel" data-index="${index}"
                    title="${esc(t('action.remove'))}" aria-label="${esc(t('action.remove'))}: ${esc(title)}">${ICON_DELETE}</button>
        </div>
    </div>`;
}

export interface CardView {
    channels: NotifyChannel[];
    max: number;
    /** 24/7 monitoring is on: alerts only go out while it is. */
    monitoringOn: boolean;
}

/** The list, with what the person needs to know about it: whether alerts can go out, and whether anything is on. */
export function channelsCardHtml(v: CardView, t: T, ctx: RowContext): string {
    const canAddAny = addableTypes(v.channels, v.max).length > 0;
    return `
        <div class="bento-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:12px;">
                <h3 class="settings-content__title" style="margin:0;">${esc(t('settings.notifications'))}</h3>
                ${canAddAny ? `<app-button variant="primary" data-action="add-channel" style="width:auto; padding:0 16px;">+ ${esc(t('notify.add'))}</app-button>` : ''}
            </div>
            <p class="settings-content__text-dim" style="font-size: 13px; margin: -12px 0 16px;">${esc(t('notify.desc'))}</p>
            ${!v.monitoringOn ? `
            <div class="settings-content__action-row" style="margin-bottom:16px;">
                <div class="settings-content__action-info"><p>${esc(t('settings.alerts_requires_247'))}</p></div>
                <app-button variant="ghost" data-action="open-monitoring">${esc(t('notify.open_monitoring'))}</app-button>
            </div>` : ''}
            <div class="settings-content__user-list">
                ${v.channels.map((c, i) => channelRowHtml(c, i, t, ctx)).join('')}
            </div>
            ${v.channels.length === 0 ? `<p class="settings-content__text-dim">${esc(t('notify.none'))}</p>` : ''}
            ${!canAddAny && v.channels.length >= v.max ? `<p class="settings-content__text-dim" style="font-size: 12px;">${esc(t('notify.limit', { count: String(v.max) }))}</p>` : ''}
            ${v.channels.length > 0 && !alertsOn(v.channels) ? `<p class="settings-content__text-dim" style="font-size: 12px; margin-top: 12px;">${esc(t('notify.all_off'))}</p>` : ''}
        </div>`;
}

/**
 * The window that adds or edits one channel. Its fields are filled and shown or hidden by kind when it opens;
 * the markup is the same for every kind, and a kind with no address (push) hides the rows that have one.
 */
export function channelModalHtml(t: T): string {
    return `
    <dialog id="channel-modal" style="background: var(--paper-bg); backdrop-filter: var(--modal-blur); -webkit-backdrop-filter: var(--modal-blur); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 440px; max-width: calc(100vw - 32px);">
        <div class="modal-header">
            <h3 class="modal-title" id="channel-modal-title">${esc(t('notify.add'))}</h3>
            <button class="modal-close" data-action="close-modal" data-modal="channel-modal" aria-label="${esc(t('general.close'))}">${ICON_CLOSE}</button>
        </div>

        <input type="hidden" id="channel-edit-index" value="-1">

        <div class="settings-content__form-group">
            <label class="settings-content__label">${esc(t('notify.type'))}</label>
            <app-select id="channel-type" value="ntfy"></app-select>
        </div>

        <div class="settings-content__form-group">
            <label class="settings-content__label">${esc(t('notify.name'))}</label>
            <input type="text" id="channel-name" class="settings-content__input" maxlength="40" spellcheck="false" placeholder="${esc(t('notify.name_placeholder'))}">
        </div>

        <p class="settings-content__text-dim" id="channel-push-note" style="font-size: 12px; margin: 0 0 16px; display: none;">${esc(t('notify.push_hint'))}</p>

        <div class="settings-content__form-group" id="channel-url-row">
            <label class="settings-content__label">${esc(t('settings.notify_url'))}</label>
            <input type="text" id="channel-url" class="settings-content__input" spellcheck="false" placeholder="https://…">
            <p class="settings-content__text-dim" style="font-size: 11px; margin: 5px 0 0 0;">${esc(t('settings.notify_url_desc'))}</p>
        </div>

        <div class="settings-content__form-group" id="channel-token-row">
            <label class="settings-content__label">${esc(t('settings.notify_token'))}</label>
            <input type="password" id="channel-token" class="settings-content__input" value="" spellcheck="false" autocomplete="new-password" data-secret>
            <p class="settings-content__text-dim" id="channel-token-note" style="font-size: 11px; margin: 5px 0 0 0;">${esc(t('settings.notify_token_desc'))}</p>
        </div>

        <div class="settings-content__action-group">
            <div class="settings-content__action-row">
                <div class="settings-content__action-info">
                    <h3>${esc(t('notify.enabled'))}</h3>
                    <p>${esc(t('notify.enabled_desc'))}</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="channel-enabled">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-content__action-row">
                <div class="settings-content__action-info">
                    <h3>${esc(t('notify.kind_alerts'))}</h3>
                    <p>${esc(t('notify.kind_alerts_desc'))}</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="channel-alerts">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-content__action-row" id="channel-updates-row">
                <div class="settings-content__action-info">
                    <h3>${esc(t('notify.kind_updates'))}</h3>
                    <p>${esc(t('notify.kind_updates_desc'))}</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="channel-updates">
                    <span class="slider"></span>
                </label>
            </div>
        </div>

        <p class="settings-content__text-dim" id="channel-test-result" role="status" style="font-size: 12px; margin: 16px 0 0; min-height: 1.4em;"></p>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
            <app-button variant="ghost" data-action="test-channel">${esc(t('settings.notify_test_btn'))}</app-button>
            <app-button variant="primary" data-action="save-channel">${esc(t('general.save'))}</app-button>
        </div>
    </dialog>`;
}
