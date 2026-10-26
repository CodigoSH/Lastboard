import { describe, expect, test } from 'bun:test';
import { demoApiValues } from './demoApi';

const at = (hours: number, minutes = 0) => new Date(2026, 0, 1, hours, minutes).getTime();

describe('demoApiValues', () => {
    test('answers exactly the paths that were asked for', () => {
        const v = demoApiValues(['num_dns_queries', 'num_blocked_filtering'], at(12));
        expect(Object.keys(v).sort()).toEqual(['num_blocked_filtering', 'num_dns_queries']);
    });

    test('the same moment always gives the same figures', () => {
        const a = demoApiValues(['num_dns_queries'], at(9, 30));
        const b = demoApiValues(['num_dns_queries'], at(9, 30));
        expect(a).toEqual(b);
    });

    test('counters climb as the day goes on', () => {
        const morning = demoApiValues(['num_dns_queries'], at(8)).num_dns_queries as number;
        const evening = demoApiValues(['num_dns_queries'], at(20)).num_dns_queries as number;
        expect(evening).toBeGreaterThan(morning);
    });

    test('blocked queries stay below total queries, as they must', () => {
        const v = demoApiValues(['num_dns_queries', 'num_blocked_filtering'], at(23, 59));
        expect(v.num_blocked_filtering as number).toBeLessThan(v.num_dns_queries as number);
    });

    test('an unknown path still gets a number', () => {
        // A visitor configuring their own widget should see it working, not a
        // row of dashes.
        const v = demoApiValues(['totals.today'], at(12));
        expect(typeof v['totals.today']).toBe('number');
    });

    test('an unknown path is stable rather than random', () => {
        expect(demoApiValues(['queue.count'], at(1))).toEqual(demoApiValues(['queue.count'], at(19)));
    });

    test('empty paths are skipped instead of producing an empty key', () => {
        expect(demoApiValues(['', 'num_dns_queries'], at(12))).not.toHaveProperty('');
    });

    test('no paths means no values', () => {
        expect(demoApiValues([], at(12))).toEqual({});
    });

    test('a list path answers with an array, which is what list view needs', () => {
        const v = demoApiValues(['records'], at(12));
        expect(Array.isArray(v.records)).toBe(true);
        expect((v.records as unknown[]).length).toBeGreaterThan(0);
    });

    test('list rows carry the fields the widget maps', () => {
        const [first] = demoApiValues(['records'], at(12)).records as Record<string, string>[];
        expect(first).toHaveProperty('title');
        expect(first).toHaveProperty('status');
    });

    test('a list is stable across refreshes', () => {
        expect(demoApiValues(['records'], at(3))).toEqual(demoApiValues(['records'], at(21)));
    });
});

describe('demoSessions', () => {
    test('has exactly one session and it is the current one', async () => {
        const { demoSessions } = await import('./demoApi');
        const list = demoSessions();
        expect(list.length).toBe(1);
        expect(list[0].current).toBe(true);
    });
});
