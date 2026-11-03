import { describe, expect, test } from 'bun:test';
import { metricsFieldHtml } from './configFields';

const t = (k: string) => `[${k}]`;
const on = { cpu: true, mem: true, disk: true };

describe('the readings group of a widget\'s settings', () => {
    test('is there with the line of totals on, and hidden with it off', () => {
        expect(metricsFieldHtml(on, ['cpu', 'mem'], t)).not.toMatch(/id="w-metrics"[^>]*hidden/);
        expect(metricsFieldHtml(on, ['cpu', 'mem'], t, true)).toMatch(/id="w-metrics" hidden/);
    });
    test('offers only the readings the widget can give, each ticked as it is stored', () => {
        const html = metricsFieldHtml({ cpu: true, mem: false, disk: false }, ['cpu', 'mem'], t);
        expect(html).toContain('id="wm-cpu"');
        expect(html).toContain('id="wm-mem"');
        expect(html).not.toContain('id="wm-disk"');
        expect(html).toMatch(/id="wm-cpu"[^>]*checked/);
        expect(html).not.toMatch(/id="wm-mem"[^>]*checked/);
    });
});
