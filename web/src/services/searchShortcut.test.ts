import { describe, expect, it } from 'bun:test';
import { isTypingTarget, opensSearch, type ShortcutKey } from './searchShortcut';

const key = (o: Partial<ShortcutKey> = {}): ShortcutKey =>
    ({ key: 'k', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, ...o });
const free = { locked: false, typing: false };

describe('opensSearch', () => {
    it('answers Ctrl+K and Cmd+K, in either case', () => {
        expect(opensSearch(key(), free)).toBe(true);
        expect(opensSearch(key({ ctrlKey: false, metaKey: true }), free)).toBe(true);
        expect(opensSearch(key({ key: 'K' }), free)).toBe(true);   // Caps Lock
    });

    it('ignores K alone and other combinations', () => {
        expect(opensSearch(key({ ctrlKey: false }), free)).toBe(false);
        expect(opensSearch(key({ key: 'j' }), free)).toBe(false);
        expect(opensSearch(key({ shiftKey: true }), free)).toBe(false);
        expect(opensSearch(key({ altKey: true }), free)).toBe(false);
    });

    it('does nothing while the bar is locked', () => {
        expect(opensSearch(key(), { locked: true, typing: false })).toBe(false);
    });

    it('leaves Ctrl+K alone while writing in another field', () => {
        expect(opensSearch(key(), { locked: false, typing: true })).toBe(false);
    });
});

describe('isTypingTarget', () => {
    const el = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, ...extra }) as unknown as Element;
    it('knows fields and editors, but not the search box or the page', () => {
        expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
        expect(isTypingTarget(el('INPUT'))).toBe(true);
        expect(isTypingTarget(el('DIV', { isContentEditable: true }))).toBe(true);
        expect(isTypingTarget(el('INPUT', { id: 'search-input' }))).toBe(false);
        expect(isTypingTarget(el('BODY'))).toBe(false);
        expect(isTypingTarget(null)).toBe(false);
    });
});
