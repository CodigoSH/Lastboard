import { describe, expect, it } from 'bun:test';
import { decideNoteSync, storedNoteText } from './notepadSync';

describe('decideNoteSync', () => {
    it('does nothing when the store holds what is already here', () => {
        expect(decideNoteSync('a', 'a', false)).toBe('same');
        expect(decideNoteSync('a', 'a', true)).toBe('same');
        expect(decideNoteSync(null, null, false)).toBe('same');
    });

    // The reported bug: the note changed elsewhere and this widget kept showing its old copy.
    it('shows a newer note when nothing is being edited', () => {
        expect(decideNoteSync('old', 'saved on the other device', false)).toBe('show');
        expect(decideNoteSync(null, 'first text ever', false)).toBe('show');
    });

    // The data-loss half: unsaved edits are not thrown away to show something newer.
    it('leaves unsaved edits alone when a newer note exists', () => {
        expect(decideNoteSync('old', 'newer elsewhere', true)).toBe('hold');
    });

    it('treats an empty note and a missing one as different', () => {
        expect(decideNoteSync('', null, false)).toBe('show');
        expect(decideNoteSync(null, '', false)).toBe('show');
    });
});

describe('storedNoteText', () => {
    it('reads the text of a note, raw', () => {
        expect(storedNoteText('{"widgetId":"notepad","text":"<div>x</div>"}')).toBe('<div>x</div>');
        expect(storedNoteText({ widgetId: 'notepad', text: 'obj' })).toBe('obj');
    });
    it('is null when there is none, or the content is not JSON', () => {
        expect(storedNoteText('{"widgetId":"notepad"}')).toBeNull();
        expect(storedNoteText('not json')).toBeNull();
        expect(storedNoteText(null)).toBeNull();
        expect(storedNoteText('{"text":5}')).toBeNull();
    });
});
