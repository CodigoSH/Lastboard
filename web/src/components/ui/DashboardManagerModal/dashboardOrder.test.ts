import { describe, expect, it } from 'bun:test';
import type { Dashboard } from '../../../types';
import { canDeleteDashboard, syncOrder } from './dashboardOrder';

const d = (id: number, name: string, position = id): Dashboard => ({ id, name, position, is_default: id === 1 } as Dashboard);

describe('syncOrder', () => {
    it('keeps the order being arranged, not the saved one', () => {
        const local = [d(3, 'C'), d(1, 'A'), d(2, 'B')];
        const store = [d(1, 'A'), d(2, 'B'), d(3, 'C')];
        expect(syncOrder(local, store).map(x => x.id)).toEqual([3, 1, 2]);
    });

    it('takes the new name from the store', () => {
        expect(syncOrder([d(1, 'A'), d(2, 'B')], [d(1, 'A'), d(2, 'Renamed')]).map(x => x.name)).toEqual(['A', 'Renamed']);
    });

    it('drops a dashboard that was deleted', () => {
        expect(syncOrder([d(1, 'A'), d(2, 'B'), d(3, 'C')], [d(1, 'A'), d(3, 'C')]).map(x => x.id)).toEqual([1, 3]);
    });

    it('puts one the list did not know at the end', () => {
        expect(syncOrder([d(1, 'A')], [d(1, 'A'), d(5, 'E')]).map(x => x.id)).toEqual([1, 5]);
    });
});

describe('canDeleteDashboard', () => {
    it('never lets the last one go', () => {
        expect(canDeleteDashboard(1)).toBe(false);
        expect(canDeleteDashboard(0)).toBe(false);
        expect(canDeleteDashboard(2)).toBe(true);
    });
});
