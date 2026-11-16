import { describe, expect, test } from 'bun:test';
import {
    candidateUrl, consoleUrl, discoverDocker, discoverProxmox, fitSection, iconNamesFor, imageBase, isOwnContainer, pickIconName, planServices, prettyName,
    sectionTitleFor, serviceName, usablePorts, type DiscoverInput, type ServiceProposal,
} from './discoverServices';
import type { DockerContainer, DockerHost } from './dockerShared';
import type { PxGuest } from './proxmoxApi';

const host: DockerHost = { id: 'h1', name: 'Home', type: 'tcp', url: 'tcp://nas.lan:2375' };
const ctr = (o: Partial<DockerContainer> = {}): DockerContainer => ({
    ID: 'abc', Name: '/plex', Image: 'plexinc/pms-docker:latest', Status: 'running', State: 'running', Created: 1,
    Ports: [{ PublicPort: 32400, PrivatePort: 32400, Type: 'tcp', IP: '0.0.0.0' }], ...o,
});
const input = (o: Partial<DiscoverInput> = {}): DiscoverInput => ({ host, linkedLabel: () => '', chosenIcon: () => '', ...o });

describe('names', () => {
    test('an image is reduced to what it is called', () => {
        expect(imageBase('lscr.io/linuxserver/jellyfin:10.9')).toBe('jellyfin');
        expect(imageBase('ghcr.io/immich-app/immich-server@sha256:abc')).toBe('immich-server');
        expect(imageBase('Redis')).toBe('redis');
        expect(imageBase('')).toBe('');
    });
    test('Compose is taken off a service, and a hand-given name is left alone', () => {
        expect(serviceName(ctr({ Name: '/media-plex-1', Project: 'media' }))).toBe('plex');
        expect(serviceName(ctr({ Name: '/media_plex_2', Project: 'media' }))).toBe('plex');
        expect(serviceName(ctr({ Name: '/pihole-2' }))).toBe('pihole-2');
    });
    test('a name is made readable', () => {
        expect(prettyName('home-assistant')).toBe('Home Assistant');
        expect(prettyName('uptime_kuma')).toBe('Uptime Kuma');
        expect(prettyName('')).toBe('');
    });
    test('the icon names come from the image first, then the service', () => {
        expect(iconNamesFor(ctr({ Image: 'ghcr.io/immich-app/immich-server:release', Name: '/photos' }))).toEqual(['immich-server', 'immich', 'photos']);
    });
    test('only a name the library has is picked', () => {
        const index = new Map([['plex', 'u'], ['immich', 'u']]);
        expect(pickIconName(['immich-server', 'immich'], index)).toBe('immich');
        expect(pickIconName(['nothing-like-it'], index)).toBe('');
    });
});

describe('ports', () => {
    test('only TCP ports a browser elsewhere could reach, once each, lowest first', () => {
        const c = ctr({
            Ports: [
                { PublicPort: 8080, PrivatePort: 80, Type: 'tcp', IP: '0.0.0.0' },
                { PublicPort: 8080, PrivatePort: 80, Type: 'tcp', IP: '::' }, // the same port on IPv6
                { PublicPort: 53, PrivatePort: 53, Type: 'udp', IP: '0.0.0.0' },
                { PublicPort: 9000, PrivatePort: 9000, Type: 'tcp', IP: '127.0.0.1' },
                { PublicPort: 9001, PrivatePort: 9001, Type: 'tcp', IP: '::1' },
                { PublicPort: 0, PrivatePort: 22, Type: 'tcp' },
                { PublicPort: 3000, PrivatePort: 3000, Type: 'tcp' }, // an older agent says no address: it counts
            ],
        });
        expect(usablePorts(c)).toEqual([3000, 8080]);
    });
    test('the address is built from the host, TLS ports get https and the default port is left out', () => {
        expect(candidateUrl({ source: 'port', port: 8080, scheme: 'http' }, 'nas.lan')).toBe('http://nas.lan:8080');
        expect(candidateUrl({ source: 'port', port: 443, scheme: 'https' }, 'nas.lan')).toBe('https://nas.lan');
        expect(candidateUrl({ source: 'port', port: 80, scheme: 'http' }, 'nas.lan')).toBe('http://nas.lan');
        expect(candidateUrl({ source: 'port', port: 8006, scheme: 'https' }, '10.0.0.5')).toBe('https://10.0.0.5:8006');
        expect(candidateUrl({ source: 'label', url: 'https://plex.home' }, 'nas.lan')).toBe('https://plex.home');
    });
});

