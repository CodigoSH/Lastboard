import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * The Docker host never goes in a URL.
 *
 * For an agent the host carries the agent's token, and a query string is what a
 * reverse proxy in front of Lastboard writes to its access log. Requests post
 * the host instead (dockerPost). This reads every source file, comments
 * dropped, and fails naming the file and line of any `/api/docker/…?host=`.
 */
const SRC = join(import.meta.dir, '..');

function sources(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return sources(path);
        return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
    });
}

describe('Docker requests', () => {
    it('never put the host in the address', () => {
        let calls = 0;
        const offending: string[] = [];
        for (const file of sources(SRC)) {
            readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
                const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
                if (!code.includes('/api/docker/')) return;
                calls++;
                if (/\/api\/docker\/[a-z]+\S*[?&]host=/.test(code)) {
                    offending.push(`${file.replace(SRC, 'web/src')}:${i + 1}`);
                }
            });
        }
        // Finding no Docker call at all means this is reading the wrong tree.
        expect(calls).toBeGreaterThan(0);
        expect(offending).toEqual([]);
    });
});
