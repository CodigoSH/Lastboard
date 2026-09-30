import { describe, expect, test } from 'bun:test';
import {
    containerName,
    defaultContainerUrl,
    hostAddress,
    hostParam,
    hostErrorKey,
    DockerHostError,
    shortId,
    type DockerContainer,
    type DockerHost,
} from './dockerShared';

const container = (over: Partial<DockerContainer> = {}): DockerContainer => ({
    ID: 'abcdef123456',
    Name: '/jellyfin',
    Image: 'jellyfin/jellyfin',
    Status: 'running',
    State: 'running',
    Created: 0,
    Ports: [],
    ...over,
});

describe('shortId', () => {
    test('keys config by the first 8 characters', () => {
        expect(shortId('abcdef1234567890')).toBe('abcdef12');
    });
    test('leaves a shorter id alone', () => {
        expect(shortId('abc')).toBe('abc');
    });
});

describe('containerName', () => {
    test('drops the leading slash Docker adds', () => {
        expect(containerName(container())).toBe('jellyfin');
    });
});

describe('hostParam', () => {
    // People paste what DOCKER_HOST holds. The connection type already says how
    // to reach the host, so a scheme typed into the address field is dropped
    // rather than stacked on top of the one the type adds.
    test('drops a scheme the address was typed with', () => {
        expect(hostParam({ id: '1', name: 'nas', type: 'tcp', url: 'tcp://10.0.0.5:2375' }))
            .toBe('10.0.0.5:2375');
        expect(hostParam({ id: '1', name: 'nas', type: 'tls', url: 'tcp://10.0.0.5:2376' }))
            .toBe('https://10.0.0.5:2376');
        expect(hostParam({ id: '1', name: 'nas', type: 'agent', url: 'http://nas:2375', token: 't' }))
            .toBe('agent://nas:2375?token=t');
        expect(hostParam({ id: '1', name: 'nas', type: 'tcp', url: '  10.0.0.5:2375  ' }))
            .toBe('10.0.0.5:2375');
    });

    test('local sockets address nothing', () => {
        expect(hostParam({ id: '1', name: 'here', type: 'local' })).toBe('');
    });
    test('an agent carries its token', () => {
        expect(hostParam({ id: '1', name: 'nas', type: 'agent', url: 'nas:9091', token: 'a b' }))
            .toBe('agent://nas:9091?token=a%20b');
    });
    test('tls gets an https scheme', () => {
        expect(hostParam({ id: '1', name: 'nas', type: 'tls', url: 'nas:2376' }))
            .toBe('https://nas:2376');
    });
});

describe('hostAddress', () => {
    const fallback = 'dashboard.home';

    test('a local host is wherever you already are', () => {
        expect(hostAddress({ id: '1', name: 'here', type: 'local' }, fallback)).toBe(fallback);
    });

    test('a remote host drops the Docker API port', () => {
        expect(hostAddress({ id: '1', name: 'nas', type: 'tcp', url: 'http://192.168.1.9:2375' }, fallback))
            .toBe('192.168.1.9');
    });

    test('an agent host is addressed by its hostname', () => {
        expect(hostAddress({ id: '1', name: 'nas', type: 'agent', url: 'nas.home:9091' }, fallback))
            .toBe('nas.home');
    });

    test('a host with no URL falls back rather than producing nonsense', () => {
        expect(hostAddress({ id: '1', name: 'broken', type: 'tcp' }, fallback)).toBe(fallback);
    });

    test('nothing configured falls back too', () => {
        expect(hostAddress(undefined, fallback)).toBe(fallback);
    });
});

describe('defaultContainerUrl', () => {
    const local: DockerHost = { id: '1', name: 'here', type: 'local' };
    const remote: DockerHost = { id: '2', name: 'nas', type: 'tcp', url: 'http://192.168.1.9:2375' };

    test('a label the container carries wins over any guess', () => {
        const c = container({
            UrlHint: 'https://jellyfin.home',
            Ports: [{ PublicPort: 8096, PrivatePort: 8096, Type: 'tcp' }],
        });
        expect(defaultContainerUrl(c, local, 'dash.home')).toBe('https://jellyfin.home');
    });

    test('falls back to the first published port on the local host', () => {
        const c = container({ Ports: [{ PublicPort: 8096, PrivatePort: 8096, Type: 'tcp' }] });
        expect(defaultContainerUrl(c, local, 'dash.home')).toBe('http://dash.home:8096');
    });

    test('a remote host is addressed by its own hostname', () => {
        const c = container({ Ports: [{ PublicPort: 8096, PrivatePort: 8096, Type: 'tcp' }] });
        expect(defaultContainerUrl(c, remote, 'dash.home')).toBe('http://192.168.1.9:8096');
    });

    test('a container publishing nothing gets no guess', () => {
        expect(defaultContainerUrl(container(), local, 'dash.home')).toBe('');
    });

    test('ports that are not published are not reachable', () => {
        const c = container({ Ports: [{ PublicPort: 0, PrivatePort: 9000, Type: 'tcp' }] });
        expect(defaultContainerUrl(c, local, 'dash.home')).toBe('');
    });
});

describe('an agent behind HTTPS and a refused token', () => {
    test('keeps https for an agent, and only for https', () => {
        expect(hostParam({ id: '1', name: 'nas', type: 'agent', url: 'https://agent.example.com', token: 't' }))
            .toBe('agent://agent.example.com?token=t&tls=1');
        expect(hostParam({ id: '1', name: 'nas', type: 'agent', url: 'http://nas:9091', token: 't' }))
            .toBe('agent://nas:9091?token=t');
        expect(hostParam({ id: '1', name: 'nas', type: 'agent', url: 'nas:9091', token: 't' }))
            .toBe('agent://nas:9091?token=t');
    });

    test('names a refused token and nothing else', () => {
        expect(hostErrorKey(new DockerHostError('docker.unauthorized'))).toBe('docker.unauthorized');
        expect(hostErrorKey(new DockerHostError('docker.connection_error'))).toBe('docker.connection_error');
        expect(hostErrorKey(new DockerHostError(''))).toBe('docker.connection_error');
        expect(hostErrorKey(new DockerHostError('something.else'))).toBe('docker.connection_error');
        expect(hostErrorKey(new TypeError('Failed to fetch'))).toBe('docker.connection_error');
    });
});
