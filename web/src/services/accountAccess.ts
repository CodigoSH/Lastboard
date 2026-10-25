/**
 * What an account may do, as the account form handles it: the catalogue of
 * permissions the server knows, the profiles an administrator starts from, the
 * rules between permissions, and the body that saves them.
 *
 * Pure on purpose, so the rules can be read and tested without a DOM. The
 * server is the one that decides every route; this only builds the request and
 * explains the choice before it is made.
 */

/** How far a permission over a piece of infrastructure goes. */
export type Level = 0 | 1 | 2;

export interface Grants {
    board_edit: boolean;
    board_multiple: boolean;
    board_transfer: boolean;
    icons_internet: boolean;
    widget_api: boolean;
    widget_remote_stats: boolean;
    network_local: boolean;
    docker: Level;
    proxmox: Level;
    watch_status: boolean;
    watch_monitor: boolean;
    watch_alerts: boolean;
    server_telemetry: boolean;
}

export type PermKey = keyof Grants;
export type LevelKey = 'docker' | 'proxmox';
export type BoolKey = Exclude<PermKey, LevelKey>;

export type ProfileId = 'viewer' | 'standard' | 'homelab';
export type ProfileName = ProfileId | 'custom';

/** The templates, in the order the cards are drawn. Choosing one copies its values. */
export const PROFILE_IDS: ProfileId[] = ['viewer', 'standard', 'homelab'];

export const PROFILES: Record<ProfileId, Grants> = {
    viewer: {
        board_edit: false, board_multiple: false, board_transfer: false, icons_internet: false,
        widget_api: false, widget_remote_stats: false, network_local: false,
        docker: 0, proxmox: 0,
        watch_status: false, watch_monitor: false, watch_alerts: false,
        server_telemetry: true,
    },
    standard: {
        board_edit: true, board_multiple: true, board_transfer: true, icons_internet: true,
        widget_api: true, widget_remote_stats: false, network_local: false,
        docker: 0, proxmox: 0,
        watch_status: true, watch_monitor: false, watch_alerts: false,
        server_telemetry: true,
    },
    homelab: {
        board_edit: true, board_multiple: true, board_transfer: true, icons_internet: true,
        widget_api: true, widget_remote_stats: true, network_local: true,
        docker: 2, proxmox: 2,
        watch_status: true, watch_monitor: true, watch_alerts: true,
        server_telemetry: true,
    },
};

/** What the form starts on when creating an account. */
export const DEFAULT_PROFILE: ProfileId = 'standard';

export interface PermDef {
    key: PermKey;
    kind: 'bool' | 'level';
    /** Only means something while this one is on. */
    needs?: BoolKey;
}

export interface PermGroup {
    id: 'board' | 'widgets' | 'network' | 'infra' | 'watch' | 'server';
    perms: PermDef[];
}

/** The catalogue, grouped by area, in the order the form shows it. */
export const PERM_GROUPS: PermGroup[] = [
    { id: 'board', perms: [
        { key: 'board_edit', kind: 'bool' },
        { key: 'board_multiple', kind: 'bool', needs: 'board_edit' },
        { key: 'board_transfer', kind: 'bool' },
        { key: 'icons_internet', kind: 'bool' },
    ] },
    { id: 'widgets', perms: [
        { key: 'widget_api', kind: 'bool' },
        { key: 'widget_remote_stats', kind: 'bool' },
    ] },
    { id: 'network', perms: [
        { key: 'network_local', kind: 'bool' },
    ] },
    { id: 'infra', perms: [
        { key: 'docker', kind: 'level' },
        { key: 'proxmox', kind: 'level' },
    ] },
    { id: 'watch', perms: [
        { key: 'watch_status', kind: 'bool' },
        { key: 'watch_monitor', kind: 'bool' },
        { key: 'watch_alerts', kind: 'bool', needs: 'watch_monitor' },
    ] },
    { id: 'server', perms: [
        { key: 'server_telemetry', kind: 'bool' },
    ] },
];

const ALL_PERMS: PermDef[] = PERM_GROUPS.flatMap(g => g.perms);

