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
    // --- RIGHT SIDEBAR (Col 11-12): Core Widgets (Strict 1x2) ---
    {
        id: 1,
        type: 'widget',
        x: 11, y: 1, w: 2, h: 1,
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
        x: 11, y: 2, w: 2, h: 1,
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
        x: 11, y: 3, w: 2, h: 1,
        content: JSON.stringify({
            widgetId: 'telemetry',
            interval: 2000
        })
    },

    // --- INFRASTRUCTURE (Col 1-5): Vertical Section ---
    {
        id: 4,
        type: 'section',
        x: 1, y: 1, w: 5, h: 2,
        content: JSON.stringify({ title: 'Infrastructure' })
    },
    {
        id: 5, parent_id: 4, type: 'bookmark', x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Proxmox', url: 'https://proxmox.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/proxmox.png' })
    },
    {
        id: 6, parent_id: 4, type: 'bookmark', x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Pi-hole', url: 'https://pi-hole.net', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pi-hole.png' })
    },
    {
        id: 7, parent_id: 4, type: 'bookmark', x: 3, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Home Assistant', url: 'https://home-assistant.io', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png' })
    },
    {
        id: 8, parent_id: 4, type: 'bookmark', x: 4, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Portainer', url: 'https://portainer.io', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png' })
    },
    {
        id: 9, parent_id: 4, type: 'bookmark', x: 5, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'NPM', url: 'https://nginxproxymanager.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nginx-proxy-manager.png' })
    },

    // --- MEDIA (Col 6-10): Vertical Section ---
    {
        id: 10,
        type: 'section',
        x: 6, y: 1, w: 5, h: 2,
        content: JSON.stringify({ title: 'Media Services' })
    },
    {
        id: 11, parent_id: 10, type: 'bookmark', x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Plex', url: 'https://plex.tv', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png' })
    },
    {
        id: 12, parent_id: 10, type: 'bookmark', x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Sonarr', url: 'https://sonarr.tv', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png' })
    },
    {
        id: 13, parent_id: 10, type: 'bookmark', x: 3, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Radarr', url: 'https://radarr.video', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/radarr.png' })
    },
    {
        id: 14, parent_id: 10, type: 'bookmark', x: 4, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Jellyfin', url: 'https://jellyfin.org', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jellyfin.png' })
    },
    {
        id: 15, parent_id: 10, type: 'bookmark', x: 5, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Tautulli', url: 'https://tautulli.com', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/tautulli.png' })
    },

    // --- EXTRA (Col 1-10 Row 3): Horizontal Section ---
    {
        id: 16,
        type: 'section',
        x: 1, y: 3, w: 10, h: 1,
        content: JSON.stringify({ title: 'Project Links' })
    },
    {
        id: 17, parent_id: 16, type: 'bookmark', x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'GitHub', url: 'https://github.com/CodigoSH/Lastboard', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/github.png' })
    },
    {
        id: 18, parent_id: 16, type: 'bookmark', x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({ label: 'Wiki', url: 'https://github.com/CodigoSH/Lastboard/wiki', icon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/bookstack.png' })
    }
];
