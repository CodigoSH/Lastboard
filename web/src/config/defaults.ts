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
    // --- ROW 1: System Monitoring ---
    {
        id: 1,
        type: 'widget',
        x: 1, y: 1, w: 3, h: 2,
        content: JSON.stringify({
            widgetId: 'clock',
            timezone: 'local',
            hour12: false,
            showDate: true
        })
    },
    {
        id: 2,
        type: 'widget',
        x: 4, y: 1, w: 3, h: 2,
        content: JSON.stringify({
            widgetId: 'weather',
            city: 'Madrid',
            latitude: 40.4168,
            longitude: -3.7038,
            unit: 'celsius',
            showForecast: true,
            forecastDays: 3
        })
    },
    {
        id: 3,
        type: 'widget',
        x: 7, y: 1, w: 6, h: 2,
        content: JSON.stringify({
            widgetId: 'telemetry',
            interval: 2000
        })
    },

    // --- ROW 3: Media Services (Section) ---
    {
        id: 4,
        type: 'section',
        x: 1, y: 3, w: 6, h: 3,
        content: JSON.stringify({ title: 'Media Services' })
    },
    {
        id: 5, parent_id: 4, type: 'bookmark', x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Plex', url: 'https://plex.tv', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png' })
    },
    {
        id: 6, parent_id: 4, type: 'bookmark', x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Sonarr', url: 'https://sonarr.tv', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png' })
    },
    {
        id: 7, parent_id: 4, type: 'bookmark', x: 3, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Radarr', url: 'https://radarr.video', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/radarr.png' })
    },
    {
        id: 8, parent_id: 4, type: 'bookmark', x: 1, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Jellyfin', url: 'https://jellyfin.org', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jellyfin.png' })
    },
    {
        id: 9, parent_id: 4, type: 'bookmark', x: 2, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Tautulli', url: 'https://tautulli.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/tautulli.png' })
    },
    {
        id: 10, parent_id: 4, type: 'bookmark', x: 3, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Transmission', url: 'https://transmissionbt.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/transmission.png' })
    },

    // --- ROW 3: Infrastructure (Section) ---
    {
        id: 11,
        type: 'section',
        x: 7, y: 3, w: 6, h: 3,
        content: JSON.stringify({ title: 'Infrastructure' })
    },
    {
        id: 12, parent_id: 11, type: 'bookmark', x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Proxmox', url: 'https://proxmox.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/proxmox.png' })
    },
    {
        id: 13, parent_id: 11, type: 'bookmark', x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Portainer', url: 'https://portainer.io', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png' })
    },
    {
        id: 14, parent_id: 11, type: 'bookmark', x: 3, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Pi-hole', url: 'https://pi-hole.net', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pi-hole.png' })
    },
    {
        id: 15, parent_id: 11, type: 'bookmark', x: 1, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Home Assistant', url: 'https://home-assistant.io', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png' })
    },
    {
        id: 16, parent_id: 11, type: 'bookmark', x: 2, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Nginx Proxy Manager', url: 'https://nginxproxymanager.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nginx-proxy-manager.png' })
    },
    {
        id: 17, parent_id: 11, type: 'bookmark', x: 3, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Grafana', url: 'https://grafana.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/grafana.png' })
    },

    // --- ROW 6: Project Links ---
    {
        id: 18,
        type: 'bookmark',
        x: 1, y: 6, w: 3, h: 1,
        content: JSON.stringify({
            label: 'GitHub Repository',
            url: 'https://github.com/CodigoSH/Lastboard',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/github.png'
        })
    },
    {
        id: 19,
        type: 'bookmark',
        x: 4, y: 6, w: 3, h: 1,
        content: JSON.stringify({
            label: 'Project Wiki',
            url: 'https://github.com/CodigoSH/Lastboard/wiki',
            icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/bookstack.png'
        })
    },
    {
        id: 20,
        type: 'bookmark',
        x: 7, y: 6, w: 6, h: 1,
        content: JSON.stringify({
            label: 'CodigoSH Official Site',
            url: 'https://codigosh.com',
            icon: 'https://codigosh.com/favicon.ico'
        })
    }
];
