import { describe, expect, test } from 'bun:test';
import { attentionCardHtml, attentionDialogHtml, attentionInOrder, attentionListHtml, bytesText, serverButtonHtml, serverDialogHtml, supportText, type AttentionItem, type Fmt, type T } from './aboutPanel.template';

const t: T = (key, params) => (params ? `[${key} ${JSON.stringify(params)}]` : `[${key}]`);
const fmt: Fmt = { num: n => String(n), date: () => 'a date', duration: s => `${s}s` };

const items: AttentionItem[] = [
    { key: 'https', tone: 'info' },
    { key: 'proxy', tone: 'warn' },
    { key: 'disk', tone: 'bad', params: { free_bytes: 1_000_000_000, total_bytes: 20_000_000_000 } },
    { key: 'socket', tone: 'warn', params: { trust_proxy: false } },
];

describe('what needs the administrator', () => {
    test('worst first, the server order within one tone', () => {
        expect(attentionInOrder(items).map(i => i.key)).toEqual(['disk', 'proxy', 'socket', 'https']);
    });

    test('the card names the worst three, counts the rest, and opens the dialog', () => {
        const html = attentionCardHtml(items, t, fmt);
        expect(html).toContain('data-action="open-attention"');
        expect(html.indexOf('[attention.disk]')).toBeLessThan(html.indexOf('[attention.proxy]'));
        expect(html).not.toContain('[attention.https]');
        expect(html).toContain('[attention.more {&quot;count&quot;:&quot;1&quot;}]');
    });

    test('with nothing to say it says so and is not a button', () => {
        const html = attentionCardHtml([], t, fmt);
        expect(html).toContain('[attention.all_good]');
        expect(html).not.toContain('data-action');
    });

    test('a kind this page does not know is left out', () => {
        expect(attentionCardHtml([{ key: 'from-the-future', tone: 'bad' }], t, fmt)).toContain('[attention.all_good]');
        expect(attentionListHtml([{ key: 'from-the-future', tone: 'bad' }], t, fmt)).toBe('');
    });

    test('a refused socket asks for TRUST_PROXY only while it is off', () => {
        expect(attentionListHtml([{ key: 'socket', tone: 'warn', params: { trust_proxy: false } }], t, fmt)).toContain('<code>TRUST_PROXY=true</code>');
        const on = attentionListHtml([{ key: 'socket', tone: 'warn', params: { trust_proxy: true } }], t, fmt);
        expect(on).not.toContain('<code>');
        expect(on).toContain('[attention.socket_act_host]');
    });

    test('a channel name someone typed is written as text', () => {
        const html = attentionListHtml([{ key: 'channels', tone: 'warn', params: { count: 1, names: '<img src=x onerror=1>', reason: 'timeout' } }], t, fmt);
        expect(html).not.toContain('<img');
        expect(html).toContain('notify.reason_timeout');
    });

    test('the dialog carries the count', () => {
        expect(attentionDialogHtml(items, t, fmt)).toContain('id="attention-modal-count">4<');
    });
});

describe('the server details', () => {
    const details = {
        version: 'v1.11.0', go: 'go1.27.4', os: 'linux/amd64', schema: 3,
        host: { cpu_percent: 12.4, cores: 4, mem_total_bytes: 8e9, mem_used_bytes: 3e9 },
        config: { trust_proxy: true, proxy_hops: 2, auth_proxy: false, https: true },
    };

    test('machine, installation and setup, and the copy for support', () => {
        const html = serverDialogHtml(details, t, fmt);
        for (const k of ['[server_info.machine]', '[server_info.install]', '[server_info.config]', 'data-action="copy-support"', 'id="support-text"']) {
            expect(html).toContain(k);
        }
    });

    test('a machine with no sensor says so instead of a temperature', () => {
        expect(serverDialogHtml(details, t, fmt)).toContain('[widget.telemetry.remote.no_sensor]');
        expect(serverDialogHtml({ ...details, host: { ...details.host, temperature: 48.6 } }, t, fmt)).toContain('49 °C');
    });

    test('the text for support carries version, platform, schema and setup', () => {
        expect(supportText(details)).toBe('Lastboard v1.11.0\nlinux/amd64 · go1.27.4\nschema 3\nproxy on (2) · https yes');
    });

    test('bytes in the units a disk is sold in', () => {
        expect(bytesText(254_000, fmt)).toBe('254 kB');
        expect(bytesText(16_700_000_000, fmt)).toBe('16.7 GB');
    });

    test('the button opens the details', () => {
        expect(serverButtonHtml(t)).toContain('data-action="open-server"');
    });
});
