import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WIDGET_TITLE_MAX, cleanWidgetTitle, widgetTakesPill } from './widgetTitle';

describe('cleanWidgetTitle', () => {
    it('keeps an ordinary name as it is', () => {
        expect(cleanWidgetTitle('Proxmox node')).toBe('Proxmox node');
    });

    it('means no title for nothing, blanks or something that is not text', () => {
        for (const v of [undefined, null, '', '   ', 5, {}, []]) expect(cleanWidgetTitle(v)).toBe('');
    });

    it('turns newlines, tabs and runs of spaces into single spaces', () => {
        expect(cleanWidgetTitle('  nas \n\t  01 ')).toBe('nas 01');
    });

    // The limit is characters: forty Japanese letters are forty, not a third of that.
    it('counts characters, not bytes or UTF-16 units', () => {
        const jp = 'ぜ'.repeat(WIDGET_TITLE_MAX + 10);
        expect([...cleanWidgetTitle(jp)]).toHaveLength(WIDGET_TITLE_MAX);
        const emoji = '🖥️'.repeat(WIDGET_TITLE_MAX);
        for (const ch of [...cleanWidgetTitle(emoji)]) expect(ch.length).toBeGreaterThan(0);
        expect(cleanWidgetTitle('😀'.repeat(WIDGET_TITLE_MAX + 5))).toBe('😀'.repeat(WIDGET_TITLE_MAX));
    });

    it('does not end on a space left by the cut', () => {
        expect(cleanWidgetTitle('a'.repeat(WIDGET_TITLE_MAX - 1) + ' b')).toBe('a'.repeat(WIDGET_TITLE_MAX - 1));
    });
});

describe('widgetTakesPill', () => {
    it('is true for every widget, none left with a heading of its own', () => {
        for (const id of ['telemetry', 'clock', 'weather', 'notepad', 'markdown', 'docker', 'monitor', 'proxmox', 'api']) {
            expect(widgetTakesPill(id)).toBe(true);
        }
    });

    it('is false for anything that is not a known widget id', () => {
        for (const id of [undefined, null, '', 'nope', 5]) expect(widgetTakesPill(id)).toBe(false);
    });

    // The set is written out because this module cannot import the registry. A widget added
    // to the registry and not to the set would be the one tile that cannot be named.
    it('names exactly the widgets the registry offers', () => {
        const registry = readFileSync(join(import.meta.dir, '..', 'widgets', 'registry.ts'), 'utf8');
        const ids = [...registry.matchAll(/^\s{8}id: '([a-z]+)',/gm)].map(m => m[1]);
        expect(ids.length).toBeGreaterThanOrEqual(9);
        for (const id of ids) expect(widgetTakesPill(id)).toBe(true);
    });
});