describe('what is proposed', () => {
    test('a label comes first, then the proxy, then the ports', () => {
        const { proposals } = discoverDocker([ctr({ UrlHint: 'https://plex.home', ProxyUrl: 'https://plex.example.com' })], input());
        expect(proposals[0].candidates.map(c => c.source)).toEqual(['label', 'proxy', 'port']);
    });
    test('a port that is nearly always TLS is proposed over https, the rest over http', () => {
        const c = ctr({ Ports: [
            { PublicPort: 8006, PrivatePort: 8006, Type: 'tcp', IP: '0.0.0.0' },
            { PublicPort: 8080, PrivatePort: 80, Type: 'tcp', IP: '0.0.0.0' },
        ] });
        const ports = discoverDocker([c], input()).proposals[0].candidates;
        expect(ports.map(x => [x.port, x.scheme])).toEqual([[8006, 'https'], [8080, 'http']]);
    });
    test('a port published elsewhere but served on a TLS port inside is proposed over https', () => {
        const c = ctr({ Ports: [
            { PublicPort: 18443, PrivatePort: 443, Type: 'tcp', IP: '0.0.0.0' },
            { PublicPort: 18080, PrivatePort: 80, Type: 'tcp', IP: '0.0.0.0' },
        ] });
        const ports = discoverDocker([c], input()).proposals[0].candidates;
        expect(ports.map(x => [x.port, x.scheme])).toEqual([[18080, 'http'], [18443, 'https']]);
    });
    test('a proxy address equal to the label is not offered twice', () => {
        const { proposals } = discoverDocker([ctr({ UrlHint: 'https://p.home', ProxyUrl: 'https://p.home' })], input());
        expect(proposals[0].candidates.map(c => c.source)).toEqual(['label', 'port']);
    });
    test('a running container with an address starts ticked, and carries its link and name', () => {
        const { proposals } = discoverDocker([ctr()], input());
        expect(proposals[0]).toMatchObject({ key: 'h1/plex', hostId: 'h1', containerName: 'plex', name: 'Plex', selected: true, note: '' });
    });
    test('one on the host network publishes nothing: it is offered, unticked, with its reason', () => {
        const { proposals } = discoverDocker([ctr({ Ports: [], NetworkMode: 'host' })], input());
        expect(proposals[0]).toMatchObject({ note: 'host_network', selected: false });
        expect(proposals[0].candidates).toEqual([]);
    });
    test('one with nothing to open is not listed, and is counted', () => {
        const d = discoverDocker([ctr({ Name: '/redis', Ports: [] }), ctr()], input());
        expect(d.proposals.length).toBe(1);
        expect(d.withoutAddress).toBe(1);
    });
    test('Lastboard and its agent are left out, and not counted', () => {
        const d = discoverDocker([
            ctr({ Name: '/lastboard', Image: 'git.codigosh.com/codigosh/lastboard:latest' }),
            ctr({ Name: '/agent', Image: 'git.codigosh.com/codigosh/lastboard-agent:1.5.0' }),
        ], input());
        expect(d.proposals.length).toBe(0);
        expect(d.withoutAddress).toBe(0);
        expect(isOwnContainer(ctr({ Image: 'plexinc/pms-docker' }))).toBe(false);
    });
    test('one a bookmark already serves says which, and starts unticked', () => {
        const { proposals } = discoverDocker([ctr()], input({ linkedLabel: n => (n === 'plex' ? 'My Plex' : '') }));
        expect(proposals[0]).toMatchObject({ linkedTo: 'My Plex', selected: false });
    });
    test('a stopped container is offered, unticked', () => {
        const { proposals } = discoverDocker([ctr({ Status: 'exited', State: 'exited' })], input());
        expect(proposals[0]).toMatchObject({ note: 'stopped', selected: false });
    });
    test('the icon the person chose travels with it', () => {
        const { proposals } = discoverDocker([ctr()], input({ chosenIcon: n => (n === 'plex' ? '/api/icons/abc' : '') }));
        expect(proposals[0].chosenIcon).toBe('/api/icons/abc');
    });
    test('what a container says is kept as plain text, never as markup', () => {
        const evil = '<img src=x onerror=alert(1)>';
        const { proposals } = discoverDocker([ctr({ Name: `/${evil}` })], input());
        expect(proposals[0].containerName).toBe(evil); // the template escapes it; here it is only a string
    });
});

