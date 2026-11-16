import { describe, expect, test } from 'bun:test';
import { firstWithNews } from './firstWithNews';

describe('the host a window opens for when several were added', () => {
    test('the first that has something, not the first', async () => {
        expect(await firstWithNews(['a', 'b', 'c'], async id => id !== 'a')).toBe('b');
    });
    test('they are asked in order and no more once one answers', async () => {
        const asked: string[] = [];
        await firstWithNews(['a', 'b', 'c'], async id => { asked.push(id); return id === 'b'; });
        expect(asked).toEqual(['a', 'b']);
    });
    test('a host that cannot be read is skipped, and none with news gives nothing', async () => {
        expect(await firstWithNews(['a', 'b'], async id => { if (id === 'a') throw new Error('down'); return true; })).toBe('b');
        expect(await firstWithNews(['a', 'b'], async () => false)).toBeNull();
        expect(await firstWithNews([], async () => true)).toBeNull();
    });
});
