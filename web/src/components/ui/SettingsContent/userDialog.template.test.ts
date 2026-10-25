import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { PROFILES, PROFILE_IDS, setBool } from '../../../services/accountAccess';
import { userDialogTemplate, userPermsTemplate, userProfilesTemplate, userSummaryTemplate } from './userDialog.template';

const LOCALES = new URL('../../../../public/locales/', import.meta.url);

/** Every key the dialog asks for, for every profile and for a state with everything off. */
function keysAsked(): Set<string> {
    const asked = new Set<string>();
    const t = (k: string) => { asked.add(k); return k; };
    userDialogTemplate(t, '');
    userProfilesTemplate(t, 'standard');
    for (const g of [...PROFILE_IDS.map(id => PROFILES[id]), setBool(PROFILES.homelab, 'watch_monitor', false)]) {
        userPermsTemplate(t, g);
        userSummaryTemplate(t, g);
    }
    // The summary lists a level by name, whichever it is.
    for (const l of [0, 1, 2]) asked.add(`users.level.${l}`);
    return asked;
}

describe('the account dialog speaks every language it is drawn in', () => {
    // The scanner cannot see keys built from the catalogue (`users.perm.${key}`),
    // so this asks the templates what they use and looks each one up.
    const asked = keysAsked();
    const files = readdirSync(LOCALES).filter(f => f.endsWith('.json'));

    test('reads the catalogue, not nothing', () => {
        expect(asked.size).toBeGreaterThan(50);
        expect(files.length).toBe(20);
    });

    for (const f of files) {
        test(`${f} has them all, translated`, () => {
            const d = JSON.parse(readFileSync(new URL(f, LOCALES), 'utf8')) as Record<string, string>;
            const missing = [...asked].filter(k => !d[k]);
            expect(missing).toEqual([]);
            if (f !== 'en.json') {
                const en = JSON.parse(readFileSync(new URL('en.json', LOCALES), 'utf8')) as Record<string, string>;
                // A word that is the same in every language (Proxmox, Homelab) is fine; a sentence is not.
                const copied = [...asked].filter(k => d[k] === en[k] && en[k].includes(' '));
                expect(copied).toEqual([]);
            }
        });
    }
});

describe('the permissions panel', () => {
    const t = (k: string) => k;
    const switchFor = (html: string, perm: string) => html.match(new RegExp(`<input[^>]*data-perm="${perm}"[^>]*>`))?.[0] ?? '';

    test('draws a switch for every plain permission and three levels for each integration', () => {
        const html = userPermsTemplate(t, PROFILES.standard);
        expect((html.match(/data-change="user-perm"/g) || []).length).toBe(11);
        expect((html.match(/data-action="user-level"/g) || []).length).toBe(6);
    });
    test('a switch whose parent is off is disabled and unchecked', () => {
        const html = userPermsTemplate(t, setBool(PROFILES.standard, 'board_edit', false));
        const sw = switchFor(html, 'board_multiple');
        expect(sw).toContain('disabled');
        expect(sw).not.toContain('checked');
        expect(switchFor(html, 'board_transfer')).not.toContain('disabled');
    });
    test('alerts follow monitoring', () => {
        expect(switchFor(userPermsTemplate(t, PROFILES.standard), 'watch_alerts')).toContain('disabled');
        expect(switchFor(userPermsTemplate(t, PROFILES.homelab), 'watch_alerts')).not.toContain('disabled');
    });
    test('marks the level the account has', () => {
        const html = userPermsTemplate(t, PROFILES.homelab);
        expect(html).toMatch(/aria-checked="true"\s+data-action="user-level" data-perm="docker" data-level="2"/);
    });
});

describe('the profile cards', () => {
    test('four cards, the chosen one marked', () => {
        const html = userProfilesTemplate(k => k, 'homelab');
        expect((html.match(/data-action="user-profile"/g) || []).length).toBe(4);
        expect(html).toMatch(/is-selected" role="radio"\s+aria-checked="true" data-action="user-profile" data-profile="homelab"/);
    });
});

describe('the summary', () => {
    test('says what a viewer cannot do', () => {
        const html = userSummaryTemplate(k => k, PROFILES.viewer);
        expect(html).toContain('users.perm.docker');
        expect(html.indexOf('users.summary_cannot')).toBeLessThan(html.indexOf('users.perm.docker'));
        expect(html).toContain('users.summary_never');
    });
});