describe('where it goes', () => {
    const p = (name: string, project = ''): ServiceProposal => discoverDocker([ctr({ Name: `/${name}`, Project: project })], input()).proposals[0];
    test('by host, every service is in the host\'s section', () => {
        expect(sectionTitleFor(p('a', 'media'), 'host', 'Home', new Map([['media', 3]]))).toBe('Home');
    });
    test('by project, a project of several has its own section and one of a single service joins the host\'s', () => {
        const size = new Map([['media', 2], ['solo', 1]]);
        expect(sectionTitleFor(p('a', 'media'), 'project', 'Home', size)).toBe('media');
        expect(sectionTitleFor(p('b', 'solo'), 'project', 'Home', size)).toBe('Home');
        expect(sectionTitleFor(p('c'), 'project', 'Home', size)).toBe('Home');
    });
    test('a section the person named takes everything, over projects and over what a container says', () => {
        const svc = (n: string, project: string, group = '') => ({ proposal: { ...p(n, project), group }, name: n, url: `http://h/${n}` });
        const plan = planServices([svc('a', 'media'), svc('b', 'media'), svc('c', 'other', 'Labelled')], 'project', 'Home', 12, ' My lab ');
        expect(plan.sections.map(sec => sec.title)).toEqual(['My lab']);
        expect(plan.sections[0].items.length).toBe(3);
        expect(planServices([svc('a', '')], 'host', 'Home', 12, '   ').sections.map(sec => sec.title)).toEqual(['Home']);
    });
    test('the sections and their bookmarks are laid out the way an import lays them out', () => {
        const svc = (n: string, project: string) => ({ proposal: p(n, project), name: n, url: `http://h/${n}` });
        const plan = planServices([svc('a', 'media'), svc('b', 'media'), svc('c', 'media'), svc('d', 'media'), svc('e', 'media'), svc('x', '')], 'project', 'Home', 12);
        expect(plan.sections.map(s => [s.title, s.items.length])).toEqual([['media', 5], ['Home', 1]]);
        expect(plan.sections[0].w).toBe(3);
        expect(plan.sections[0].h).toBe(2); // five bookmarks: two rows, three wide, not four wide with three cells spare
        expect(plan.sections[0].items[4]).toMatchObject({ title: 'e', x: 2, y: 2, ref: 4 });
        expect([plan.sections[1].w, plan.sections[1].h]).toEqual([1, 1]);
    });
    test('a section is as big as the bookmarks put in it', () => {
        const svc = (n: string) => ({ proposal: p(n, ''), name: n, url: `http://h/${n}` });
        for (const [count, w, h] of [[1, 1, 1], [2, 2, 1], [3, 3, 1], [4, 4, 1]] as const) {
            const [sec] = planServices(Array.from({ length: count }, (_, i) => svc('s' + i)), 'host', 'Home', 12).sections;
            expect([sec.w, sec.h]).toEqual([w, h]);
            // Each bookmark has its own cell inside the section.
            expect(new Set(sec.items.map(it => `${it.x},${it.y}`)).size).toBe(count);
            expect(sec.items.every(it => it.x >= 1 && it.x <= w && it.y >= 1 && it.y <= h)).toBe(true);
        }
    });
    test('past four across, the rows grow and the width narrows to what the last row needs', () => {
        expect([5, 6, 7, 8, 9, 12, 13].map(n => fitSection(n, 12))).toEqual([
            { w: 3, h: 2 }, { w: 3, h: 2 }, { w: 4, h: 2 }, { w: 4, h: 2 }, { w: 3, h: 3 }, { w: 4, h: 3 }, { w: 4, h: 4 },
        ]);
        // Always room for every bookmark, and never an empty row.
        for (let n = 1; n <= 60; n++) { const { w, h } = fitSection(n, 12); expect(w * h).toBeGreaterThanOrEqual(n); expect(w * (h - 1)).toBeLessThan(n); }
        // A board narrower than four columns never gets a section wider than itself.
        expect(fitSection(5, 3)).toEqual({ w: 3, h: 2 });
        expect(fitSection(0, 12)).toEqual({ w: 1, h: 1 });
    });
    test('nothing selected plans nothing', () => {
        expect(planServices([], 'host', 'Home', 12).sections).toEqual([]);
    });
});

describe('what a container will say it serves', () => {
    test('is its host and its name, never its id', () => {
        const { proposals } = discoverDocker([ctr()], input());
        expect(proposals[0].link).toEqual({ docker: { host: 'h1', name: 'plex' } });
    });
});

