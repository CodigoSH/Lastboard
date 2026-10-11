import { describe, expect, it } from 'bun:test';
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
    it('is for the widgets that have no title of their own', () => {
        for (const id of ['telemetry', 'clock', 'weather', 'notepad', 'markdown']) expect(widgetTakesPill(id)).toBe(true);
    });

    // These print their own heading from the same `title` key: a pill too would say it twice.
    it('leaves out the ones that already draw their title inside', () => {
        for (const id of ['api', 'docker', 'monitor', 'proxmox']) expect(widgetTakesPill(id)).toBe(false);
    });

    it('is false for anything that is not a known widget id', () => {
        for (const id of [undefined, null, '', 'nope', 5]) expect(widgetTakesPill(id)).toBe(false);
    });
});
