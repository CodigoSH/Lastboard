import { describe, expect, test } from 'bun:test';
import { accessAllows, dataSections, isForbidden, offeredWidgets, showsData, telemetrySources, widgetAllowed } from './access';

/** What apiService throws, without loading it (it needs a window). */
const ApiError = (message: string, status: number) => Object.assign(new Error(message), { status });

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

const viewer = { access: { profile: 'viewer', can: { server_telemetry: true, widget_api: false, watch_monitor: false, docker_view: false, proxmox_view: false } } };
const homelab = { access: { profile: 'homelab', can: { server_telemetry: true, widget_api: true, watch_monitor: true, docker_view: true, proxmox_view: false } } };
const all = ['clock', 'notepad', 'telemetry', 'monitor', 'proxmox', 'weather', 'markdown', 'docker', 'api'].map(id => ({ id }));

describe('offeredWidgets', () => {
    test('a viewer is offered only the widgets that fetch nothing for it', () => {
        expect(offeredWidgets(viewer, all).map(w => w.id)).toEqual(['clock', 'notepad', 'telemetry', 'weather', 'markdown']);
    });
    test('each widget follows its own permission', () => {
        expect(offeredWidgets(homelab, all).map(w => w.id)).toEqual(
            ['clock', 'notepad', 'telemetry', 'monitor', 'weather', 'markdown', 'docker', 'api']);
        expect(widgetAllowed(homelab, 'proxmox')).toBe(false);
        expect(widgetAllowed(homelab, 'docker')).toBe(true);
    });
    test('offers everything when the server said nothing (the demo)', () => {
        expect(offeredWidgets(null, all)).toHaveLength(all.length);
    });
});

describe('isForbidden', () => {
    test('a missing permission is recognised, other failures are not', () => {
        expect(isForbidden(ApiError('error.forbidden', 403))).toBe(true);
        expect(isForbidden(ApiError('error.conflict', 409))).toBe(false);
        expect(isForbidden(ApiError('something else', 403))).toBe(false);
        expect(isForbidden(new Error('error.forbidden'))).toBe(false);
        expect(isForbidden(undefined)).toBe(false);
    });
});

describe('Server Health', () => {
    const thisMachine = { access: { profile: 'x', can: { server_telemetry: true, widget_remote_stats: false } } };
    const otherMachine = { access: { profile: 'x', can: { server_telemetry: false, widget_remote_stats: true } } };
    const options = [{ value: 'local' }, { value: 'glances' }, { value: 'netdata' }, { value: 'custom' }];
    test('the permission follows the source in use', () => {
        expect(widgetAllowed(thisMachine, 'telemetry', 'local')).toBe(true);
        expect(widgetAllowed(thisMachine, 'telemetry', 'glances')).toBe(false);
        expect(widgetAllowed(otherMachine, 'telemetry', 'glances')).toBe(true);
        expect(widgetAllowed(otherMachine, 'telemetry')).toBe(false); // no source means this machine
        expect(offeredWidgets(otherMachine, [{ id: 'telemetry' }])).toHaveLength(1);
        expect(offeredWidgets({ access: { profile: 'x', can: {} } }, [{ id: 'telemetry' }])).toHaveLength(0);
    });
    test('the selector offers the sources allowed, and keeps the one in use', () => {
        expect(telemetrySources(thisMachine, options, 'local').map(o => o.value)).toEqual(['local']);
        expect(telemetrySources(otherMachine, options, 'glances').map(o => o.value)).toEqual(['glances', 'netdata', 'custom']);
        expect(telemetrySources(thisMachine, options, 'netdata').map(o => o.value)).toEqual(['local', 'netdata']);
    });
});

describe('Data', () => {
    const member = (can: Record<string, boolean>) => ({ role: 'user', access: { profile: 'custom', can } });
    test('a member never sees the backup, which is the whole server', () => {
        expect(dataSections(member({ board_transfer: true, icons_internet: true }))).toEqual({ backup: false, icons: true, transfer: true });
    });
    test('the administrator sees all of it', () => {
        const admin = { role: 'admin', access: { profile: 'admin', can: { board_transfer: true, icons_internet: true } } };
        expect(dataSections(admin)).toEqual({ backup: true, icons: true, transfer: true });
    });
    test('a member with neither permission has no Data section', () => {
        expect(showsData(member({ board_transfer: false, icons_internet: false }))).toBe(false);
        expect(showsData(member({ board_transfer: true, icons_internet: false }))).toBe(true);
    });
});
