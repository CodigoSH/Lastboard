/**
 * Colour conversions for the picker. Pure functions with no DOM, so the maths
 * can be tested on its own — the component only holds the state.
 */

export interface Hsv {
    /** Hue in degrees, 0–360. */
    h: number;
    /** Saturation as a percentage, 0–100. */
    s: number;
    /** Value as a percentage, 0–100. */
    v: number;
}

/**
 * Parses a hex colour into HSV. Accepts shorthand (#abc), full form (#aabbcc)
 * and either with or without the leading hash. Returns null for anything else,
 * so the caller can keep its current colour rather than jump to black.
 */
export function hexToHsv(hex: string): Hsv | null {
    const expanded = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (_m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
    if (!result) return null;

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, v: max * 100 };
}

/** Renders HSV back to a lowercase `#rrggbb` string. */
export function hsvToHex(h: number, s: number, v: number): string {
    s /= 100;
    v /= 100;

    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r = 0, g = 0, b = 0;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
