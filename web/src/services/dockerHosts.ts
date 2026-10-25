import { apiService } from './apiService';
import { eventBus, EVENTS } from './EventBus';
import { isDemoMode } from './dockerShared';
import { dockerSettingsPayload, type DockerHostEdit, type DockerSettings } from './dockerHostList';

export * from './dockerHostList';

/**
 * The Docker hosts of the account.
 *
 * They belong to the account, not to a widget: each widget only chooses which
 * of them it shows. This is the one place that reads the list, so the settings
 * screen, the widget and its config modal cannot disagree about which exist.
 */

const DEMO_SETTINGS: DockerSettings = {
    enabled: true,
    admin: true,
    hosts: [{ id: 'demo', name: 'Demo Server', type: 'local', url: '', enabled: true, has_token: false, usable: true }],
};

// Every Docker widget on a board asks for the list when it mounts; one answer
// serves them all for a moment. Saving it in settings drops what was kept.
const KEEP_MS = 3000;
let cached: { at: number; value: Promise<DockerSettings> } | null = null;

export function forgetDockerSettings() {
    cached = null;
}

export function fetchDockerSettings(fresh = false): Promise<DockerSettings> {
    if (isDemoMode()) return Promise.resolve(DEMO_SETTINGS);
    if (!fresh && cached && Date.now() - cached.at < KEEP_MS) return cached.value;
    const value = apiService.get<DockerSettings>('/api/docker/settings').then(s => ({
        enabled: !!s.enabled,
        admin: !!s.admin,
        hosts: Array.isArray(s.hosts) ? s.hosts : [],
    }));
    cached = { at: Date.now(), value };
    value.catch(() => { if (cached?.value === value) cached = null; });
    return value;
}

export async function saveDockerSettings(hosts: DockerHostEdit[]): Promise<DockerSettings> {
    await apiService.post('/api/docker/settings', dockerSettingsPayload(hosts));
    forgetDockerSettings();
    const next = await fetchDockerSettings(true);
    eventBus.emit(EVENTS.DOCKER_CHANGED, { enabled: next.enabled });
    return next;
}
