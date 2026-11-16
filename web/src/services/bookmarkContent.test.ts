import { describe, expect, test } from 'bun:test';
import { bookmarkContent, type BookmarkContentInput } from './bookmarkContent';

/**
 * What the editor wrote before it used bookmarkContent, copied as it was. The
 * function has to give exactly this for whatever the editor can hold, or a
 * bookmark saved after the change would not be the one saved before it.
 */
function editorBefore(s: {
    title: string; url: string; icon: string; iconName: string | null; checkStatus: boolean;
    proxmox: BookmarkContentInput['proxmox']; docker: BookmarkContentInput['docker'];
    statusPosition: string; visibleTouch: boolean; labelPosition: string; color: string; borderWidth: number;
}): string {
    return JSON.stringify({
        label: s.title,
        url: s.url,
        description: '',
        icon: s.icon,
        iconName: s.iconName,
        statusCheck: s.checkStatus,
        ...(s.proxmox ? { proxmox: s.proxmox } : {}),
        ...(s.docker ? { docker: s.docker } : {}),
        statusPos: s.checkStatus ? s.statusPosition : 'off',
        visibleTouch: s.visibleTouch,
        openInNewTab: true,
        labelPos: s.labelPosition,
        borderColor: s.color,
        borderWidth: s.borderWidth,
    });
}

type State = Parameters<typeof editorBefore>[0];
const base: State = {
    title: 'Plex', url: 'http://nas:32400', icon: '/api/icons/abc', iconName: 'plex', checkStatus: false,
    proxmox: null, docker: null, statusPosition: 'top-right', visibleTouch: true, labelPosition: 'bottom', color: '', borderWidth: 1,
};
const asInput = (s: State): BookmarkContentInput => ({
    label: s.title, url: s.url, icon: s.icon, iconName: s.iconName, statusCheck: s.checkStatus, proxmox: s.proxmox, docker: s.docker,
    statusPos: s.statusPosition, visibleTouch: s.visibleTouch, labelPos: s.labelPosition, color: s.color, borderWidth: s.borderWidth,
});

describe('bookmarkContent writes what the editor wrote', () => {
    const cases: [string, Partial<State>][] = [
        ['the plainest bookmark', {}],
        ['with its status checked, where the dot sits', { checkStatus: true, statusPosition: 'bottom-left' }],
        ['without a check the position is off whatever was chosen', { checkStatus: false, statusPosition: 'bottom-left' }],
        ['tied to a container', { docker: { host: 'h1', name: 'plex' } }],
        ['tied to a machine', { proxmox: { host: 'p1', node: 'pve', kind: 'lxc', vmid: 106 } }],
        ['with no icon picked', { icon: '', iconName: null }],
        ['with its name above, a colour and a thick border', { labelPosition: 'top', color: '#ff0000', borderWidth: 3 }],
        ['hidden on touch', { visibleTouch: false }],
    ];
    for (const [name, over] of cases) {
        test(name, () => {
            const s: State = { ...base, ...over };
            expect(bookmarkContent(asInput(s))).toBe(editorBefore(s));
        });
    }
});

describe('what the detector leaves out', () => {
    test('takes the editor\'s defaults', () => {
        const c = JSON.parse(bookmarkContent({ label: 'Plex', url: 'http://nas:32400' }));
        expect(c).toEqual({
            label: 'Plex', url: 'http://nas:32400', description: '', icon: '', iconName: null, statusCheck: false,
            statusPos: 'off', visibleTouch: true, openInNewTab: true, labelPos: 'bottom', borderColor: '', borderWidth: 1,
        });
    });
    test('a bookmark with its status checked takes the dot at the top right', () => {
        expect(JSON.parse(bookmarkContent({ label: 'a', url: 'http://a', statusCheck: true })).statusPos).toBe('top-right');
    });
    test('a link to a machine or a container is written only when there is one', () => {
        const c = JSON.parse(bookmarkContent({ label: 'a', url: 'http://a' }));
        expect('docker' in c).toBe(false);
        expect('proxmox' in c).toBe(false);
    });
});
