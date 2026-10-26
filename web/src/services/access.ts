import type { User } from '../types';

/**
 * Whether the account may use something, as /api/me tells it.
 *
 * Only a convenience for leaving out what could not be used: every route
 * checks for itself. When the server says nothing (the demo has no accounts)
 * nothing is taken away.
 */
export function accessAllows(user: Pick<User, 'access'> | null | undefined, cap: string): boolean {
    const can = user?.access?.can;
    if (!can) return true;
    return can[cap] === true;
}

/**
 * The permission each widget needs before it is offered or drawn. A widget not
 * listed (clock, weather, notes, markdown, server health) is always allowed;
 * its remote-machine option has a permission of its own.
 */
const WIDGET_NEEDS: Record<string, string> = {
    api: 'widget_api',
    monitor: 'watch_monitor',
    docker: 'docker_view',
    proxmox: 'proxmox_view',
};

/**
 * Whether the account may use this kind of widget. Server Health is drawn for
 * whoever has the permission its source needs — this machine's own telemetry,
 * or another machine read on its behalf — so it takes the source in use.
 */
export function widgetAllowed(user: Pick<User, 'access'> | null | undefined, widgetId: string, source: string = 'local'): boolean {
    if (widgetId === 'telemetry') {
        return accessAllows(user, source !== 'local' ? 'widget_remote_stats' : 'server_telemetry');
    }
    const need = WIDGET_NEEDS[widgetId];
    return !need || accessAllows(user, need);
}

/**
 * The sources Server Health can read from that the account may use. The one the
 * widget already has is kept so that opening its settings never changes it.
 */
export function telemetrySources<T extends { value: string }>(user: Pick<User, 'access'> | null | undefined, all: T[], current: string): T[] {
    return all.filter(o => o.value === current || widgetAllowed(user, 'telemetry', o.value));
}

/** The widgets the account is offered when adding one. */
export function offeredWidgets<T extends { id: string }>(user: Pick<User, 'access'> | null | undefined, all: T[]): T[] {
    return all.filter(w => w.id === 'telemetry'
        // Offered while at least one of its two sources can be used.
        ? widgetAllowed(user, 'telemetry', 'local') || widgetAllowed(user, 'telemetry', 'glances')
        : widgetAllowed(user, w.id));
}

/**
 * Whether a request failed because the account lacks the permission for it —
 * not a fault. The interface already leaves such things out, so this is only
 * the answer from a page that has not reloaded since the permission changed.
 */
export function isForbidden(err: unknown): boolean {
    const e = err as { status?: number; message?: string } | null | undefined;
    return e?.status === 403 && e?.message === 'error.forbidden';
}

/** The part of an account these rules read. */
type Account = { role?: string } & Partial<Pick<User, 'access'>> | null | undefined;

/** Whether the account is the installation's administrator. */
export function isAdministrator(user: { role?: string } | null | undefined): boolean {
    const role = user?.role?.toLowerCase();
    return role === 'admin' || role === 'administrator';
}

/**
 * The parts of Preferences → Data the account sees. The backup and its restore
 * are the whole server's; storing icons and moving boards in and out are the
 * account's own, each behind its permission.
 */
export function dataSections(user: Account) {
    return {
        backup: isAdministrator(user),
        icons: accessAllows(user, 'icons_internet'),
        transfer: accessAllows(user, 'board_transfer'),
    };
}

/** Whether Data has anything to show this account. */
export function showsData(user: Account): boolean {
    const s = dataSections(user);
    return s.backup || s.icons || s.transfer;
}
