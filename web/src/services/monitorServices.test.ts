import { describe, expect, it } from 'bun:test';
import { chooseServices } from './monitorServices';

const rows = [1, 2, 3, 4].map(item_id => ({ item_id, name: 'n' + item_id }));
const ids = (l: { item_id: number }[]) => l.map(r => r.item_id);

describe('chooseServices', () => {
    it('shows every service, as they are listed, when nothing was chosen or arranged', () => {
        expect(ids(chooseServices(rows, [], undefined))).toEqual([1, 2, 3, 4]);
    });

    it('shows the chosen ones in the order the selection lists them', () => {
        expect(ids(chooseServices(rows, [3, 1], undefined))).toEqual([3, 1]);
    });

    it('skips a chosen service that no longer exists', () => {
        expect(ids(chooseServices(rows, [9, 2], undefined))).toEqual([2]);
    });

    it('arranges everything without turning it into a selection', () => {
        expect(ids(chooseServices(rows, [], [4, 3, 2, 1]))).toEqual([4, 3, 2, 1]);
    });

    // The reason the order is kept apart: with `items` empty, a service that appears later is shown.
    it('puts a service the order does not know after the arranged ones, still shown', () => {
        const more = [...rows, { item_id: 5, name: 'new' }];
        expect(ids(chooseServices(more, [], [2, 1]))).toEqual([2, 1, 3, 4, 5]);
    });

    it('arranges a chosen subset, and only shows the subset', () => {
        expect(ids(chooseServices(rows, [1, 2, 3], [3, 2, 1, 4]))).toEqual([3, 2, 1]);
    });

    it('does not change the rows it was given', () => {
        const before = ids(rows);
        chooseServices(rows, [], [4, 3, 2, 1]);
        expect(ids(rows)).toEqual(before);
    });
});
