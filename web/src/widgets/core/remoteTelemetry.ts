/**
 * The Server Health widget can read another server instead of the one
 * Lastboard runs on. What decides, in one place and without the DOM so it can
 * be tested: which source a widget uses, where a click on it goes, and what a
 * run of good and failed readings should look like.
 */

export type TelemetrySource = 'local' | 'glances' | 'netdata' | 'custom';

export const REMOTE_SOURCES: readonly TelemetrySource[] = ['glances', 'netdata', 'custom'];

export function telemetrySource(raw: unknown): TelemetrySource {
    return raw === 'glances' || raw === 'netdata' || raw === 'custom' ? raw : 'local';
}

/** What the server answers for one reading. Missing numbers are absent, not zero. */
export interface RemoteReply {
    ok: boolean;
    error?: string;
    stats?: { cpu?: number; ram?: number; temp?: number; version?: string };
}

export interface RemoteView {
    /** The numbers to draw; null draws a grey ring. */
    cpu: number | null;
    ram: number | null;
    temp: number | null;
    /** Readings in a row that failed. */
    failures: number;
    offline: boolean;
    /** The reason, when offline. */
    error?: string;
}

export const EMPTY_VIEW: RemoteView = { cpu: null, ram: null, temp: null, failures: 0, offline: false };

/** One lost reading is a hiccup; this many in a row is a server that is down. */
export const OFFLINE_AFTER = 2;

/**
 * The next thing to draw. A failed reading keeps the last numbers, so a single
 * dropped request does not make every ring flash grey; the second in a row
 * turns the widget offline and blanks the rings. Credentials that are wrong or
 * missing do not wait: nothing will change by asking again.
 */
export function nextRemoteView(prev: RemoteView, reply: RemoteReply): RemoteView {
    if (reply.ok && reply.stats) {
        return {
            cpu: num(reply.stats.cpu),
            ram: num(reply.stats.ram),
            temp: num(reply.stats.temp),
            failures: 0,
            offline: false,
        };
    }
    const failures = prev.failures + 1;
    const final = reply.error === 'auth_required' || reply.error === 'auth_rejected' || reply.error === 'invalid_url';
    if (failures >= OFFLINE_AFTER || final) {
        return { cpu: null, ram: null, temp: null, failures, offline: true, error: reply.error };
    }
    return { ...prev, failures };
}

function num(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Where a click on the widget goes: the address typed as the link, or the
 * server's own address for the sources that serve their own page. Only http and
 * https: the field is free text and a `javascript:` address must never become a
 * link.
 */
export function serverLink(content: { source?: unknown; url?: unknown; link?: unknown } | null | undefined): string | null {
    if (!content) return null;
    const source = telemetrySource(content.source);
    if (source === 'local') return null;
    const raw = String(content.link || (source === 'custom' ? '' : content.url || '')).trim();
    if (!raw) return null;
    try {
        const u = new URL(raw);
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
    } catch {
        return null;
    }
}

/** The i18n key that explains a failed reading or a failed test. */
export function remoteErrorKey(error: string | undefined): string {
    switch (error) {
        case 'auth_required': return 'widget.telemetry.remote.err_auth_required';
        case 'auth_rejected': return 'widget.telemetry.remote.err_auth_rejected';
        case 'unsupported': return 'widget.telemetry.remote.err_unsupported';
        case 'invalid_url': return 'widget.telemetry.remote.err_invalid_url';
        default: return 'widget.telemetry.remote.err_unreachable';
    }
}

/** A signature of everything that makes the widget ask a different question. */
export function remoteSignature(content: any): string {
    const c = content || {};
    return JSON.stringify([telemetrySource(c.source), c.url || '', c.username || '', c.header_name || '',
        c.cpu_path || '', c.ram_path || '', c.ram_used_path || '', c.ram_total_path || '', c.temp_path || '']);
}
