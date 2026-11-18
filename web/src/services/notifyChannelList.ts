import { secretChange } from './secretField';

/**
 * Where an account's alerts go, and the rules about it that need no network: what a channel is, which can
 * still be added, how one is shown, what its last delivery says, and the body that saves the list. Kept apart
 * from the requests so tests can read it.
 */

export type ChannelType = 'ntfy' | 'gotify' | 'webhook' | 'push';

/** The kinds, in the order the window offers them. */
export const CHANNEL_TYPES: ChannelType[] = ['push', 'ntfy', 'gotify', 'webhook'];

/** What the last alert to a channel came to: when (Unix seconds), whether it was taken, and if not, why in a word. */
export interface ChannelResult {
    at: number;
    ok: boolean;
    error?: string;
}

/** A channel as /api/monitor/channels lists it. The token is never part of it. */
export interface NotifyChannel {
    id: string;
    name: string;
    type: ChannelType;
    url: string;
    enabled: boolean;
    has_token: boolean;
    last: ChannelResult | null;
}

export interface NotifyChannels {
    channels: NotifyChannel[];
    /** The most channels an account may have. */
    max: number;
}

/** A channel being saved: what the form holds over what the server listed. */
export interface ChannelEdit extends NotifyChannel {
    /** What the token box held: dots, something typed, or nothing. */
    tokenBox?: string;
}

export const isChannelType = (v: unknown): v is ChannelType => CHANNEL_TYPES.includes(v as ChannelType);

/** Push has no address or token: its destination is the account's own browsers. */
export const takesAddress = (type: ChannelType): boolean => type !== 'push';

export const hasPush = (list: Pick<NotifyChannel, 'type'>[]): boolean => list.some(c => c.type === 'push');

/** Alerts are on when any channel is. */
export const alertsOn = (list: Pick<NotifyChannel, 'enabled'>[]): boolean => list.some(c => c.enabled);

/** Whether a channel of this kind can be added: there is room, and push is one only. */
export function canAdd(list: Pick<NotifyChannel, 'type'>[], max: number, type: ChannelType): boolean {
    return list.length < max && (type !== 'push' || !hasPush(list));
}

/** The kinds that can still be added, for the window's menu. */
export function addableTypes(list: Pick<NotifyChannel, 'type'>[], max: number): ChannelType[] {
    return CHANNEL_TYPES.filter(t => canAdd(list, max, t));
}

/**
 * Where a channel goes, to say it on its row: the host and the port, never the path. The path of an ntfy topic
 * or a webhook is what keeps strangers from sending to it.
 */
export function channelHost(url: string): string {
    const raw = (url || '').trim();
    if (!raw) return '';
    try {
        return new URL(raw).host;
    } catch {
        return raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0].slice(0, 60);
    }
}

/** The text for why a delivery failed: the key of the sentence and what goes into it. */
export function failureText(error: string | undefined): { key: string; params: Record<string, string> } {
    const e = (error || '').trim();
    const http = /^http_(\d{3})$/.exec(e);
    if (http) return { key: 'notify.reason_http', params: { code: http[1] } };
    if (e === 'timeout') return { key: 'notify.reason_timeout', params: {} };
    if (e === 'no_devices') return { key: 'notify.reason_no_devices', params: {} };
    return { key: 'notify.reason_unreachable', params: {} };
}

/**
 * The body that saves the whole list. A token travels only when it was typed, and one that was emptied is a
 * clear, named; a channel the server knows that sends neither keeps its token. The ids are the server's: a
 * channel that is new goes without one.
 */
export function channelsPayload(list: ChannelEdit[]): { channels: Record<string, unknown>[] } {
    return {
        channels: list.map(c => {
            const body: Record<string, unknown> = {
                id: c.id,
                name: c.name,
                type: c.type,
                url: takesAddress(c.type) ? c.url : '',
                enabled: c.enabled,
            };
            if (takesAddress(c.type) && c.tokenBox !== undefined) {
                const change = secretChange(c.tokenBox, c.has_token);
                if (change.action === 'set') body.token = change.token;
                else if (change.action === 'clear') body.clear_token = true;
            }
            return body;
        }),
    };
}
