import { describe, expect, test } from 'bun:test';
import type { NotifyChannel } from '../../../services/notifyChannelList';
import { channelModalHtml, channelNote, channelRowHtml, channelsCardHtml, channelTitle, typeLabel, type RowContext, type T } from './notifyChannels.template';

// The text comes back as its key and what went into it, so a test reads what the screen would say.
const t: T = (key, params) => `[${key}${params ? ':' + JSON.stringify(params) : ''}]`;
const ctx: RowContext = { devices: 2, when: s => `@${s}` };
const ch = (o: Partial<NotifyChannel> = {}): NotifyChannel => ({
    id: 'nc1', name: '', type: 'ntfy', url: 'https://ntfy.sh/secret-topic', enabled: true, has_token: false, last: null, ...o,
});

describe('a channel on its row', () => {
    test('is called by the name its owner gave, or else by its kind', () => {
        expect(channelTitle(ch({ name: '  Mine ' }), t)).toBe('Mine');
        expect(channelTitle(ch(), t)).toBe('ntfy');
        expect(channelTitle(ch({ type: 'gotify' }), t)).toBe('Gotify');
        expect(typeLabel('webhook', t)).toBe('[settings.notify_webhook]');
        expect(typeLabel('push', t)).toBe('[settings.notify_push]');
    });

    test('says where it goes by host, never by the path that is its secret', () => {
        const note = channelNote(ch(), t, ctx);
        expect(note).toEqual({ text: 'ntfy · ntfy.sh', tone: 'idle' });
        expect(channelRowHtml(ch(), 0, t, ctx)).not.toContain('secret-topic');
    });

    test('says how many devices push has, not an address', () => {
        expect(channelNote(ch({ type: 'push', url: '' }), t, ctx).text).toBe('[notify.devices_count:{"count":"2"}]');
        expect(channelNote(ch({ type: 'push', url: '' }), t, { ...ctx, devices: null }).text).toBe('[settings.notify_push]');
    });

    test('says how its last alert went, and why it failed in a sentence', () => {
        expect(channelNote(ch({ last: { at: 100, ok: true } }), t, ctx)).toEqual({ text: '[notify.last_ok:{"time":"@100"}]', tone: 'up' });
        const bad = channelNote(ch({ last: { at: 100, ok: false, error: 'http_401' } }), t, ctx);
        expect(bad.tone).toBe('bad');
        expect(bad.text).toContain('notify.reason_http');
        expect(bad.text).toContain('401');
        expect(bad.text).toContain('notify.last_failed');
    });

    test('says it is off, and that wins over whatever happened before', () => {
        expect(channelNote(ch({ enabled: false, last: { at: 1, ok: false, error: 'timeout' } }), t, ctx)).toEqual({ text: '[notify.off]', tone: 'off' });
    });

    test('has its own switch, and edit and remove named after it', () => {
        const row = channelRowHtml(ch({ enabled: true, name: 'Mine' }), 3, t, ctx);
        expect(row).toContain('data-change="channel-toggle" data-index="3"');
        expect(row).toContain(' checked');
        expect(row).toContain('data-action="edit-channel" data-index="3"');
        expect(row).toContain('data-action="delete-channel" data-index="3"');
        expect(row).toContain('Mine');
        expect(channelRowHtml(ch({ enabled: false }), 0, t, ctx)).not.toContain(' checked');
    });

    test('escapes whatever came from the account', () => {
        const evil = `"><img src=x onerror=alert(1)>`;
        const html = channelRowHtml(ch({ name: evil, url: `https://${evil}.example/x` }), 0, t, ctx);
        expect(html).not.toContain('<img');
        expect(html).toContain('&lt;img');
    });
});

describe('the card of channels', () => {
    const view = (channels: NotifyChannel[], o: { max?: number; monitoringOn?: boolean } = {}) =>
        channelsCardHtml({ channels, max: o.max ?? 10, monitoringOn: o.monitoringOn ?? true }, t, ctx);

    test('offers to add one, and says there are none when there are none', () => {
        const html = view([]);
        expect(html).toContain('data-action="add-channel"');
        expect(html).toContain('[notify.none]');
    });

    test('lists one row each, and a second of the same kind is fine', () => {
        const html = view([ch({ id: 'a' }), ch({ id: 'b', name: 'Partner' })]);
        expect(html.match(/data-channel="/g)?.length).toBe(2);
        expect(html).not.toContain('[notify.none]');
    });

    test('at the ceiling it stops offering and says why', () => {
        const full = Array.from({ length: 3 }, (_, i) => ch({ id: `nc${i}` }));
        const html = view(full, { max: 3 });
        expect(html).not.toContain('data-action="add-channel"');
        expect(html).toContain('[notify.limit:{&quot;count&quot;:&quot;3&quot;}]');
    });

    test('push is the only one that cannot be added twice, so with push and room the button stays', () => {
        expect(view([ch({ type: 'push', url: '' })])).toContain('data-action="add-channel"');
    });

    test('says that alerts need 24/7 monitoring when it is off, with a way to it', () => {
        const off = view([ch()], { monitoringOn: false });
        expect(off).toContain('[settings.alerts_requires_247]');
        expect(off).toContain('data-action="open-monitoring"');
        const on = view([ch()], { monitoringOn: true });
        expect(on).not.toContain('open-monitoring');
    });

    test('says that nothing will be sent when every channel is off', () => {
        expect(view([ch({ enabled: false })])).toContain('[notify.all_off]');
        expect(view([ch({ enabled: false }), ch({ id: 'b' })])).not.toContain('[notify.all_off]');
        expect(view([])).not.toContain('[notify.all_off]');
    });
});

describe('the window of a channel', () => {
    const html = channelModalHtml(t);
    test('has what every kind needs, and the secret field is marked as one', () => {
        for (const id of ['channel-modal', 'channel-edit-index', 'channel-type', 'channel-name', 'channel-url-row', 'channel-url', 'channel-token-row', 'channel-token', 'channel-enabled', 'channel-test-result']) {
            expect(html).toContain(`id="${id}"`);
        }
        expect(html).toMatch(/<input type="password" id="channel-token"[^>]*data-secret/);
    });
    test('can test, save and close', () => {
        expect(html).toContain('data-action="test-channel"');
        expect(html).toContain('data-action="save-channel"');
        expect(html).toContain('data-action="close-modal" data-modal="channel-modal"');
    });
});
