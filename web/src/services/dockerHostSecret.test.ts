import { describe, expect, test } from 'bun:test';
import { SECRET_MASK } from './secretField';
import { dockerSecretName, hostTokenChange } from './dockerHostSecret';

describe('the name a host token is kept under', () => {
    // The same table is in widget_api_secrets_internal_test.go: the browser and
    // the server must agree, or a saved token is never found.
    const table: [string, string][] = [
        ['h_abc123', 'docker.h_abc123'],
        ['H ABC/1', 'docker.h-abc-1'],
        ['ünï', 'docker.-n-'],
        ['1', 'docker.1'],
    ];
    for (const [id, name] of table) {
        test(`${id}`, () => expect(dockerSecretName(id)).toBe(name));
    }
    test('is never longer than a secret name may be', () => {
        expect(dockerSecretName('x'.repeat(200)).length).toBe(64);
    });
});

describe('a host token on save', () => {
    test('typed replaces; dots change nothing; emptied removes', () => {
        expect(hostTokenChange({ type: 'agent', raw: 'tok', saved: true })).toEqual({ action: 'set', token: 'tok' });
        expect(hostTokenChange({ type: 'agent', raw: SECRET_MASK, saved: true })).toEqual({ action: 'keep' });
        expect(hostTokenChange({ type: 'agent', raw: '', saved: true })).toEqual({ action: 'clear' });
        expect(hostTokenChange({ type: 'agent', raw: '', saved: false })).toEqual({ action: 'keep' });
    });
    test('a host that is not an agent drops the token it had', () => {
        expect(hostTokenChange({ type: 'tcp', raw: SECRET_MASK, saved: true })).toEqual({ action: 'clear' });
        expect(hostTokenChange({ type: 'local', raw: '', saved: false })).toEqual({ action: 'keep' });
    });
});
