import { csrfToken } from './csrf';
export interface UpdateInfo {
    available: boolean;
    current_version: string;
    latest_version: string;
    release_notes?: string;
    asset_url?: string;
    is_docker: boolean;
    /** i18n key, set when the release server could not be asked. Never "up to date". */
    check_error?: string;
}

/** One progress notification streamed by the backend while it updates. */
export interface UpdateEvent {
    step: string;
    status: 'running' | 'ok' | 'skipped' | 'error';
    /** i18n key of the failure, only on status 'error'. */
    error?: string;
    /** i18n key of a secondary outcome, e.g. whether a failed install rolled back. */
    detail?: string;
}

/** An update the server refused to start, carrying the HTTP status it answered with. */
export class UpdateRequestError extends Error {
    status = 0;
}

/** Steps the backend reports, in the order they run. Mirrors update.go. */
export const UPDATE_STEPS = ['download', 'signature', 'checksum', 'extract', 'install', 'restart'] as const;
export type UpdateStepId = typeof UPDATE_STEPS[number];

class UpdateService {
    private version: string = '';

    async check(betaUpdates: boolean): Promise<UpdateInfo> {
        // --- DEMO MODE: skip backend check (API is protected) ---
        if (window.LASTBOARD_CONFIG?.demo_mode === true) {
            return {
                available: false,
                current_version: 'v1.8.3', // Mock version for demo
                latest_version: 'v1.8.3',
                is_docker: true // The public demo runs in Docker → show the Docker notice, not the updater
            };
        }

        try {
            // Backend handles Forgejo fetch + version comparison to avoid CORS issues
            const res = await fetch(`/api/system/update/check?beta=${betaUpdates}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const info = await res.json();
            this.version = info.current_version;

            return {
                available: info.available,
                current_version: info.current_version,
                latest_version: info.latest_version,
                release_notes: info.release_notes,
                asset_url: info.asset_url,
                is_docker: info.is_docker,
                check_error: info.check_error,
            };
        } catch (error) {
            console.error('[UpdateService] Failed to check for updates', error);
            // Not "nothing newer": nothing is known. Saying up to date here is
            // what told people all was well while their server could not look.
            return {
                available: false,
                current_version: this.version || 'v0.0.0',
                latest_version: this.version || 'v0.0.0',
                is_docker: false,
                check_error: 'settings.update_check_failed',
            };
        }
    }

    /**
     * Reads the version the server is currently running.
     *
     * Deliberately calls the check endpoint with no query string: in that shape
     * it answers straight from the running binary without contacting Forgejo, so
     * it is cheap enough to poll while waiting for a restart.
     */
    async runningVersion(): Promise<string> {
        const res = await fetch('/api/system/update/check', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const info = await res.json();
        return info.current_version as string;
    }

    /**
     * Starts the update and reports each step as the backend completes it.
     *
     * Asking for text/event-stream is what turns the endpoint into a stream;
     * anything rejected before the update begins (not an admin, bad asset URL)
     * still comes back as a normal HTTP error, and is thrown from here.
     *
     * Resolves when the stream ends. That happens either because a step failed —
     * the caller sees it through onEvent — or because the server announced the
     * restart and is now replacing itself.
     */
    async perform(assetUrl: string, onEvent: (event: UpdateEvent) => void): Promise<void> {
        const csrf = csrfToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
        };
        if (csrf) headers['X-CSRF-Token'] = csrf;

        const res = await fetch('/api/system/update/perform', {
            method: 'POST',
            headers,
            body: JSON.stringify({ asset_url: assetUrl }),
            cache: 'no-store',
        });

        if (!res.ok) {
            // The updater's own refusals arrive as a bare i18n key. Anything the
            // middleware rejects first ("Unauthorized", "Forbidden") is plain
            // English, so the status travels with the error and the caller can
            // tell an expired session from a failed update.
            const failure = new UpdateRequestError((await res.text()).trim() || `HTTP ${res.status}`);
            failure.status = res.status;
            throw failure;
        }

        if (!res.body) {
            // No streaming support in this browser: the update is still running
            // server-side, so let the caller fall back to waiting for the restart.
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (; ;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE frames are separated by a blank line; a partial one stays in
            // the buffer until the rest of it arrives.
            let sep = buffer.indexOf('\n\n');
            while (sep !== -1) {
                const frame = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);
                const payload = frame
                    .split('\n')
                    .filter(line => line.startsWith('data:'))
                    .map(line => line.slice(5).trim())
                    .join('');
                if (payload) {
                    try {
                        onEvent(JSON.parse(payload) as UpdateEvent);
                    } catch (e) {
                        console.error('[UpdateService] Malformed progress event', payload, e);
                    }
                }
                sep = buffer.indexOf('\n\n');
            }
        }
    }
}

export const updateService = new UpdateService();
