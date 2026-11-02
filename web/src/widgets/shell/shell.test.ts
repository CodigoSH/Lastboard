import { describe, expect, test } from 'bun:test';
import { rowHtml, shellHtml, type ShellRow } from './shell';

const row = (over: Partial<ShellRow> = {}): ShellRow => ({ sel: 'guest|h1|100', face: '', name: 'plex', tone: 'ok', metrics: [{ label: 'CPU', text: '12%', pct: 12 }], ...over });
const evil = '<img src=x onerror=alert(1)>';

describe('the body of an infrastructure widget', () => {
    test('a row carries what a click asks the page for, its icon, its name and its readings', () => {
        const html = rowHtml(row({ face: '/api/icons/p', sub: 'LXC 100' }));
        expect(html).toContain('data-sel="guest|h1|100"');
        expect(html).toContain('<img src="/api/icons/p"');
        expect(html).toContain('<b>plex</b>');
        expect(html).toContain('LXC 100');
        expect(html).toContain('<b>12%</b>');
        expect(html).toContain('style="width:12%"');
    });
    test('a thing with no icon wears the fallback and a thing that is off says so in place of readings', () => {
        const html = rowHtml(row({ tone: 'off', note: 'Stopped' }));
        expect(html).toContain('sh-face--none');
        expect(html).toContain('Stopped');
        expect(html).not.toContain('sh-m__top');
    });
    test('the colour of a reading follows how full it is, and a tone given wins', () => {
        expect(rowHtml(row({ metrics: [{ label: 'CPU', text: '95%', pct: 95 }] }))).toContain('data-l="bad"');
        expect(rowHtml(row({ metrics: [{ label: 'CPU', text: '70%', pct: 70 }] }))).toContain('data-l="warn"');
        expect(rowHtml(row({ metrics: [{ label: 'CPU', text: '10%', pct: 10, tone: 'bad' }] }))).toContain('data-l="bad"');
    });
    test('a bar never leaves its track', () => {
        expect(rowHtml(row({ metrics: [{ label: 'CPU', text: '1', pct: 250 }] }))).toContain('width:100%');
        expect(rowHtml(row({ metrics: [{ label: 'CPU', text: '1', pct: -5 }] }))).toContain('width:0%');
    });
    test('nothing a person or a hypervisor wrote reaches the markup as markup', () => {
        const html = shellHtml({ summary: [{ label: evil, text: evil }], rows: [row({ name: evil, sub: evil, sel: evil, face: evil, note: evil })], foot: evil, seeAll: evil });
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('onerror=alert(1)>');
    });
    test('the totals and the foot are there, and the link only when asked for', () => {
        const spec = { summary: [{ label: 'CPU', text: '5%', pct: 5 }], rows: [row()], foot: 'Running: 1/1' };
        const without = shellHtml(spec);
        expect(without).toContain('sh-sum');
        expect(without).toContain('Running: 1/1');
        expect(without).not.toContain('data-act="all"');
        expect(shellHtml({ ...spec, seeAll: 'See all' })).toContain('data-act="all"');
        expect(shellHtml({ ...spec, summary: [] })).not.toContain('sh-sum');
    });
    test('a state replaces the whole body', () => {
        const html = shellHtml({ summary: [], rows: [row()], foot: 'x', state: 'Loading' });
        expect(html).toContain('Loading');
        expect(html).not.toContain('sh-row');
    });
    test('a thing whose service went down with it is marked on its edge', () => {
        expect(rowHtml(row({ flag: true }))).toContain('sh-row--flag');
        expect(rowHtml(row())).not.toContain('sh-row--flag');
    });
});
