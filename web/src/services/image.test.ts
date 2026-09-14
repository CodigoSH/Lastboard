import { describe, it, expect } from 'bun:test';
import { fitWithin, storedLength, smallestOf, AVATAR_MAX_BYTES } from './image';

// The canvas half needs a DOM, so what is tested here is the arithmetic that
// decides the size and the measurement that decides the format — the two parts
// that were wrong in the version this replaced.

describe('fitWithin', () => {
    it('leaves a picture that already fits alone', () => {
        // Scaling it up would add bytes and no detail.
        expect(fitWithin(100, 80, 256, 256)).toEqual({ width: 100, height: 80 });
        expect(fitWithin(256, 256, 256, 256)).toEqual({ width: 256, height: 256 });
    });

    it('fits a wide picture by its width and a tall one by its height', () => {
        expect(fitWithin(1000, 500, 256, 256)).toEqual({ width: 256, height: 128 });
        expect(fitWithin(500, 1000, 256, 256)).toEqual({ width: 128, height: 256 });
    });

    it('respects both limits when the box is not square', () => {
        // 4000x3000 into 1920x1080 has to obey the height, not just the width:
        // fitting the width alone would give 1920x1440 and overflow the box.
        expect(fitWithin(4000, 3000, 1920, 1080)).toEqual({ width: 1440, height: 1080 });
    });

    it('never rounds a dimension down to nothing', () => {
        // A very wide banner scaled to a small box would otherwise be 0 tall,
        // and a zero-sized canvas throws.
        const out = fitWithin(10000, 3, 256, 256);
        expect(out.width).toBe(256);
        expect(out.height).toBeGreaterThanOrEqual(1);
    });

    it('does not divide by zero on an empty picture', () => {
        expect(fitWithin(0, 0, 256, 256)).toEqual({ width: 0, height: 0 });
    });
});

describe('storedLength', () => {
    // The server caps len(avatar_url): the whole string, prefix included. The
    // file is about a quarter smaller than the value it produces, so measuring
    // the file lets through a picture the server then rejects.
    it('measures the whole data URL, not the bytes it encodes', () => {
        const payload = 'A'.repeat(1000);
        const url = `data:image/png;base64,${payload}`;
        expect(storedLength(url)).toBe(url.length);
        expect(storedLength(url)).toBeGreaterThan(payload.length);
    });

    it('agrees with the cap the server enforces', () => {
        expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
        const justUnder = 'data:image/png;base64,' + 'A'.repeat(AVATAR_MAX_BYTES - 30);
        expect(storedLength(justUnder)).toBeLessThan(AVATAR_MAX_BYTES);
    });
});

describe('smallestOf', () => {
    const url = (type: string, chars: number) => `data:image/${type};base64,` + 'A'.repeat(chars);

    // Measured: taking the first candidate under the cap meant PNG every time,
    // and a photo went in at 162 KB that WebP writes in 25 KB.
    it('takes the cheapest to store, not the first one offered', () => {
        const chosen = smallestOf([url('png', 162_000), url('webp', 25_000), url('jpeg', 28_000)]);
        expect(chosen.startsWith('data:image/webp')).toBe(true);
    });

    // And the other way round: a flat-colour logo compresses better losslessly,
    // so nothing has to prefer PNG for PNG to win when PNG is the right answer.
    it('lets lossless win on its own merits', () => {
        const chosen = smallestOf([url('png', 5_000), url('webp', 30_000)]);
        expect(chosen.startsWith('data:image/png')).toBe(true);
    });

    it('is stable when two encodings tie, and copes with one candidate', () => {
        const a = url('png', 100);
        expect(smallestOf([a, url('webp', 100)])).toBe(a);
        expect(smallestOf([a])).toBe(a);
    });
});
