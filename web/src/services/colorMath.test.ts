import { describe, expect, test } from 'bun:test';
import { hexToHsv, hsvToHex } from './colorMath';

// Characterization tests for the colour maths the picker relies on. Extracted
// from ColorPicker so the conversions can be checked without a DOM.

describe('hexToHsv', () => {
    test('reads a full hex colour', () => {
        const hsv = hexToHsv('#0078D4')!;
        expect(Math.round(hsv.h)).toBe(206);
        expect(Math.round(hsv.s)).toBe(100);
        expect(Math.round(hsv.v)).toBe(83);
    });

    test('accepts shorthand and a missing hash', () => {
        expect(hexToHsv('#f00')).toEqual(hexToHsv('#ff0000')!);
        expect(hexToHsv('ff0000')).toEqual(hexToHsv('#ff0000')!);
        expect(hexToHsv('f00')).toEqual(hexToHsv('#ff0000')!);
    });

    test('is case-insensitive', () => {
        expect(hexToHsv('#AABBCC')).toEqual(hexToHsv('#aabbcc')!);
    });

    test('places the primaries at their hues', () => {
        expect(Math.round(hexToHsv('#ff0000')!.h)).toBe(0);
        expect(Math.round(hexToHsv('#00ff00')!.h)).toBe(120);
        expect(Math.round(hexToHsv('#0000ff')!.h)).toBe(240);
    });

    test('reports greys as unsaturated', () => {
        const white = hexToHsv('#ffffff')!;
        expect(white.s).toBe(0);
        expect(white.v).toBe(100);

        const black = hexToHsv('#000000')!;
        expect(black.s).toBe(0);
        expect(black.v).toBe(0);

        const grey = hexToHsv('#808080')!;
        expect(grey.s).toBe(0);
        expect(grey.h).toBe(0);
    });

    test('returns null for input it cannot parse', () => {
        for (const bad of ['', 'nonsense', '#12345', '#gggggg', 'rgb(1,2,3)']) {
            expect(hexToHsv(bad)).toBeNull();
        }
    });
});

describe('hsvToHex', () => {
    test('renders the primaries', () => {
        expect(hsvToHex(0, 100, 100)).toBe('#ff0000');
        expect(hsvToHex(120, 100, 100)).toBe('#00ff00');
        expect(hsvToHex(240, 100, 100)).toBe('#0000ff');
    });

    test('renders the greyscale ends', () => {
        expect(hsvToHex(0, 0, 100)).toBe('#ffffff');
        expect(hsvToHex(0, 0, 0)).toBe('#000000');
    });

    test('pads single-digit channels', () => {
        // Very dark colours produce channels below 0x10.
        expect(hsvToHex(0, 100, 2)).toBe('#050000');
    });

    test('round-trips a colour through HSV and back', () => {
        for (const hex of ['#0078d4', '#ff0000', '#123456', '#abcdef', '#ffffff', '#000000']) {
            const hsv = hexToHsv(hex)!;
            expect(hsvToHex(hsv.h, hsv.s, hsv.v)).toBe(hex);
        }
    });
});
