import { apiService } from './apiService';
import { isDemoMode } from './dockerShared';
import { secretChange } from './secretField';
import {
    channelsPayload, isChannelType, takesAddress,
    type ChannelEdit, type ChannelType, type NotifyChannel, type NotifyChannels,
} from './notifyChannelList';

export * from './notifyChannelList';

/**
 * The channels the account's alerts go to. The one place that reads and writes the list, so the settings
 * screen and the monitoring page cannot disagree about which exist.
 */

// Demo mode has no server to keep a list, so it keeps one for as long as the page lives.
let demo: NotifyChannels = {
    max: 10,
    channels: [{ id: 'demo-ntfy', name: '', type: 'ntfy', url: 'https://ntfy.sh/lastboard-demo', enabled: true, alerts: true, updates: false, has_token: false, last: null }],
};

/** What the server sent, whatever its shape: only well-formed channels, and a ceiling. */
function normalise(raw: Partial<NotifyChannels> | null | undefined): NotifyChannels {
    const list: NotifyChannel[] = [];
    for (const c of Array.isArray(raw?.channels) ? raw!.channels! : []) {
        if (!c || typeof c.id !== 'string' || !isChannelType(c.type)) continue;
        list.push({
            id: c.id, name: typeof c.name === 'string' ? c.name : '', type: c.type,
            url: typeof c.url === 'string' ? c.url : '', enabled: !!c.enabled,
            // A server that predates the kinds sends neither: it carried alerts and nothing else.
            alerts: c.alerts !== false, updates: !!c.updates, has_token: !!c.has_token,
            last: c.last && typeof c.last.at === 'number' ? { at: c.last.at, ok: !!c.last.ok, error: c.last.error } : null,
        });
    }
    return { channels: list, max: typeof raw?.max === 'number' && raw.max > 0 ? raw.max : 10 };
}

export async function fetchChannels(): Promise<NotifyChannels> {
    if (isDemoMode()) return demo;
    return normalise(await apiService.get<NotifyChannels>('/api/monitor/channels'));
}

/** Writes the whole list, as the server takes it for the truth, and returns what it now holds. */
export async function saveChannels(list: ChannelEdit[]): Promise<NotifyChannels> {
    if (isDemoMode()) {
        demo = {
            max: demo.max,
            channels: list.map((c, i) => ({
                id: c.id || `demo-${i}-${c.type}`, name: c.name, type: c.type, url: c.url, enabled: c.enabled, alerts: c.alerts, updates: c.updates,
                has_token: c.has_token || !!(c.tokenBox && secretChange(c.tokenBox, c.has_token).action === 'set'), last: c.last,
            })),
        };
        return demo;
    }
    return normalise(await apiService.post<NotifyChannels>('/api/monitor/channels', channelsPayload(list)));
}

/**
 * Sends a test alert to a channel as the form holds it. Resolves when it was taken; rejects with the word the
 * server gives for why not (`http_401`, `timeout`, `no_devices`, `unreachable`), or a key such as
 * `error.invalid_url` when the address was refused before anything was sent.
 */
export async function testChannel(c: { id: string; type: ChannelType; url: string; tokenBox?: string; has_token: boolean }): Promise<void> {
    if (isDemoMode()) return;
    const body: Record<string, unknown> = { id: c.id, type: c.type, url: takesAddress(c.type) ? c.url : '' };
    if (takesAddress(c.type) && c.tokenBox !== undefined) {
        const change = secretChange(c.tokenBox, c.has_token);
        if (change.action === 'set') body.token = change.token;
    }
    await apiService.post('/api/monitor/channels/test', body);
}
