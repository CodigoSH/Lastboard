import { describe, expect, it } from 'bun:test';
import { CHUNK_SIZE, OneAtATime, mergeScope, planStatusCheck, type CheckableItem, type Scope } from './statusPlan';

const bm = (id: number, url: string | undefined, status?: CheckableItem['status'], statusCheck = true): CheckableItem => ({
    id, type: 'bookmark', status,
    content: JSON.stringify({ label: `b${id}`, url, statusCheck }),
});

describe('planStatusCheck', () => {
    // The flicker: every check turned every dot yellow, the green ones included.
    it('turns yellow only the dots that have no answer yet', () => {
        const plan = planStatusCheck([bm(1, 'http://a', 'up'), bm(2, 'http://b', 'down'), bm(3, 'http://c')], 'all');
        expect(plan.pending).toEqual([3]);
        expect(plan.byUrl.size).toBe(3);       // all three are still asked about
    });

    it('asks only about the unknown ones when the board changed', () => {
        const plan = planStatusCheck([bm(1, 'http://a', 'up'), bm(2, 'http://b'), bm(3, 'http://c', 'pending')], 'unknown');
        expect([...plan.byUrl.keys()]).toEqual(['http://b', 'http://c']);
        expect(plan.pending).toEqual([2]);     // 3 already shows yellow
    });

    it('asks about everything on the timer', () => {
        const plan = planStatusCheck([bm(1, 'http://a', 'up'), bm(2, 'http://b', 'down')], 'all');
        expect([...plan.byUrl.keys()]).toEqual(['http://a', 'http://b']);
    });

    it('asks each address once, however many bookmarks point at it', () => {
        const plan = planStatusCheck([bm(1, 'http://same'), bm(2, 'http://same'), bm(3, 'http://other')], 'all');
        expect(plan.byUrl.get('http://same')).toEqual([1, 2]);
        expect(plan.chunks.flat()).toEqual(['http://same', 'http://other']);
    });

    it('ignores anything that is not a bookmark with the check switched on', () => {
        const plan = planStatusCheck([
            bm(1, 'http://a', undefined, false),
            { id: 2, type: 'section', content: '{"title":"x"}' },
            { id: 3, type: 'bookmark', content: 'not json' },
            bm(4, 'http://d'),
        ], 'all');
        expect([...plan.byUrl.values()].flat()).toEqual([4]);
    });

    it('marks an address that cannot be asked about as down without asking', () => {
        const plan = planStatusCheck([bm(1, undefined), bm(2, '#'), bm(3, 'javascript:alert(1)'), bm(4, 'http://ok')], 'all');
        expect(plan.invalid).toEqual([1, 2, 3]);
        expect([...plan.byUrl.keys()]).toEqual(['http://ok']);
    });

    // So that fast answers are shown at once instead of waiting for the slowest.
    it('splits the questions into groups the server answers together', () => {
        const items = Array.from({ length: CHUNK_SIZE * 2 + 3 }, (_, i) => bm(i + 1, `http://s${i}`));
        const plan = planStatusCheck(items, 'all');
        expect(plan.chunks.map(c => c.length)).toEqual([CHUNK_SIZE, CHUNK_SIZE, 3]);
        expect(plan.chunks.flat()).toHaveLength(items.length);
    });

    it('plans nothing for an empty board', () => {
        const plan = planStatusCheck([], 'all');
        expect(plan.chunks).toEqual([]);
        expect(plan.pending).toEqual([]);
    });
});

describe('mergeScope', () => {
    it('lets a request for everything win', () => {
        expect(mergeScope(null, 'unknown')).toBe('unknown');
        expect(mergeScope('unknown', 'all')).toBe('all');
        expect(mergeScope('all', 'unknown')).toBe('all');
    });
});

describe('OneAtATime', () => {
    function harness() {
        const calls: Scope[] = [];
        let release!: () => void;
        const gate = () => new Promise<void>(r => { release = r; });
        let current: Promise<void> | null = null;
        const runner = new OneAtATime(async scope => {
            calls.push(scope);
            current = gate();
            await current;
        });
        return { calls, runner, release: () => release() };
    }

    it('does not start a second check beside the first', async () => {
        const { calls, runner, release } = harness();
        const first = runner.request('all');
        await Promise.resolve();
        void runner.request('unknown');
        void runner.request('unknown');
        expect(calls).toEqual(['all']);            // still only the first
        release();
        await Promise.resolve(); await Promise.resolve();
        release();
        await first;
        // The two requests made meanwhile ran as one.
        expect(calls).toEqual(['all', 'unknown']);
    });

    it('widens the queued run to everything if anyone asked for everything', async () => {
        const { calls, runner, release } = harness();
        const first = runner.request('unknown');
        await Promise.resolve();
        void runner.request('unknown');
        void runner.request('all');
        release();
        await Promise.resolve(); await Promise.resolve();
        release();
        await first;
        expect(calls).toEqual(['unknown', 'all']);
    });

    it('does not narrow the queued run when a smaller request comes after', async () => {
        const { calls, runner, release } = harness();
        const first = runner.request('unknown');
        await Promise.resolve();
        void runner.request('all');
        void runner.request('unknown');
        release();
        await Promise.resolve(); await Promise.resolve();
        release();
        await first;
        expect(calls).toEqual(['unknown', 'all']);
    });

    it('is free again after a check, and after one that threw', async () => {
        const calls: Scope[] = [];
        let fail = true;
        const runner = new OneAtATime(async scope => { calls.push(scope); if (fail) throw new Error('boom'); });
        await expect(runner.request('all')).rejects.toThrow('boom');
        expect(runner.busy).toBe(false);
        fail = false;
        await runner.request('all');
        expect(calls).toEqual(['all', 'all']);
    });
});
