import { describe, it, expect } from 'bun:test';
import { resolveTimeZone, isSupportedTimeZone } from './timeZone';

describe('resolveTimeZone', () => {
    it('passes through a zone Intl accepts', () => {
        expect(resolveTimeZone('Europe/Madrid')).toBe('Europe/Madrid');
        expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
        expect(resolveTimeZone('UTC')).toBe('UTC');
    });

    it('falls back to the local zone for "local" and empty values', () => {
        expect(resolveTimeZone('local')).toBeUndefined();
        expect(resolveTimeZone('')).toBeUndefined();
        expect(resolveTimeZone(undefined)).toBeUndefined();
        expect(resolveTimeZone(null)).toBeUndefined();
    });

    // The zone comes from an external API, so an unusable value can reach the
    // config. It must degrade to the local zone rather than throw mid-render.
    it('falls back instead of throwing on a zone Intl rejects', () => {
        expect(resolveTimeZone('Zona/Invalida')).toBeUndefined();
        expect(resolveTimeZone('not a zone at all')).toBeUndefined();
        expect(resolveTimeZone('Europe/Madrid ')).toBeUndefined();
    });

    it('survives a non-string sneaking in from a changed API', () => {
        expect(resolveTimeZone({ timeZone: 'Europe/Madrid' } as any)).toBeUndefined();
        expect(resolveTimeZone(42 as any)).toBeUndefined();
    });

    it('is stable across repeated calls (cached verdict)', () => {
        expect(resolveTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo');
        expect(resolveTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo');
        expect(resolveTimeZone('Bad/Zone')).toBeUndefined();
        expect(resolveTimeZone('Bad/Zone')).toBeUndefined();
    });
});

describe('isSupportedTimeZone', () => {
    it('reports support without throwing', () => {
        expect(isSupportedTimeZone('Europe/Madrid')).toBe(true);
        expect(isSupportedTimeZone('Zona/Invalida')).toBe(false);
    });
});
