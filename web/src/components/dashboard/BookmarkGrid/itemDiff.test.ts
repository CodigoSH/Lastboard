import { describe, expect, test } from 'bun:test';
import { diffItems } from './itemDiff';
import type { GridItem } from '../../../types';

const item = (over: Partial<GridItem> = {}): GridItem =>
    ({ id: 1, type: 'bookmark', x: 1, y: 1, w: 1, h: 1, content: '{"label":"a"}', status: 'up', ...over });

describe('what changed on the board', () => {
    test('the same items are no change at all', () => {
        expect(diffItems([item(), item({ id: 2 })], [item(), item({ id: 2 })])).toEqual({ structural: false, statusOnly: false });
    });

    test('an item added or removed is structural', () => {
        expect(diffItems([item()], [item(), item({ id: 2 })]).structural).toBe(true);
        expect(diffItems([item(), item({ id: 2 })], [item()]).structural).toBe(true);
    });

    test.each([
        ['id', { id: 9 }],
        ['x', { x: 2 }],
        ['y', { y: 2 }],
        ['w', { w: 2 }],
        ['h', { h: 2 }],
        ['parent_id', { parent_id: 5 }],
        ['content', { content: '{"label":"b"}' }],
        ['mobile_order', { mobile_order: 3 }],
    ] as [string, Partial<GridItem>][])('a different %s is structural', (_field, change) => {
        expect(diffItems([item()], [item(change)]).structural).toBe(true);
    });

    test('a status alone is not structural, so the board repaints a dot instead of redrawing', () => {
        expect(diffItems([item(), item({ id: 2 })], [item(), item({ id: 2, status: 'down' })]))
            .toEqual({ structural: false, statusOnly: true });
    });

    test('a status and a structural change together: structural is what counts', () => {
        const d = diffItems([item({ status: 'up' }), item({ id: 2 })], [item({ status: 'down' }), item({ id: 2, x: 4 })]);
        expect(d.structural).toBe(true);
    });

    test('content is compared as the string it is, so a rewrite with the same text is no change', () => {
        expect(diffItems([item({ content: 'x' })], [item({ content: 'x' })]).structural).toBe(false);
    });
});
