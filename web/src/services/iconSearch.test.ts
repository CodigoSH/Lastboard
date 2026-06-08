import { describe, it, expect } from 'bun:test';
import { searchIcons } from './iconSearch';

type Icon = { name: string; provider: string };

const icons: Icon[] = [
    { name: 'github', provider: 'A' },
    { name: 'gitlab', provider: 'A' },
    { name: 'docker', provider: 'A' },
    { name: 'grafana', provider: 'B' },
    { name: 'gitea', provider: 'B' },
];

describe('searchIcons', () => {
    it('returns all icons when the query is empty', () => {
        expect(searchIcons(icons, '')).toHaveLength(5);
    });

    it('returns all icons when the query is only whitespace', () => {
        expect(searchIcons(icons, '   ')).toHaveLength(5);
    });

    it('filters by case-insensitive substring', () => {
        const out = searchIcons(icons, 'GIT').map((i) => i.name);
        expect(out.sort()).toEqual(['gitea', 'github', 'gitlab']);
    });

    it('trims the query before matching', () => {
        expect(searchIcons(icons, '  docker  ').map((i) => i.name)).toEqual(['docker']);
    });

    it('caps results per provider at the limit', () => {
        // Provider A has 3 "git*"/docker icons; limit 1 keeps one per provider.
        const out = searchIcons(icons, 'git', 1);
        const byProvider = out.reduce<Record<string, number>>((acc, i) => {
            acc[i.provider] = (acc[i.provider] || 0) + 1;
            return acc;
        }, {});
        expect(byProvider['A']).toBe(1);
        expect(byProvider['B']).toBe(1);
    });

    it('keeps results grouped so no provider dominates', () => {
        // limit 2: provider A contributes 2 (github, gitlab), B contributes 1 (gitea)
        const out = searchIcons(icons, 'git', 2);
        expect(out).toHaveLength(3);
    });

    it('returns an empty array when nothing matches', () => {
        expect(searchIcons(icons, 'zzz')).toHaveLength(0);
    });
});
