/**
 * The two measurements the side panel got wrong, kept apart from the DOM so
 * they can be tested with numbers.
 */

/**
 * The room a drawing has INSIDE its card. clientWidth counts the card's
 * padding, so drawing to it made the chart stick out of its own box.
 */
export function chartWidth(clientWidth: number, paddingLeft: number, paddingRight: number): number {
    const l = Number.isFinite(paddingLeft) ? paddingLeft : 0;
    const r = Number.isFinite(paddingRight) ? paddingRight : 0;
    return Math.max(0, Math.floor(clientWidth - l - r));
}

export interface TipPlacement {
    /** Where the pointer or the bar is, in viewport coordinates. */
    x: number;
    y: number;
    width: number;
    height: number;
    viewportWidth: number;
    /**
     * Where the tooltip's own (0, 0) lies in the viewport. A fixed element is
     * placed from its containing block, and any ancestor with a transform or a
     * backdrop filter (the side panel has both) turns that into the ancestor.
     */
    originX: number;
    originY: number;
}

/** The left and top to write on the tooltip so it lands above (x, y), on screen. */
export function placeTip(p: TipPlacement): { left: number; top: number } {
    let left = p.x - p.width / 2;
    left = Math.max(8, Math.min(p.viewportWidth - p.width - 8, left));
    let top = p.y - p.height - 12;
    if (top < 8) top = p.y + 16;
    return { left: left - p.originX, top: top - p.originY };
}
