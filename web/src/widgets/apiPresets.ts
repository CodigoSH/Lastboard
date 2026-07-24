import { i18n } from '../services/i18n';

/**
 * Guided presets for the API widget. Each one composes a full widget config
 * from a base URL (+ optional key) so a non-technical user only fills 1–2
 * fields. "Advanced" (no preset) keeps full manual control. Only services with
 * single-request auth (header / query param) qualify — session-auth services
 * (qBittorrent, Deluge, UniFi…) stay Advanced-only.
 */
export interface ApiPresetConfig {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    arrayPath?: string;
    mappings: { label: string; path: string; format?: string }[];
    refreshSec?: number;
}

export interface ApiPreset {
    id: string;
    name: string;             // proper noun — not translated
    category: string;         // i18n key suffix, see widget.api.cat.*
    needsKey: boolean;
    keyLabelKey: string;      // i18n key for the credential field label
    keyHintKey?: string;      // i18n key for the credential field hint
    urlPlaceholder: string;
    build: (baseUrl: string, key: string) => ApiPresetConfig;
}

const stripSlash = (u: string) => u.trim().replace(/\/+$/, '');
const h = (o: Record<string, string>): Record<string, string> => o;

export const API_PRESETS: ApiPreset[] = [
    {
        id: 'adguard',
        name: 'AdGuard Home',
        category: 'dns',
        needsKey: true,
        keyLabelKey: 'widget.api.key_userpass',
        keyHintKey: 'widget.api.key_userpass_hint',
        urlPlaceholder: 'http://10.0.0.2:3000',
        build: (base, key) => ({
            url: stripSlash(base) + '/control/stats',
            method: 'GET',
            headers: key ? h({ Authorization: 'Basic ' + btoa(key) }) : {},
            mappings: [
                { label: i18n.t('widget.api.label.queries'), path: 'num_dns_queries', format: 'number' },
                { label: i18n.t('widget.api.label.blocked'), path: 'num_blocked_filtering', format: 'number' },
            ],
            refreshSec: 60,
        }),
    },
    {
        id: 'paperless',
        name: 'Paperless-ngx',
        category: 'files',
        needsKey: true,
        keyLabelKey: 'widget.api.key_token',
        urlPlaceholder: 'http://10.0.0.5:8000',
        build: (base, key) => ({
            url: stripSlash(base) + '/api/statistics/',
            method: 'GET',
            headers: key ? h({ Authorization: 'Token ' + key }) : {},
            mappings: [
                { label: i18n.t('widget.api.label.documents'), path: 'documents_total', format: 'number' },
                { label: i18n.t('widget.api.label.inbox'), path: 'documents_inbox', format: 'number' },
            ],
            refreshSec: 300,
        }),
    },
    {
        id: 'immich',
        name: 'Immich',
        category: 'photos',
        needsKey: true,
        keyLabelKey: 'widget.api.key_apikey',
        keyHintKey: 'widget.api.key_immich_hint',
        urlPlaceholder: 'http://10.0.0.6:2283',
        build: (base, key) => ({
            url: stripSlash(base) + '/api/assets/statistics',
            method: 'GET',
            headers: key ? h({ 'x-api-key': key }) : {},
            mappings: [
                { label: i18n.t('widget.api.label.photos'), path: 'images', format: 'number' },
                { label: i18n.t('widget.api.label.videos'), path: 'videos', format: 'number' },
            ],
            refreshSec: 600,
        }),
    },
    {
        id: 'jellyfin',
        name: 'Jellyfin',
        category: 'media',
        needsKey: true,
        keyLabelKey: 'widget.api.key_apikey',
        urlPlaceholder: 'http://10.0.0.7:8096',
        build: (base, key) => ({
            url: stripSlash(base) + '/Items/Counts',
            method: 'GET',
            headers: key ? h({ 'X-Emby-Token': key }) : {},
            mappings: [
                { label: i18n.t('widget.api.label.movies'), path: 'MovieCount', format: 'number' },
                { label: i18n.t('widget.api.label.series'), path: 'SeriesCount', format: 'number' },
            ],
            refreshSec: 300,
        }),
    },
    {
        id: 'sonarr',
        name: 'Sonarr',
        category: 'media',
        needsKey: true,
        keyLabelKey: 'widget.api.key_apikey',
        urlPlaceholder: 'http://10.0.0.8:8989',
        build: (base, key) => ({
            url: stripSlash(base) + '/api/v3/queue?pageSize=1',
            method: 'GET',
            headers: key ? h({ 'X-Api-Key': key }) : {},
            mappings: [
                { label: i18n.t('widget.api.label.queue'), path: 'totalRecords', format: 'number' },
            ],
            refreshSec: 120,
        }),
    },
    {
        id: 'radarr',
        name: 'Radarr',
        category: 'media',
        needsKey: true,
        keyLabelKey: 'widget.api.key_apikey',
        urlPlaceholder: 'http://10.0.0.8:7878',
        build: (base, key) => ({
            url: stripSlash(base) + '/api/v3/queue?pageSize=1',
            method: 'GET',
            headers: key ? h({ 'X-Api-Key': key }) : {},
            mappings: [
                { label: i18n.t('widget.api.label.queue'), path: 'totalRecords', format: 'number' },
            ],
            refreshSec: 120,
        }),
    },
    {
        id: 'sabnzbd',
        name: 'SABnzbd',
        category: 'download',
        needsKey: true,
        keyLabelKey: 'widget.api.key_apikey',
        urlPlaceholder: 'http://10.0.0.9:8080',
        build: (base, key) => ({
            // SABnzbd authenticates via ?apikey= query param, not a header.
            url: stripSlash(base) + '/api?mode=queue&output=json&apikey=' + encodeURIComponent(key),
            method: 'GET',
            headers: {},
            mappings: [
                { label: i18n.t('widget.api.label.queue'), path: 'queue.noofslots_total', format: 'number' },
                { label: i18n.t('widget.api.label.speed'), path: 'queue.speed' },
            ],
            refreshSec: 30,
        }),
    },
    {
        id: 'tautulli',
        name: 'Tautulli',
        category: 'media',
        needsKey: true,
        keyLabelKey: 'widget.api.key_apikey',
        urlPlaceholder: 'http://10.0.0.10:8181',
        build: (base, key) => ({
            url: stripSlash(base) + '/api/v2?apikey=' + encodeURIComponent(key) + '&cmd=get_activity',
            method: 'GET',
            headers: {},
            mappings: [
                { label: i18n.t('widget.api.label.streams'), path: 'response.data.stream_count', format: 'number' },
            ],
            refreshSec: 30,
        }),
    },
    {
        id: 'forgejo',
        name: 'Forgejo / Gitea',
        category: 'git',
        needsKey: true,
        keyLabelKey: 'widget.api.key_token',
        urlPlaceholder: 'http://10.0.0.11:3000',
        build: (base, key) => ({
            // List mode: most recently updated repos the token can see.
            url: stripSlash(base) + '/api/v1/repos/search?limit=30&sort=updated&order=desc',
            method: 'GET',
            headers: key ? h({ Authorization: 'token ' + key }) : {},
            arrayPath: 'data',
            mappings: [
                { label: '', path: 'full_name' },
                { label: '', path: 'stars_count', format: 'number' },
            ],
            refreshSec: 300,
        }),
    },
    {
        id: 'speedtest-tracker',
        name: 'Speedtest Tracker (beta)',
        category: 'network',
        needsKey: true,
        keyLabelKey: 'widget.api.key_token',
        urlPlaceholder: 'http://10.0.0.12:8080',
        build: (base, key) => ({
            url: stripSlash(base) + '/api/v1/results/latest',
            method: 'GET',
            headers: key ? h({ Authorization: 'Bearer ' + key }) : {},
            mappings: [
                { label: i18n.t('widget.api.label.download'), path: 'data.download', format: 'bytes' },
                { label: i18n.t('widget.api.label.upload'), path: 'data.upload', format: 'bytes' },
            ],
            refreshSec: 600,
        }),
    },
    {
        id: 'nextcloud',
        name: 'Nextcloud (beta)',
        category: 'cloud',
        needsKey: true,
        keyLabelKey: 'widget.api.key_userpass',
        keyHintKey: 'widget.api.key_userpass_hint',
        urlPlaceholder: 'http://10.0.0.13',
        build: (base, key) => ({
            url: stripSlash(base) + '/ocs/v2.php/apps/serverinfo/api/v1/info?format=json',
            method: 'GET',
            headers: key ? h({ Authorization: 'Basic ' + btoa(key), 'OCS-APIRequest': 'true' }) : { 'OCS-APIRequest': 'true' },
            mappings: [
                { label: i18n.t('widget.api.label.files'), path: 'ocs.data.nextcloud.storage.num_files', format: 'number' },
                { label: i18n.t('widget.api.label.freespace'), path: 'ocs.data.nextcloud.system.freespace', format: 'bytes' },
            ],
            refreshSec: 600,
        }),
    },
];

export const getPreset = (id: string): ApiPreset | undefined =>
    API_PRESETS.find(p => p.id === id);
