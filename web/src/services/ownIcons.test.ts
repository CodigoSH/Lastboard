import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { OWN_ICON_BASE, OWN_ICON_NAMES, OWN_PROVIDER, isOwnIcon, ownIcons } from './ownIcons';
import { searchIcons } from './iconSearch';
import { buildIconIndex } from './importIcons';

const dir = 'web/public/images/brand/';

describe('the marks of the house', () => {
    test('every one is a file that ships, a well-formed SVG with nothing in it that runs or reaches out', () => {
        expect(OWN_ICON_NAMES.length).toBeGreaterThan(0);
        for (const i of ownIcons()) {
            const path = `${dir}${i.name}.svg`;
            expect(existsSync(path)).toBe(true);
            const svg = readFileSync(path, 'utf8');
            expect(svg).toMatch(/^\s*<svg[\s>]/);
            expect(svg).toContain('viewBox');
            expect(svg).not.toMatch(/<script|<foreignObject|\son[a-z]+\s*=|javascript:|href\s*=\s*["']https?:/i);
            // No provenance data from whatever drew it: a mark is published as the mark, nothing else.
            expect(svg).not.toMatch(/c2pa|<metadata/i);
            expect(svg.length).toBeLessThan(20_000);
        }
    });
    test('a folder holds nothing the list does not name, so nothing ships by accident', () => {
        const files = require('node:fs').readdirSync(dir).filter((f: string) => f.endsWith('.svg')).map((f: string) => f.replace(/\.svg$/, '')).sort();
        expect(files).toEqual([...OWN_ICON_NAMES].sort());
    });
    test('they are served from here, under one provider, and recognised as ours', () => {
        for (const i of ownIcons()) {
            expect(i.url.startsWith(OWN_ICON_BASE)).toBe(true);
            expect(i.provider).toBe(OWN_PROVIDER);
            expect(isOwnIcon(i.url)).toBe(true);
        }
        expect(isOwnIcon('/api/icons/abc')).toBe(false);
        expect(isOwnIcon('https://cdn.example/images/brand/x.svg')).toBe(false);
    });
    test('a search for the product finds its mark first, and the library index prefers it', () => {
        const library = [{ name: 'lastboard', url: 'https://cdn/x.svg', provider: 'other', format: 'svg' as const }];
        const all = [...ownIcons(), ...library];
        expect(searchIcons(all, 'lastboard', 12)[0].provider).toBe(OWN_PROVIDER);
        expect(buildIconIndex(all).get('lastboard')).toBe(`${OWN_ICON_BASE}lastboard.svg`);
        expect(searchIcons(all, 'lasthelp', 12).map(i => i.name)).toEqual(['lasthelp']);
    });
});
