import { describe, it, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { translate } from './i18n.helpers';

const FSI = '⁨';
const PDI = '⁩';

describe('interpolated values are isolated', () => {
    it('wraps the value so the punctuation around it keeps the sentence direction', () => {
        const table = { greeting: 'مرحبا {name}!' };
        expect(translate('greeting', table, table, { name: 'Kiwinho' }))
            .toBe(`مرحبا ${FSI}Kiwinho${PDI}!`);
    });

    it('isolates every value, not just the first', () => {
        const table = { pair: '{a} و {b}' };
        const out = translate('pair', table, table, { a: '3', b: '7' });
        expect(out).toBe(`${FSI}3${PDI} و ${FSI}7${PDI}`);
    });

    it('leaves a string with no parameters untouched', () => {
        const table = { plain: 'حفظ' };
        expect(translate('plain', table, table)).toBe('حفظ');
        expect(translate('plain', table, table, {})).toBe('حفظ');
    });
});

// Nothing is wrong with any particular string, so no assertion about strings
// can catch this. What is wrong is a *second* interpolator existing at all:
// a call site that takes the translated sentence and does its own .replace()
// gets no isolation, and in Arabic the comma or colon beside the value ends up
// at the wrong end. The whole point of putting interpolation in one place is
// that there is one place.
describe('nothing interpolates a translation on its own', () => {
    const sources: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const path = join(dir, entry);
            if (statSync(path).isDirectory()) { walk(path); continue; }
            if (path.endsWith('.ts') && !path.endsWith('.test.ts')) sources.push(path);
        }
    };
    walk(join(import.meta.dir, '..'));

    it('finds the sources to check', () => {
        expect(sources.length).toBeGreaterThan(20);
    });

    it('has no call that replaces a placeholder outside the interpolator', () => {
        const offenders: string[] = [];
        for (const path of sources) {
            const text = readFileSync(path, 'utf8');
            // i18n.t(...) whose result is fed straight into .replace('{…}'),
            // including the chained form that fills a second placeholder.
            for (const match of text.matchAll(/i18n\.t\([^;]{0,400}?\.replace\(\s*['"`]\{/g)) {
                const line = text.slice(0, match.index).split('\n').length;
                offenders.push(`${path.split('/web/src/')[1]}:${line}`);
            }
        }
        expect(offenders).toEqual([]);
    });
});
