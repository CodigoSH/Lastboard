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
];

export const getPreset = (id: string): ApiPreset | undefined =>
    API_PRESETS.find(p => p.id === id);
