export interface UpdateInfo {
    available: boolean;
    current_version: string;
    latest_version: string;
    release_notes?: string;
    asset_url?: string;
    is_docker: boolean;
}

class UpdateService {
    private version: string = '';

    async check(betaUpdates: boolean): Promise<UpdateInfo> {
        // --- DEMO MODE: skip backend check (API is protected) ---
        if (window.LASTBOARD_CONFIG?.demo_mode === true) {
            return {
                available: false,
                current_version: 'v1.5.1-Beta.26', // Mock version for demo
                latest_version: 'v1.5.1-Beta.26',
                is_docker: false
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
            };
        } catch (error) {
            console.error('[UpdateService] Failed to check for updates', error);
            return {
                available: false,
                current_version: this.version || 'v0.0.0',
                latest_version: this.version || 'v0.0.0',
                is_docker: false
            };
        }
    }
}

export const updateService = new UpdateService();
