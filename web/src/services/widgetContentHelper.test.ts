import { describe, it, expect } from 'bun:test';
import { WidgetContentHelper } from './widgetContentHelper';

/**
 * Characterization tests for WidgetContentHelper.
 * Freezes the current parse / serialize / mutate behavior, including the
 * fallback paths for invalid input.
 */
describe('WidgetContentHelper', () => {
    describe('parse', () => {
        it('returns the object as-is when given an object', () => {
            const obj = { widgetId: 'notepad', text: 'hi' };
            expect(WidgetContentHelper.parse(obj)).toBe(obj);
        });

        it('parses a valid JSON string into an object', () => {
            expect(WidgetContentHelper.parse('{"widgetId":"clock"}'))
                .toEqual({ widgetId: 'clock' });
        });

        it('falls back to { widgetId: "unknown" } on invalid JSON', () => {
            expect(WidgetContentHelper.parse('not json'))
                .toEqual({ widgetId: 'unknown' });
        });

        it('falls back to { widgetId: "unknown" } on null', () => {
            expect(WidgetContentHelper.parse(null))
                .toEqual({ widgetId: 'unknown' });
        });

        it('falls back to { widgetId: "unknown" } when JSON is a primitive', () => {
            // JSON.parse('5') === 5 which is not an object -> fallback
            expect(WidgetContentHelper.parse('5'))
                .toEqual({ widgetId: 'unknown' });
        });
    });

    describe('serialize', () => {
        it('serializes an object to a JSON string', () => {
            expect(WidgetContentHelper.serialize({ widgetId: 'notepad', text: 'a' }))
                .toBe('{"widgetId":"notepad","text":"a"}');
        });
    });

    describe('notepad text', () => {
        it('reads text, empty string when missing', () => {
            expect(WidgetContentHelper.getNotepadText('{"widgetId":"notepad","text":"hello"}'))
                .toBe('hello');
            expect(WidgetContentHelper.getNotepadText('{"widgetId":"notepad"}'))
                .toBe('');
        });

        it('sets text while forcing widgetId to notepad and preserving extras', () => {
            const result = WidgetContentHelper.setNotepadText(
                '{"widgetId":"notepad","text":"old","pinned":true}',
                'new'
            );
            expect(JSON.parse(result)).toEqual({ widgetId: 'notepad', text: 'new', pinned: true });
        });
    });

    describe('markdown text', () => {
        it('reads and sets markdown text preserving extras', () => {
            expect(WidgetContentHelper.getMarkdownText('{"widgetId":"markdown","text":"# H"}'))
                .toBe('# H');
            const result = WidgetContentHelper.setMarkdownText('{"foo":1}', '## new');
            expect(JSON.parse(result)).toEqual({ foo: 1, widgetId: 'markdown', text: '## new' });
        });
    });

    describe('merge', () => {
        it('merges updates over existing content', () => {
            const result = WidgetContentHelper.merge(
                '{"widgetId":"clock","use12h":false}',
                { use12h: true, showDate: true }
            );
            expect(JSON.parse(result)).toEqual({ widgetId: 'clock', use12h: true, showDate: true });
        });
    });

    describe('validate', () => {
        it('returns true when widgetId matches, false otherwise', () => {
            expect(WidgetContentHelper.validate('{"widgetId":"docker"}', 'docker')).toBe(true);
            expect(WidgetContentHelper.validate('{"widgetId":"docker"}', 'clock')).toBe(false);
            expect(WidgetContentHelper.validate('garbage', 'docker')).toBe(false);
        });
    });
});
