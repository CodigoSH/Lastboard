import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
    PERM_GROUPS, PROFILES, PROFILE_IDS, createBody, effective, grantsFrom, isBlocked, normalize,
    ownLabelBody, profileOf, roleOrLabel, setBool, setLevel, summary, updateBody,
    type AccountForm, type Grants,
} from './accountAccess';

const form = (over: Partial<AccountForm> = {}): AccountForm => ({
    username: 'ana', password: 'secret-pass', label: '  Dad ', profile: 'standard', grants: { ...PROFILES.standard }, ...over,
});

describe('profiles', () => {
    test('each profile is recognised as itself', () => {
        for (const id of PROFILE_IDS) expect(profileOf(PROFILES[id])).toBe(id);
    });
    test('touching one permission makes it custom', () => {
        expect(profileOf(setBool(PROFILES.standard, 'widget_remote_stats', true))).toBe('custom');
        expect(profileOf(setLevel(PROFILES.standard, 'docker', 1))).toBe('custom');
    });
    test('putting it back makes it the profile again', () => {
        const g = setBool(setBool(PROFILES.homelab, 'network_local', false), 'network_local', true);
        expect(profileOf(g)).toBe('homelab');
    });
    test('profiles are distinct', () => {
        expect(new Set(PROFILE_IDS.map(id => JSON.stringify(PROFILES[id]))).size).toBe(PROFILE_IDS.length);
    });
});

describe('dependencies', () => {
    test('multiple boards need editing', () => {
        const g = setBool(PROFILES.standard, 'board_edit', false);
        expect(g.board_multiple).toBe(false);
        expect(isBlocked(g, 'board_multiple')).toBe(true);
        expect(effective({ ...g, board_multiple: true }, 'board_multiple')).toBe(false);
    });
    test('alerts need monitoring', () => {
        const g = setBool(PROFILES.homelab, 'watch_monitor', false);
        expect(g.watch_alerts).toBe(false);
        expect(isBlocked(g, 'watch_alerts')).toBe(true);
        expect(isBlocked(PROFILES.homelab, 'watch_alerts')).toBe(false);
    });
    test('normalize leaves independent permissions alone', () => {
        const g = normalize({ ...PROFILES.viewer, board_multiple: true, watch_alerts: true });
        expect(g).toEqual(PROFILES.viewer);
    });
    test('a dependent permission stored on without its parent is read as off', () => {
        const g = { ...PROFILES.viewer, board_multiple: true };
        expect(profileOf(g)).toBe('viewer');
        expect(summary(g).can.map(i => i.key)).not.toContain('board_multiple');
    });
});

describe('summary', () => {
    test('every permission is on exactly one side', () => {
        for (const id of PROFILE_IDS) {
            const s = summary(PROFILES[id]);
            const keys = [...s.can, ...s.cannot].map(i => i.key).sort();
            const all = PERM_GROUPS.flatMap(g => g.perms.map(p => p.key)).sort();
            expect(keys).toEqual(all);
        }
    });
    test('infrastructure carries its level', () => {
        const s = summary(setLevel(PROFILES.standard, 'docker', 1));
        expect(s.can.find(i => i.key === 'docker')?.level).toBe(1);
        expect(s.cannot.map(i => i.key)).toContain('proxmox');
    });
    test('a viewer can only look', () => {
        expect(summary(PROFILES.viewer).can.map(i => i.key)).toEqual(['server_telemetry']);
    });
});

