import { describe, expect, it } from 'bun:test';
import { chartWidth, placeTip } from './layout';

describe('chartWidth', () => {
    it('leaves out the card padding', () => {
        // A 369px card with 12px on each side has 345px to draw in.
        expect(chartWidth(369, 12, 12)).toBe(345);
    });

    it('never goes negative or non-numeric', () => {
        expect(chartWidth(10, 12, 12)).toBe(0);
        expect(chartWidth(369, NaN, 12)).toBe(357);
    });
});

describe('placeTip', () => {
    const base = { x: 1190, y: 700, width: 142, height: 50, viewportWidth: 1400, originX: 0, originY: 0 };

    it('centres the tip above the point', () => {
        expect(placeTip(base)).toEqual({ left: 1119, top: 638 });
    });

    // The side panel starts at x=980 and has a transform: the same point has to be
    // written 980px closer, or the tooltip lands at 2100 and is never seen.
    it('writes coordinates from the containing block, not from the viewport', () => {
        expect(placeTip({ ...base, originX: 980, originY: 0 })).toEqual({ left: 139, top: 638 });
    });

    it('keeps the tip on screen at the edges', () => {
        expect(placeTip({ ...base, x: 5 }).left).toBe(8);
        expect(placeTip({ ...base, x: 1399 }).left).toBe(1400 - 142 - 8);
    });

    it('goes below the point when there is no room above', () => {
        expect(placeTip({ ...base, y: 20 }).top).toBe(36);
    });
});
