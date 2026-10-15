import { describe, expect, it } from 'bun:test';
import { arrangeBy, mergeOrder } from './rowOrder';

const list = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
const ids = (l: { id: number }[]) => l.map(x => x.id);

describe('arrangeBy', () => {
    it('leaves the list as it came when no order was chosen', () => {
        expect(ids(arrangeBy(list, x => x.id, undefined))).toEqual([1, 2, 3, 4]);
        expect(ids(arrangeBy(list, x => x.id, []))).toEqual([1, 2, 3, 4]);
    });

    it('follows the chosen order', () => {
        expect(ids(arrangeBy(list, x => x.id, [3, 1, 4, 2]))).toEqual([3, 1, 4, 2]);
    });

    it('puts what the order does not know after what it does, in listed order', () => {
        expect(ids(arrangeBy(list, x => x.id, [4, 2]))).toEqual([4, 2, 1, 3]);
    });

    it('ignores keys that match nothing and keys that are repeated', () => {
        expect(ids(arrangeBy(list, x => x.id, [99, 2, 2, 1]))).toEqual([2, 1, 3, 4]);
    });

    it('works on any kind of key', () => {
        const named = [{ n: 'a' }, { n: 'b' }];
        expect(arrangeBy(named, x => x.n, ['b', 'a']).map(x => x.n)).toEqual(['b', 'a']);
    });

    it('does not touch the list it was given', () => {
        const before = ids(list);
        arrangeBy(list, x => x.id, [4, 3, 2, 1]);
        expect(ids(list)).toEqual(before);
    });
});

describe('mergeOrder', () => {
    it('is the list as it stands when nothing was stored', () => {
        expect(mergeOrder([2, 1], undefined)).toEqual([2, 1]);
    });

    it('keeps a stored key that is not on the list now, after the ones that are', () => {
        expect(mergeOrder([2, 1], [1, 9, 2])).toEqual([2, 1, 9]);
    });
});
