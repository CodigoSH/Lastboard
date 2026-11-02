import { describe, expect, test } from 'bun:test';
import { collectDockerLinks, dockerLinkKey, type DockerLink } from './dockerLinkIndex';
import { chosenDockerIcon, dockerIconKey, withDockerIcon } from './dockerIcons';

const bm = (content: unknown) => ({ type: 'bookmark', content: typeof content === 'string' ? content : JSON.stringify(content) });

describe('collectDockerLinks', () => {
    test('files a declared container by host and name', () => {
        const m = new Map<string, DockerLink>();
        collectDockerLinks([bm({ label: 'Plex', url: 'http://p', icon: '/api/icons/p', docker: { host: 'dk1', name: 'plex' } })], m);
        expect(m.get(dockerLinkKey('dk1', 'plex'))).toEqual({ label: 'Plex', url: 'http://p', icon: '/api/icons/p' });
    });

    test('the same name on two hosts is two containers', () => {
        const m = new Map<string, DockerLink>();
        collectDockerLinks([
            bm({ label: 'A', docker: { host: 'dk1', name: 'db' } }),
            bm({ label: 'B', docker: { host: 'dk2', name: 'db' } }),
        ], m);
        expect(m.get('dk1/db')?.label).toBe('A');
        expect(m.get('dk2/db')?.label).toBe('B');
    });

    test('the first bookmark to name a container keeps it', () => {
        const m = new Map<string, DockerLink>();
        collectDockerLinks([
            bm({ label: 'First', docker: { host: 'dk1', name: 'x' } }),
            bm({ label: 'Second', docker: { host: 'dk1', name: 'x' } }),
        ], m);
        expect(m.get('dk1/x')?.label).toBe('First');
    });

    test('ignores what does not name both a host and a container', () => {
        const m = new Map<string, DockerLink>();
        collectDockerLinks([
            bm({ label: 'no docker' }),
            bm({ label: 'no host', docker: { name: 'x' } }),
            bm({ label: 'no name', docker: { host: 'dk1' } }),
            bm('not json'),
            { type: 'widget', content: JSON.stringify({ docker: { host: 'dk1', name: 'x' } }) },
        ], m);
        expect(m.size).toBe(0);
    });
});

describe('docker icons', () => {
    test('are filed by host and name, like the server does', () => {
        expect(dockerIconKey('dk1', 'plex')).toBe('dk1/plex');
    });

    test('set, read, and clear without touching the old map', () => {
        const a = { 'dk1/x': 'one' };
        const b = withDockerIcon(a, 'dk1', 'y', 'two');
        expect(a).toEqual({ 'dk1/x': 'one' });
        expect(chosenDockerIcon(b, 'dk1', 'y')).toBe('two');
        expect(withDockerIcon(b, 'dk1', 'y', '')).toEqual({ 'dk1/x': 'one' });
        expect(chosenDockerIcon(undefined, 'dk1', 'y')).toBe('');
    });
});
