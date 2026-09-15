import { describe, expect, it } from 'bun:test';
import { localeIsStale } from './i18n.helpers';

/**
 * What this catches: a locale table served from some cache that belongs to a
 * different build, which is what made 1.8.0 render its new keys raw while the
 * old ones translated fine. What it does NOT catch: a table that is current but
 * incomplete - that is what i18n:sync is for.
 */
describe('localeIsStale', () => {
    const BUILD = '7fdf72f3f2ab8b14';

    it('accepts a table stamped by this very build', () => {
        expect(localeIsStale(BUILD, BUILD)).toBe(false);
    });

    it('rejects a table stamped by another build', () => {
        expect(localeIsStale('ffad1df60e5c326d', BUILD)).toBe(true);
    });

    it('rejects a table with no stamp at all, which is what every file served before this existed looks like', () => {
        expect(localeIsStale(undefined, BUILD)).toBe(true);
        expect(localeIsStale(null, BUILD)).toBe(true);
    });

    it('does not compare a near miss loosely', () => {
        expect(localeIsStale('7fdf72f3f2ab8b1', BUILD)).toBe(true);
        expect(localeIsStale(' 7fdf72f3f2ab8b14', BUILD)).toBe(true);
    });

    it('stays quiet when the sources run outside a build, where nothing is stamped', () => {
        expect(localeIsStale(undefined, 'dev')).toBe(false);
        expect(localeIsStale('anything', 'dev')).toBe(false);
        expect(localeIsStale(undefined, '')).toBe(false);
    });
});