describe('Proxmox', () => {
    const guest = (o: Partial<PxGuest> = {}): PxGuest => ({
        vmid: 106, name: 'plex-media', kind: 'lxc', node: 'pve', running: true, cpu: 0, mem: 0, mem_total: 0, uptime: 0, ...o,
    });
    const pinput = (o: Partial<Parameters<typeof discoverProxmox>[0]> = {}) => ({
        host: { id: 'p1', name: 'Home PVE' }, consoleBase: 'https://pve.lan:8006', guests: [guest()],
        addresses: { 'pve|106': '192.168.1.106' }, linkedLabel: () => '', chosenIcon: () => '', ...o,
    });

    test('where a machine opens in the hypervisor, and nowhere when the address is not known', () => {
        expect(consoleUrl('https://pve.lan:8006', 'lxc', 106)).toBe('https://pve.lan:8006/#v1:0:=lxc%2F106');
        expect(consoleUrl('https://pve.lan:8006/', 'qemu', 200)).toBe('https://pve.lan:8006/#v1:0:=qemu%2F200');
        expect(consoleUrl('', 'lxc', 1)).toBe('');
    });
    test('a running machine with an address is proposed at it, then at its console, and starts ticked', () => {
        const { proposals } = discoverProxmox(pinput());
        expect(proposals[0]).toMatchObject({ key: 'p1|pve|106', name: 'Plex Media', note: '', selected: true });
        expect(proposals[0].candidates).toEqual([
            { source: 'ip', url: 'http://192.168.1.106' },
            { source: 'console', url: 'https://pve.lan:8006/#v1:0:=lxc%2F106' },
        ]);
        expect(proposals[0].link).toEqual({ proxmox: { host: 'p1', node: 'pve', kind: 'lxc', vmid: 106 } });
    });
    test('one without an address opens its console, says so, and starts unticked', () => {
        const { proposals } = discoverProxmox(pinput({ addresses: {} }));
        expect(proposals[0].candidates.map(c => c.source)).toEqual(['console']);
        expect(proposals[0]).toMatchObject({ note: 'no_ip', selected: false });
    });
    test('the address a machine writes in its notes comes first, and stands in for one it cannot report', () => {
        const withIp = discoverProxmox(pinput({ urls: { 'pve|106': 'https://plex.lan' } })).proposals[0];
        expect(withIp.candidates.map(c => c.source)).toEqual(['label', 'ip', 'console']);
        expect(withIp.candidates[0]).toEqual({ source: 'label', url: 'https://plex.lan' });
        const alone = discoverProxmox(pinput({ addresses: {}, urls: { 'pve|106': 'https://plex.lan' } })).proposals[0];
        expect(alone).toMatchObject({ note: '', selected: true });
        expect(alone.candidates.map(c => c.source)).toEqual(['label', 'console']);
    });
    test('one that is off is offered unticked, with its console', () => {
        const { proposals } = discoverProxmox(pinput({ guests: [guest({ running: false })], addresses: {} }));
        expect(proposals[0]).toMatchObject({ note: 'stopped', selected: false });
        expect(proposals[0].candidates.map(c => c.source)).toEqual(['console']);
    });
    test('with no address and no console to offer, a machine is counted and not listed', () => {
        const d = discoverProxmox(pinput({ consoleBase: '', addresses: {} }));
        expect(d.proposals).toEqual([]);
        expect(d.withoutAddress).toBe(1);
    });
    test('one a bookmark already serves says which, and the icon the person chose travels with it', () => {
        const { proposals } = discoverProxmox(pinput({ linkedLabel: () => 'My Plex', chosenIcon: () => '/api/icons/x' }));
        expect(proposals[0]).toMatchObject({ linkedTo: 'My Plex', selected: false, chosenIcon: '/api/icons/x' });
    });
    test('the same vmid on two nodes are two machines', () => {
        const d = discoverProxmox(pinput({
            guests: [guest({ node: 'a', vmid: 100 }), guest({ node: 'b', vmid: 100 })], addresses: { 'a|100': '10.0.0.1', 'b|100': '10.0.0.2' },
        }));
        expect(d.proposals.map(p => [p.key, p.candidates[0].url])).toEqual([['p1|a|100', 'http://10.0.0.1'], ['p1|b|100', 'http://10.0.0.2']]);
    });
});

describe('what a container says about itself', () => {
    test('its name, its section and its icon win over what is deduced', () => {
        const { proposals } = discoverDocker([ctr({ Name: '/jf', Image: 'jellyfin/jellyfin', HintName: 'Our Jellyfin', HintGroup: 'Media', HintIcon: 'emby' })], input());
        expect(proposals[0]).toMatchObject({ name: 'Our Jellyfin', group: 'Media' });
        expect(proposals[0].iconNames[0]).toBe('emby');
    });
    test('an icon given as an address is kept as one, not looked up as a name', () => {
        const { proposals } = discoverDocker([ctr({ HintIcon: 'https://example.com/i.png' })], input());
        expect(proposals[0].labelIcon).toBe('https://example.com/i.png');
        expect(proposals[0].iconNames).not.toContain('https://example.com/i.png');
    });
    test('a label that is blank says nothing', () => {
        const { proposals } = discoverDocker([ctr({ HintName: '   ', HintGroup: ' ', HintIcon: '' })], input());
        expect(proposals[0]).toMatchObject({ name: 'Plex', group: '', labelIcon: '' });
    });
    test('the section it names is used however the window groups', () => {
        const p = discoverDocker([ctr({ HintGroup: 'Media', Project: 'stack' })], input()).proposals[0];
        const size = new Map([['stack', 3]]);
        expect(sectionTitleFor(p, 'host', 'Home', size)).toBe('Media');
        expect(sectionTitleFor(p, 'project', 'Home', size)).toBe('Media');
    });
});
