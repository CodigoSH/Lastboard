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
    avatar_url: '', // Default avatar
    accent_color: 'blue',
    language: 'en',
    theme: 'dark', // Demo looks best in dark mode
    grid_columns: 12,
    project_name: 'Lastboard Demo',
    beta_updates: false,
    preferences: {
        accent_color: 'blue',
        language: 'en',
        theme: 'dark',
        grid_columns: 12,
        project_name: 'Lastboard Demo',
        beta_updates: false
    }
};

export const DEFAULT_ITEMS: GridItem[] = [
    // --- ZONE 1: HERO (Visual Impact) ---
    {
        id: 1,
        type: 'widget',
        x: 1, y: 1, w: 4, h: 2,
        content: JSON.stringify({
            widgetId: 'clock',
            timezone: 'local',
            format: '24h'
        })
    },
    {
        id: 2,
        type: 'widget',
        x: 5, y: 1, w: 4, h: 2,
        content: JSON.stringify({
            widgetId: 'weather',
            location: 'London',
            units: 'metric'
        })
    },
    {
        id: 3,
        type: 'widget',
        x: 9, y: 1, w: 4, h: 2,
        content: JSON.stringify({
            widgetId: 'telemetry', // Shows fake CPU/RAM in demo
            show_cpu: true,
            show_ram: true
        })
    },

    // --- ZONE 2: WELCOME (Information) ---
    {
        id: 4,
        type: 'widget',
        x: 1, y: 3, w: 6, h: 4,
        content: JSON.stringify({
            widgetId: 'markdown',
            title: 'Welcome to Lastboard',
            content: `## 👋 Welcome to the Demo!
            
Lastboard is a modern, privacy-focused dashboard for your homelab.

**Key Features:**
- 🎨 **Glassmorphism Design**: Sleek and modern UI.
- ⚡ **Fast & Lightweight**: Built with Go and Vanilla JS.
- 🔒 **Secure**: Private by default.
- 🐳 **Docker Ready**: Easy to deploy.

*Try moving widgets around! This demo runs entirely in your browser.*`
        })
    },

    // --- ZONE 3: HOMELAB (Technical Bookmarks) ---
    {
        id: 5,
        type: 'section',
        x: 7, y: 3, w: 6, h: 4,
        content: JSON.stringify({ title: 'My Homelab' })
    },
    // Bookmarks inside Section (parent_id: 5)
    {
        id: 6,
        parent_id: 5,
        type: 'bookmark',
        x: 1, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Home Assistant',
            url: 'https://www.home-assistant.io',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/home-assistant.png',
            iconName: 'home-assistant'
        })
    },
    {
        id: 7,
        parent_id: 5,
        type: 'bookmark',
        x: 2, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Plex',
            url: 'https://www.plex.tv',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png',
            iconName: 'plex'
        })
    },
    {
        id: 8,
        parent_id: 5,
        type: 'bookmark',
        x: 3, y: 1, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Portainer',
            url: 'https://www.portainer.io',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/portainer.png',
            iconName: 'portainer'
        })
    },
    {
        id: 9,
        parent_id: 5,
        type: 'bookmark',
        x: 1, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Docker',
            url: 'https://www.docker.com',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png',
            iconName: 'docker'
        })
    },
    {
        id: 10,
        parent_id: 5,
        type: 'bookmark',
        x: 2, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Pi-hole',
            url: 'https://pi-hole.net',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/pi-hole.png',
            iconName: 'pi-hole'
        })
    },
    {
        id: 11,
        parent_id: 5,
        type: 'bookmark',
        x: 3, y: 2, w: 1, h: 1,
        content: JSON.stringify({
            label: 'Grafana',
            url: 'https://grafana.com',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/grafana.png',
            iconName: 'grafana'
        })
    },

    // --- ZONE 4: DAILY (Productivity) ---
    {
        id: 12,
        type: 'bookmark',
        x: 1, y: 7, w: 2, h: 1,
        content: JSON.stringify({
            label: 'GitHub',
            url: 'https://github.com/CodigoSH/Lastboard',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/github.png',
            iconName: 'github'
        })
    },
    {
        id: 13,
        type: 'bookmark',
        x: 3, y: 7, w: 2, h: 1,
        content: JSON.stringify({
            label: 'YouTube',
            url: 'https://youtube.com',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/youtube.png',
            iconName: 'youtube'
        })
    },
    {
        id: 14,
        type: 'bookmark',
        x: 5, y: 7, w: 2, h: 1,
        content: JSON.stringify({
            label: 'ChatGPT',
            url: 'https://chat.openai.com',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/openai.png',
            iconName: 'openai'
        })
    }
];
