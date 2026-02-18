import { GridItem, User } from '../types';

/**
 * Unified Default Configuration
 * This file serves as the single source of truth for:
 * 1. Demo Mode Data (in-memory)
 * 2. New Installation Defaults (when DB is empty)
 * 3. New User Defaults (template)
 */

export const DEFAULT_USER: User = {
    id: 999,
    username: 'Demo User',
    initials: 'DU',
    role: 'admin',
    avatar_url: '',
    accent_color: 'blue',
    language: 'en',
    theme: 'dark',
    grid_columns: 12,
    project_name: 'Lastboard',
    beta_updates: false,
    preferences: {
        accent_color: 'blue',
        language: 'en',
        theme: 'dark',
        grid_columns: 12,
        project_name: 'Lastboard',
        beta_updates: false
    }
};

export const DEFAULT_ITEMS: GridItem[] = [
    // --- TOP ROW: System Monitoring & Control ---
    {
        id: 1,
        type: 'widget',
        x: 1, y: 1, w: 3, h: 2,
        content: JSON.stringify({
            widgetId: 'clock',
            timezone: 'local',
            format: '24h'
        })
    },
    {
        id: 2,
        type: 'widget',
        x: 4, y: 1, w: 2, h: 2,
        content: JSON.stringify({
            widgetId: 'weather',
            location: 'Madrid',
            units: 'metric'
        })
    },
    {
        id: 3,
        type: 'widget',
        x: 6, y: 1, w: 4, h: 2,
        content: JSON.stringify({
            widgetId: 'telemetry',
            show_cpu: true,
            show_ram: true
        })
    },
    {
        id: 4,
        type: 'widget',
        x: 10, y: 1, w: 3, h: 2,
        content: JSON.stringify({
            widgetId: 'markdown',
            title: 'Lab Status',
            content: `**Uptime:** 142 days\n**Updates:** 0 pending\n**Security:** Verified`
        })
    },

    // --- SECOND ROW: Media & Infrastructure (Grouped) ---
    {
        id: 5,
        type: 'section',
        x: 1, y: 3, w: 6, h: 4,
        content: JSON.stringify({ title: 'Media Services' })
    },
    {
        id: 6,
        parent_id: 5,
        type: 'bookmark',
        x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Plex',
            url: 'https://plex.tv',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png',
            iconName: 'plex'
        })
    },
    {
        id: 7,
        parent_id: 5,
        type: 'bookmark',
        x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Sonarr',
            url: 'https://sonarr.tv',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png',
            iconName: 'sonarr'
        })
    },
    {
        id: 8,
        parent_id: 5,
        type: 'bookmark',
        x: 3, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Radarr',
            url: 'https://radarr.video',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/radarr.png',
            iconName: 'radarr'
        })
    },
    {
        id: 9,
        parent_id: 5,
        type: 'bookmark',
        x: 1, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Jellyfin',
            url: 'https://jellyfin.org',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jellyfin.png',
            iconName: 'jellyfin'
        })
    },
    {
        id: 10,
        parent_id: 5,
        type: 'bookmark',
        x: 2, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Tautulli',
            url: 'https://tautulli.com',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/tautulli.png',
            iconName: 'tautulli'
        })
    },
    {
        id: 11,
        parent_id: 5,
        type: 'bookmark',
        x: 3, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Transmission',
            url: 'https://transmissionbt.com',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/transmission.png',
            iconName: 'transmission'
        })
    },

    {
        id: 12,
        type: 'section',
        x: 7, y: 3, w: 6, h: 4,
        content: JSON.stringify({ title: 'Infrastructure' })
    },
    {
        id: 13,
        parent_id: 12,
        type: 'bookmark',
        x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Proxmox',
            url: 'https://www.proxmox.com',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/proxmox.png',
            iconName: 'proxmox'
        })
    },
    {
        id: 14,
        parent_id: 12,
        type: 'bookmark',
        x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Portainer',
            url: 'https://www.portainer.io',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png',
            iconName: 'portainer'
        })
    },
    {
        id: 15,
        parent_id: 12,
        type: 'bookmark',
        x: 3, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Pi-hole',
            url: 'https://pi-hole.net',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pi-hole.png',
            iconName: 'pi-hole'
        })
    },
    {
        id: 16,
        parent_id: 12,
        type: 'bookmark',
        x: 1, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Home Assistant',
            url: 'https://www.home-assistant.io',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png',
            iconName: 'home-assistant'
        })
    },
    {
        id: 17,
        parent_id: 12,
        type: 'bookmark',
        x: 2, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Nginx Proxy Manager',
            url: 'https://nginxproxymanager.com',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nginx-proxy-manager.png',
            iconName: 'nginx-proxy-manager'
        })
    },
    {
        id: 18,
        parent_id: 12,
        type: 'bookmark',
        x: 3, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Grafana',
            url: 'https://grafana.com',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/grafana.png',
            iconName: 'grafana'
        })
    },

    // --- BOTTOM ROW: Daily Links ---
    {
        id: 19,
        type: 'bookmark',
        x: 1, y: 7, w: 2, h: 1,
        content: JSON.stringify({
            label: 'GitHub',
            url: 'https://github.com/CodigoSH/Lastboard',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/github.png',
            iconName: 'github'
        })
    },
    {
        id: 20,
        type: 'bookmark',
        x: 4, y: 7, w: 4, h: 1,
        content: JSON.stringify({
            label: 'Lastboard Documentation',
            url: 'https://github.com/CodigoSH/Lastboard/wiki',
            icon: '',
        })
    },
    {
        id: 21,
        type: 'bookmark',
        x: 9, y: 7, w: 3, h: 1,
        content: JSON.stringify({
            label: 'Official Site',
            url: 'https://codigosh.com',
            iconName: 'globe'
        })
    }
];
