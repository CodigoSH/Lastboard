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
        try {
            // 1. Get System Info (Version & Context) from Backend
            // The backend NO LONGER checks GitHub, it just returns local info.
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

            // 2. Proxy Check
            try {
                const proxyUrl = `https://api-updates.codigosh.com/api/v1/check-update?beta=${betaUpdates}`;
                const proxyRes = await fetch(proxyUrl);

                if (proxyRes.ok) {
                    const proxyData = await proxyRes.json();
                    const isNewer = this.compareVersions(proxyData.latest_version, this.version);

                    if (isNewer) {
                        // Construct Dynamic Asset URL
                        // Standard GoReleaser format: lastboard-linux-amd64.tar.gz
                        // Backend now returns correct runtime.GOOS and runtime.GOARCH
                        const os = systemInfo.os || 'linux';
                        const arch = systemInfo.arch || 'amd64';
                        const assetName = `lastboard-${os}-${arch}.tar.gz`;

                        return {
                            available: true,
                            current_version: this.version,
                            latest_version: proxyData.latest_version,
                            asset_url: `https://github.com/CodigoSH/Lastboard/releases/download/${proxyData.latest_version}/${assetName}`,
                            is_docker: false
                        };
                    }
                }
            } catch (e) {
                console.error('[UpdateService] Proxy check failed', e);
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
                latest_version: 'v0.0.0',
                is_docker: false
            };
        }
    }
}

export const updateService = new UpdateService();
