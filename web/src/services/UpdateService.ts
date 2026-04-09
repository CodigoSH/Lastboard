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

    // Compare semantic versions (v1 > v2 ?)
    private compareVersions(v1: string, v2: string): boolean {
        const clean1 = v1.replace(/^v/, '');
        const clean2 = v2.replace(/^v/, '');
        const parts1 = clean1.split('-');
        const parts2 = clean2.split('-');

        const core1 = parts1[0].split('.').map(Number);
        const core2 = parts2[0].split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (core1[i] > core2[i]) return true;
            if (core1[i] < core2[i]) return false;
        }

        if (!parts1[1] && parts2[1]) return true;
        if (parts1[1] && !parts2[1]) return false;
        if (!parts1[1] && !parts2[1]) return false;

        const suf1 = parts1[1].toLowerCase();
        const suf2 = parts2[1].toLowerCase();

        return suf1 > suf2;
    }

    async check(betaUpdates: boolean): Promise<UpdateInfo> {
        // --- DEMO MODE: skip backend check (API is protected) ---
        // @ts-ignore
        if (window.LASTBOARD_CONFIG?.demo_mode === true) {
            return {
                available: false,
                current_version: 'v1.5.1-Beta.01', // Mock version for demo
                latest_version: 'v1.5.1-Beta.01',
                is_docker: false
            };
        }

        try {
            // 1. Get System Info (Version & Context) from Backend
            const systemRes = await fetch('/api/system/update/check');
            let systemInfo: any = {
                current_version: 'v0.0.0',
                is_docker: false,
                available: false,
                os: 'linux',
                arch: 'amd64'
            };

            if (systemRes.ok) {
                systemInfo = await systemRes.json();
                this.version = systemInfo.current_version;
            }

            // If Docker, trust the backend's static info (updates managed by container)
            if (systemInfo.is_docker) {
                return {
                    available: false, // Docker doesn't self-update via app
                    current_version: this.version,
                    latest_version: this.version,
                    is_docker: true
                };
            }

            // 2. Forgejo Release Check
            try {
                const FORGEJO_API = 'https://git.codigosh.com/api/v1/repos/CodigoSH/Lastboard';
                const releaseUrl = betaUpdates
                    ? `${FORGEJO_API}/releases?limit=1`
                    : `${FORGEJO_API}/releases/latest`;
                const releaseRes = await fetch(releaseUrl);

                if (releaseRes.ok) {
                    const releaseData = await releaseRes.json();
                    const latestVersion: string = betaUpdates
                        ? releaseData[0]?.tag_name
                        : releaseData.tag_name;

                    const isNewer = this.compareVersions(latestVersion, this.version);

                    if (isNewer) {
                        const os = systemInfo.os || 'linux';
                        const arch = systemInfo.arch || 'amd64';
                        const assetName = `lastboard-${os}-${arch}.tar.gz`;

                        return {
                            available: true,
                            current_version: this.version,
                            latest_version: latestVersion,
                            asset_url: `https://git.codigosh.com/CodigoSH/Lastboard/releases/download/${latestVersion}/${assetName}`,
                            is_docker: false
                        };
                    }
                }
            } catch (e) {
                console.error('[UpdateService] Release check failed', e);
            }

            // Fallback: No update available
            return {
                available: false,
                current_version: this.version,
                latest_version: this.version, // unknown
                is_docker: false
            };

        } catch (error) {
            console.error('[UpdateService] Failed to check for updates', error);
            return {
                available: false,
                current_version: this.version || 'v0.0.0',
                latest_version: 'v1.5.1-Beta.01',
                is_docker: false
            };
        }
    }
}

export const updateService = new UpdateService();
