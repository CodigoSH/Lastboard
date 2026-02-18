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
    // --- ROW 1-2: Core Info ---
    {
        id: 1,
        type: 'widget',
        x: 1, y: 1, w: 2, h: 1,
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
        x: 1, y: 2, w: 2, h: 1,
        content: JSON.stringify({
            widgetId: 'telemetry',
            interval: 2000
        })
    },
    {
        id: 3,
        type: 'widget',
        x: 3, y: 1, w: 3, h: 2,
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

    // --- ROW 1-2: Project Links (w:2, h:2) ---
    {
        id: 4,
        type: 'section',
        x: 6, y: 1, w: 2, h: 2,
        content: JSON.stringify({ title: 'Project Links' })
    },
    {
        id: 5, parent_id: 4, type: 'bookmark', x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'GitHub', url: 'https://github.com/CodigoSH/Lastboard', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/git.png' })
    },
    {
        id: 6, parent_id: 4, type: 'bookmark', x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Wiki', url: 'https://github.com/CodigoSH/Lastboard/wiki', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/bookstack.png' })
    },

    // --- ROW 1-2: Media Services (w:3, h:2) ---
    {
        id: 7,
        type: 'section',
        x: 8, y: 1, w: 3, h: 2,
        content: JSON.stringify({ title: 'Media Services' })
    },
    {
        id: 8, parent_id: 7, type: 'bookmark', x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Plex', url: 'https://plex.tv', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png' })
    },
    {
        id: 9, parent_id: 7, type: 'bookmark', x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Sonarr', url: 'https://sonarr.tv', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png' })
    },
    {
        id: 10, parent_id: 7, type: 'bookmark', x: 3, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Radarr', url: 'https://radarr.video', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/radarr.png' })
    },
    {
        id: 11, parent_id: 7, type: 'bookmark', x: 1, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Jellyfin', url: 'https://jellyfin.org', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jellyfin.png' })
    },
    {
        id: 12, parent_id: 7, type: 'bookmark', x: 2, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Tautulli', url: 'https://tautulli.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/tautulli.png' })
    },

    // --- ROW 1-3: Infrastructure (w:2, h:3) ---
    {
        id: 13,
        type: 'section',
        x: 11, y: 1, w: 2, h: 3,
        content: JSON.stringify({ title: 'Infrastructure' })
    },
    {
        id: 14, parent_id: 13, type: 'bookmark', x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Proxmox', url: 'https://proxmox.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/proxmox.png' })
    },
    {
        id: 15, parent_id: 13, type: 'bookmark', x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Pi-hole', url: 'https://pi-hole.net', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pi-hole.png' })
    },
    {
        id: 16, parent_id: 13, type: 'bookmark', x: 1, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Home Assistant', url: 'https://home-assistant.io', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png' })
    },
    {
        id: 17, parent_id: 13, type: 'bookmark', x: 2, y: 2, w: 1, h: 1,
        content: JSON.stringify({ label: 'Portainer', url: 'https://portainer.io', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png' })
    },
    {
        id: 18, parent_id: 13, type: 'bookmark', x: 1, y: 3, w: 1, h: 1,
        content: JSON.stringify({ label: 'NPM', url: 'https://nginxproxymanager.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nginx-proxy-manager.png' })
    }
];
