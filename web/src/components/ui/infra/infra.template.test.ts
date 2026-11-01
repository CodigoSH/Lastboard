import { describe, expect, test } from 'bun:test';
import {
    barHtml, boxHtml, chartHtml, chartIndexAt, CHART_WIDTH, kpiHtml, meterLevel, ringHtml, sparkHtml, tabsHtml, toolbarHtml, type T,
} from './infra.template';

const t: T = (key) => `[${key}]`;
const evil = '<img src=x onerror=alert(1)>';

describe('meterLevel', () => {
    test('green below 60, amber from 60, red from 90', () => {
        expect(meterLevel(0)).toBe('ok');
        expect(meterLevel(59.9)).toBe('ok');
        expect(meterLevel(60)).toBe('warn');
        expect(meterLevel(89.9)).toBe('warn');
        expect(meterLevel(90)).toBe('bad');
        expect(meterLevel(250)).toBe('bad');
    });
});

describe('meters', () => {
    test('a bar is clamped and never NaN', () => {
        expect(barHtml(150)).toContain('inline-size:100.0%');
        expect(barHtml(-5)).toContain('inline-size:0.0%');
        expect(barHtml(NaN)).toContain('inline-size:0.0%');
        expect(barHtml(95)).toContain('data-l="bad"');
    });

    test('a ring draws its share of the circle in the colour of its level', () => {
        const full = ringHtml(100, 'ok', '100%');
        const half = ringHtml(50, 'warn', '50%');
        const c = 2 * Math.PI * 24;
        expect(full).toContain(`${c.toFixed(1)} ${c.toFixed(1)}`);
        expect(half).toContain(`${(c / 2).toFixed(1)} ${c.toFixed(1)}`);
        expect(half).toContain('var(--warn)');
        expect(ringHtml(10, 'bad', 'x')).toContain('var(--danger)');
        expect(ringHtml(NaN, 'ok', 'x')).toContain('0.0 ');
    });

    test('a sparkline needs two readings, and a flat one still draws a line', () => {
        expect(sparkHtml([1])).not.toContain('<path');
        expect(sparkHtml([])).not.toContain('<path');
        expect(sparkHtml([2, 2, 2])).toContain('<path');
        expect(sparkHtml([0, 0, 0])).not.toContain('NaN');
    });
});

describe('what a host says is escaped', () => {
    test('indicators, tabs, boxes', () => {
        const kpi = kpiHtml({ label: evil, icon: 'box', value: evil, unit: evil, sub: [evil, evil], chips: [{ text: evil }] });
        const tabs = tabsHtml([{ id: 'a" onclick="x', label: evil, count: 3 }], 'a', n => String(n));
        const box = boxHtml(evil, evil.replace('<', '&lt;'));
        for (const html of [kpi, tabs, box]) {
            expect(html).not.toContain(evil);
            expect(html).toContain('&lt;');
        }
        expect(tabs).not.toContain('" onclick="x');
    });

    test('the search box keeps what was typed without letting it out of its attribute', () => {
        const html = toolbarHtml({
            query: '"><script>', status: 'all', counts: { all: 1, up: 1, off: 0, warn: 0 }, sort: 'name', grouped: false, view: 'cards',
            searchLabel: 'q', groupLabel: 'g',
        }, t, String);
        expect(html).not.toContain('"><script>');
    });
});

describe('the toolbar', () => {
    const o = { query: '', status: 'warn' as const, counts: { all: 9, up: 5, off: 3, warn: 1 }, sort: 'mem' as const, grouped: true, view: 'list' as const, searchLabel: 's', groupLabel: 'g' };
    const html = toolbarHtml(o, t, n => `#${n}`);
    test('shows the counts on the chips and presses only the chosen ones', () => {
        expect(html).toContain('#9');
        expect(html).toContain('#1');
        expect(html).toMatch(/data-filter="warn" aria-pressed="true"/);
        expect(html).toMatch(/data-filter="all" aria-pressed="false"/);
        expect(html).toMatch(/data-view="list" aria-pressed="true"/);
        expect(html).toMatch(/id="inv-group" aria-pressed="true"/);
        expect(html).toMatch(/<option value="mem" selected>/);
    });
});

describe('the chart', () => {
    const spec = { series: [{ name: 'n', color: 'red', data: [0, 1, 2, 1] }], max: 2, edges: ['a', 'b'] as [string, string], fmt: (v: number) => `${v}u` };
    test('draws nothing with fewer than two points', () => {
        expect(chartHtml('c', { ...spec, series: [{ name: 'n', color: 'red', data: [1] }] })).toBe('');
    });
    test('has a line per series, its edge labels and the cursor', () => {
        const html = chartHtml('c', spec);
        expect(html).toContain('data-chart="c"');
        expect(html).toContain('class="cur"');
        expect(html).toContain('>a<');
        expect(html).toContain('>b<');
        expect(html).not.toContain('NaN');
    });
    test('the cursor snaps to a point and stays inside the drawing', () => {
        expect(chartIndexAt(5, 0).index).toBe(0);
        expect(chartIndexAt(5, 1).index).toBe(4);
        expect(chartIndexAt(5, -3).index).toBe(0);
        expect(chartIndexAt(5, 9).index).toBe(4);
        expect(chartIndexAt(1, 0.5).index).toBe(0);
        const mid = chartIndexAt(5, 0.5);
        expect(mid.index).toBe(2);
        expect(mid.x).toBeGreaterThan(0);
        expect(mid.x).toBeLessThan(CHART_WIDTH);
    });
});