describe('request bodies', () => {
    test('a named profile is sent by name, trimmed label, no grants', () => {
        const b = createBody(form());
        expect(b).toEqual({ username: 'ana', password: 'secret-pass', label: 'Dad', profile: 'standard' });
    });
    test('custom permissions are sent one by one and normalised', () => {
        const g: Grants = { ...PROFILES.viewer, board_multiple: true, docker: 1 };
        const b = createBody(form({ profile: 'custom', grants: g })) as { grants?: Grants; profile?: string };
        expect(b.profile).toBeUndefined();
        expect(b.grants?.board_multiple).toBe(false);
        expect(b.grants?.docker).toBe(1);
    });
    test('an edit without a password does not send one', () => {
        const b = updateBody(7, form({ password: '' }));
        expect(b.password).toBeUndefined();
        expect(JSON.stringify(b)).not.toContain('password');
        expect(b.id).toBe(7);
    });
    test('clearing the label is sent as an empty string, not left out', () => {
        expect(updateBody(1, form({ label: '   ' })).label).toBe('');
        expect(ownLabelBody('  Boss ')).toEqual({ label: 'Boss' });
    });
});

describe('grantsFrom', () => {
    test('clamps levels and ignores what is not a boolean', () => {
        const g = grantsFrom({ docker: 9 as never, proxmox: -3 as never, board_edit: 'yes' as never });
        expect(g.docker).toBe(0);
        expect(g.proxmox).toBe(0);
        expect(g.board_edit).toBe(PROFILES.standard.board_edit);
    });
    test('does not share the object it starts from', () => {
        const g = grantsFrom(null);
        g.docker = 2;
        expect(PROFILES.standard.docker).toBe(0);
    });
});

describe('roleOrLabel', () => {
    test('the label wins, the role is the fallback', () => {
        expect(roleOrLabel(' Operations ', 'Member')).toBe('Operations');
        expect(roleOrLabel('', 'Member')).toBe('Member');
        expect(roleOrLabel(undefined, 'Admin')).toBe('Admin');
    });
});

/* The catalogue and the profiles are written twice, here and in the server. This
   reads the server's copy so a permission added or a profile changed on one side
   only fails here and not on somebody's account. */
describe('agrees with the server', () => {
    const go = readFileSync(new URL('../../../internal/core/access/access.go', import.meta.url), 'utf8');

    const jsonNames = new Map<string, string>();
    for (const m of go.matchAll(/^\s*(\w+)\s+(?:bool|Level)\s+`json:"(\w+)"`/gm)) jsonNames.set(m[1], m[2]);

    test('the same permissions', () => {
        expect(jsonNames.size).toBeGreaterThan(10);
        const mine = PERM_GROUPS.flatMap(g => g.perms.map(p => p.key)).sort();
        expect([...jsonNames.values()].sort()).toEqual(mine);
    });

    const body = (fn: string) => {
        const m = go.match(new RegExp(`func ${fn}\\(\\) Grants \\{([\\s\\S]*?)\\n\\}`));
        if (!m) throw new Error(`no ${fn} in access.go`);
        return m[1];
    };
    const goProfile = (fn: string): Record<string, boolean | number> => {
        const out: Record<string, boolean | number> = {};
        for (const key of jsonNames.values()) out[key] = key === 'docker' || key === 'proxmox' ? 0 : false;
        for (const m of body(fn).matchAll(/(\w+):\s*(true|false|None|View|Control)\b/g)) {
            const key = jsonNames.get(m[1]);
            if (!key) continue;
            const v = m[2];
            out[key] = v === 'true' ? true : v === 'false' ? false : v === 'None' ? 0 : v === 'View' ? 1 : 2;
        }
        return out;
    };

    for (const [id, fn] of [['viewer', 'Viewer'], ['standard', 'Standard'], ['homelab', 'Homelab']] as const) {
        test(`the ${id} profile has the server's values`, () => {
            expect(PROFILES[id] as unknown as Record<string, unknown>).toEqual(goProfile(fn));
        });
    }

    test("the dependencies are the server's", () => {
        expect(go).toContain('g.BoardEdit && g.BoardMultiple');
        expect(go).toContain('g.WatchMonitor && g.WatchAlerts');
        const needs = PERM_GROUPS.flatMap(g => g.perms).filter(p => p.needs).map(p => `${p.key}<-${p.needs}`).sort();
        expect(needs).toEqual(['board_multiple<-board_edit', 'watch_alerts<-watch_monitor']);
    });
});
