import { describe, it, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// No particular string is wrong here, so no assertion about strings can catch
// it. What is wrong is a *second* duration formatter existing at all.
//
// It has happened three times. i18n.formatSpan was written to stop the
// monitoring strip labelling a month "720h", and it shipped with these tests
// and this exact reasoning in its comment — and then two components went on
// dividing by 86400 themselves anyway. One printed "16 d" on every Proxmox
// node; the other capped at hours, so a nine-day outage read "231 h". Neither
// failed a test, neither broke the build, and both read as finished code.
//
// What this catches: a unit letter written straight after an interpolation in
// a template string — `${d} d`, `${h} h`, `${m} min`, `${sec}s`, which is the
// shape all three bugs had. What it does NOT catch: a translated unit key, or
// arithmetic on its own (the demo generators divide by 60000 legitimately, and
// must keep being allowed to).
describe('nothing formats a duration on its own', () => {
    const sources: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const path = join(dir, entry);
            if (statSync(path).isDirectory()) { walk(path); continue; }
            if (path.endsWith('.ts') && !path.endsWith('.test.ts')) sources.push(path);
        }
    };
    walk(join(import.meta.dir, '..'));

    // Without this, a walk of the wrong directory passes by finding nothing at
    // all, and reports it as success.
    it('finds the sources to check', () => {
        expect(sources.length).toBeGreaterThan(50);
    });

    it('writes no bare time unit after an interpolated value', () => {
        const offenders: string[] = [];
        for (const path of sources) {
            const text = readFileSync(path, 'utf8');
            for (const match of text.matchAll(/\$\{[^}]*\}\s*(d|h|min|m|s|hrs?|days?)`/g)) {
                const line = text.slice(0, match.index).split('\n').length;
                offenders.push(`${path.split('/web/src/')[1]}:${line} — ${match[0]}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    // And the formatter has to stay reachable: the bug was never that it was
    // wrong, only that nobody called it.
    it('has call sites for the shared formatter', () => {
        const callers = sources.filter(path =>
            !path.endsWith('i18n.helpers.ts') && !path.endsWith('i18n.ts')
            && /formatDuration\s*\(/.test(readFileSync(path, 'utf8')));
        expect(callers.length).toBeGreaterThan(0);
    });
});
