import { describe, expect, test } from 'bun:test';
import { targetTab } from './pageTarget';

describe('targetTab', () => {
    const tabs = ['overview', 'machines'] as const;
    test('a tab the page has is the one it opens on', () => {
        expect(targetTab({ tab: 'machines' }, tabs)).toBe('machines');
    });
    test('a tab it does not have, or no target at all, leaves the page where it always opens', () => {
        expect(targetTab({ tab: 'nope' }, tabs)).toBeUndefined();
        expect(targetTab({}, tabs)).toBeUndefined();
        expect(targetTab(undefined, tabs)).toBeUndefined();
    });
});