const clampLevel = (n: unknown): Level => (n === 2 ? 2 : n === 1 ? 1 : 0);

/** A copy of grants as the server sent them, with levels inside the scale. */
export function grantsFrom(raw: Partial<Grants> | null | undefined, fallback: Grants = PROFILES[DEFAULT_PROFILE]): Grants {
    const g: Record<string, unknown> = { ...fallback };
    if (!raw) return g as unknown as Grants;
    for (const p of ALL_PERMS) {
        const v = raw[p.key];
        if (p.kind === 'level') g[p.key] = clampLevel(v);
        else if (typeof v === 'boolean') g[p.key] = v;
    }
    return g as unknown as Grants;
}

/** Whether a permission is switched off by the one it depends on. */
export function isBlocked(g: Grants, key: PermKey): boolean {
    const needs = ALL_PERMS.find(p => p.key === key)?.needs;
    return !!needs && !g[needs];
}

/** What a switch amounts to: a dependent one is off while the one it needs is. */
export function effective(g: Grants, key: BoolKey): boolean {
    return g[key] && !isBlocked(g, key);
}

/** Grants with every dependent permission cleared when the one it needs is off. */
export function normalize(g: Grants): Grants {
    const out: Record<string, unknown> = { ...g };
    for (const p of ALL_PERMS) {
        if (p.needs && !out[p.needs]) out[p.key] = false;
    }
    return out as unknown as Grants;
}

export function setBool(g: Grants, key: BoolKey, on: boolean): Grants {
    return normalize({ ...g, [key]: on });
}

export function setLevel(g: Grants, key: LevelKey, level: number): Grants {
    return { ...g, [key]: clampLevel(level) };
}

/** Which profile these permissions are exactly, or custom. */
export function profileOf(g: Grants): ProfileName {
    const n = normalize(g);
    for (const id of PROFILE_IDS) {
        if (ALL_PERMS.every(p => n[p.key] === PROFILES[id][p.key])) return id;
    }
    return 'custom';
}

export interface SummaryItem {
    key: PermKey;
    /** For Docker and Proxmox, how far; absent for a plain switch. */
    level?: Level;
}

/**
 * What the account will and will not be able to do, one entry per permission.
 * Docker and Proxmox are on the "can" side at their level, or on the "cannot"
 * side when off.
 */
export function summary(g: Grants): { can: SummaryItem[]; cannot: SummaryItem[] } {
    const can: SummaryItem[] = [];
    const cannot: SummaryItem[] = [];
    for (const p of ALL_PERMS) {
        if (p.kind === 'level') {
            const level = g[p.key as LevelKey];
            if (level > 0) can.push({ key: p.key, level });
            else cannot.push({ key: p.key });
        } else if (effective(g, p.key as BoolKey)) {
            can.push({ key: p.key });
        } else {
            cannot.push({ key: p.key });
        }
    }
    return { can, cannot };
}

export interface AccountForm {
    username: string;
    password: string;
    label: string;
    profile: ProfileName;
    grants: Grants;
}

/** A named profile is sent by name; custom permissions are sent one by one. */
function accessPart(f: AccountForm): { profile: ProfileId } | { grants: Grants } {
    return f.profile === 'custom' ? { grants: normalize(f.grants) } : { profile: f.profile };
}

/** POST /api/users */
export function createBody(f: AccountForm) {
    return { username: f.username, password: f.password, label: f.label.trim(), ...accessPart(f) };
}

/** PUT /api/users. A blank password is left out: it means "keep the one it has". */
export function updateBody(id: number, f: AccountForm) {
    return {
        id,
        username: f.username,
        password: f.password || undefined,
        label: f.label.trim(),
        ...accessPart(f),
    };
}

/** PUT /api/user/label: the administrator naming its own account. */
export function ownLabelBody(label: string) {
    return { label: label.trim() };
}

/** The tag shown where the role used to be: the label, or the role when there is none. */
export function roleOrLabel(label: string | undefined | null, roleText: string): string {
    const l = (label || '').trim();
    return l || roleText;
}
