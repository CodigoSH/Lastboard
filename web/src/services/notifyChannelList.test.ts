import { describe, expect, test } from 'bun:test';
import { SECRET_MASK } from './secretField';
import {
    addableTypes, alertsOn, canAdd, channelHost, channelsPayload, failureText,
    type ChannelEdit, type NotifyChannel,
} from './notifyChannelList';

const ch = (o: Partial<NotifyChannel> = {}): NotifyChannel => ({
    id: 'nc1', name: '', type: 'ntfy', url: 'https://ntfy.sh/secret-topic', enabled: true, has_token: false, last: null, ...o,
});

describe('what can still be added', () => {
    test('anything while there is room, and push only once', () => {
        expect(addableTypes([], 10)).toEqual(['push', 'ntfy', 'gotify', 'webhook']);
        expect(addableTypes([ch({ type: 'push' })], 10)).toEqual(['ntfy', 'gotify', 'webhook']);
        // Several of the same kind are the point of a list.
        expect(canAdd([ch(), ch({ id: 'nc2' })], 10, 'ntfy')).toBe(true);
    });
    test('nothing at the ceiling', () => {
        const full = Array.from({ length: 10 }, (_, i) => ch({ id: `nc${i}` }));
        expect(addableTypes(full, 10)).toEqual([]);
        expect(canAdd(full.slice(0, 9), 10, 'webhook')).toBe(true);
    });
    test('alerts are on when any channel is', () => {
        expect(alertsOn([])).toBe(false);
        expect(alertsOn([ch({ enabled: false }), ch({ enabled: false })])).toBe(false);
        expect(alertsOn([ch({ enabled: false }), ch()])).toBe(true);
    });
});

describe('where a channel is said to go', () => {
    test('the host and the port, never the path that keeps strangers from sending to it', () => {
        expect(channelHost('https://ntfy.sh/secret-topic')).toBe('ntfy.sh');
        expect(channelHost('http://gotify.lan:8080/message?token=abc')).toBe('gotify.lan:8080');
    });
    test('an address that is not parsed still loses its path, and nothing gives nothing', () => {
        expect(channelHost('hooks.example/x/y?k=1')).toBe('hooks.example');
        expect(channelHost('   ')).toBe('');
    });
});

describe('why a delivery failed', () => {
    test('one sentence per word, with the code in it', () => {
        expect(failureText('http_401')).toEqual({ key: 'notify.reason_http', params: { code: '401' } });
        expect(failureText('timeout').key).toBe('notify.reason_timeout');
        expect(failureText('no_devices').key).toBe('notify.reason_no_devices');
    });
    test('anything else is that it could not be reached, and a message is never echoed', () => {
        expect(failureText('unreachable').key).toBe('notify.reason_unreachable');
        expect(failureText('Post "https://x?key=SECRET": dial tcp').key).toBe('notify.reason_unreachable');
        expect(JSON.stringify(failureText('Post "https://x?key=SECRET"'))).not.toContain('SECRET');
        expect(failureText(undefined).key).toBe('notify.reason_unreachable');
    });
});

describe('the body that saves the list', () => {
    const edit = (o: Partial<ChannelEdit> = {}): ChannelEdit => ({ ...ch(), ...o });

    test('a token travels only when typed', () => {
        const [typed] = channelsPayload([edit({ tokenBox: 'tk_new' })]).channels;
        expect(typed.token).toBe('tk_new');
        // Left as its dots, or never touched: nothing is sent, so the server keeps the one it has.
        const [kept] = channelsPayload([edit({ has_token: true, tokenBox: SECRET_MASK })]).channels;
        expect('token' in kept || 'clear_token' in kept).toBe(false);
        const [untouched] = channelsPayload([edit({ has_token: true })]).channels;
        expect('token' in untouched || 'clear_token' in untouched).toBe(false);
    });
    test('an emptied box is a clear, named', () => {
        const [c] = channelsPayload([edit({ has_token: true, tokenBox: '' })]).channels;
        expect(c.clear_token).toBe(true);
        expect('token' in c).toBe(false);
    });
    test('push has no address and no token, whatever the form held', () => {
        const [c] = channelsPayload([edit({ type: 'push', url: 'https://x.example', tokenBox: 'tk', has_token: true })]).channels;
        expect(c.url).toBe('');
        expect('token' in c || 'clear_token' in c).toBe(false);
    });
    test('a new channel goes without an id of the server\'s, in the order of the list', () => {
        const body = channelsPayload([edit({ id: 'nc1' }), edit({ id: '', name: 'Partner', enabled: false })]).channels;
        expect(body.map(c => c.id)).toEqual(['nc1', '']);
        expect(body[1]).toMatchObject({ name: 'Partner', enabled: false, type: 'ntfy' });
    });
});
