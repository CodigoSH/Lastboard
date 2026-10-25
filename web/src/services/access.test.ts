import { describe, expect, test } from 'bun:test';
import { accessAllows } from './access';

describe('accessAllows', () => {
    test('follows what the server said', () => {
        const user = { access: { profile: 'viewer', can: { docker_view: true, docker_control: false } } };
        expect(accessAllows(user, 'docker_view')).toBe(true);
        expect(accessAllows(user, 'docker_control')).toBe(false);
    });
    test('a capability the server did not list is not allowed', () => {
        expect(accessAllows({ access: { profile: 'x', can: {} } }, 'docker_view')).toBe(false);
    });
    test('takes nothing away when the server said nothing', () => {
        expect(accessAllows({}, 'docker_control')).toBe(true);
        expect(accessAllows(null, 'docker_control')).toBe(true);
    });
});
