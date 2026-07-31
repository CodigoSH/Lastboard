import { DEFAULT_ITEMS, DEFAULT_USER, DEFAULT_DASHBOARDS } from '../config/defaults';
import { Dashboard, GridItem, User } from '../types';
import {
    buildHistory, buildOverviewRow, isCurrentlyDown,
    DemoHistory, DemoOverviewRow,
} from './demoMonitor';

/**
 * Demo Service ("Backend in Browser")
 * Handles data persistence in localStorage specifically for the demo mode.
 * Simulates API responses and networking delay.
 */

// Bump this when the seeded demo content changes so returning visitors get a
// clean reset instead of stale localStorage from a previous version.
const VERSION = 'v11';

const STORAGE_KEY_ITEMS = `lastboard_demo_items_${VERSION}`;
const STORAGE_KEY_USER = `lastboard_demo_user_${VERSION}`;
const STORAGE_KEY_DASHBOARDS = `lastboard_demo_dashboards_${VERSION}`;
const STORAGE_KEY_TIMESTAMP = `lastboard_demo_start_${VERSION}`;
const STORAGE_KEY_MONITOR = `lastboard_demo_monitor_${VERSION}`;

const DEMO_TTL_MS = 3600 * 1000; // 1 Hour
const DEFAULT_DASHBOARD_ID = 1;

/** Monitoring config the demo starts with: 24/7 on, so the feature is visible. */
const DEFAULT_MONITOR_SETTINGS = {
    mode: 'background',
    interval_sec: 300,
    alerts_enabled: true,
    notify_type: 'ntfy',
    notify_url: 'https://ntfy.sh/lastboard-demo',
    notify_token: '',
    fail_threshold: 2,
};

type MonitorSettings = typeof DEFAULT_MONITOR_SETTINGS;

/** A bookmark opted into status checking — the demo's equivalent of a monitor. */
interface DemoMonitoredItem {
    id: number;
    label: string;
    url: string;
}

class DemoService {

    constructor() {
        this.checkTTL();
    }

    /**
     * Checks if the demo session has expired.
     * If expired (> 1 hour) or never seeded, resets all data to defaults.
     */
    private checkTTL() {
        if (!window.LASTBOARD_CONFIG?.demo_mode) return;

        const start = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
        const now = Date.now();

        if (!start || (now - parseInt(start)) > DEMO_TTL_MS) {
            this.resetDemo();
        }
    }

    private resetDemo() {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(DEFAULT_ITEMS));
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEFAULT_USER));
        localStorage.setItem(STORAGE_KEY_DASHBOARDS, JSON.stringify(DEFAULT_DASHBOARDS));
        localStorage.setItem(STORAGE_KEY_MONITOR, JSON.stringify(DEFAULT_MONITOR_SETTINGS));
        localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
    }

    private getItems(): GridItem[] {
        const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
        return stored ? JSON.parse(stored) : DEFAULT_ITEMS;
    }

    private saveItems(items: GridItem[]) {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    }

    private getUser(): User {
        const stored = localStorage.getItem(STORAGE_KEY_USER);
        return stored ? JSON.parse(stored) : DEFAULT_USER;
    }

    private saveUser(user: User) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }

    private getDashboards(): Dashboard[] {
        const stored = localStorage.getItem(STORAGE_KEY_DASHBOARDS);
        return stored ? JSON.parse(stored) : DEFAULT_DASHBOARDS;
    }

    private saveDashboards(dashboards: Dashboard[]) {
        localStorage.setItem(STORAGE_KEY_DASHBOARDS, JSON.stringify(dashboards));
    }

    // --- Simulated API Methods ---

    /** Returns items for a dashboard. Untagged items belong to the default one. */
    async fetchItems(dashboardId?: number): Promise<GridItem[]> {
        await this.simulateDelay();
        const items = this.getItems();
        if (dashboardId == null) return items;
        return items.filter(i => (i.dashboard_id ?? DEFAULT_DASHBOARD_ID) === dashboardId);
    }

    async saveItem(item: GridItem): Promise<GridItem> {
        await this.simulateDelay();
        const items = this.getItems();

        if (item.id) {
            // Update
            const index = items.findIndex(i => i.id === item.id);
            if (index !== -1) items[index] = { ...items[index], ...item };
        } else {
            // Create
            item.id = Date.now(); // Generate fake ID
            items.push(item);
        }

        this.saveItems(items);
        return item;
    }

    async deleteItem(id: number): Promise<void> {
        await this.simulateDelay();
        const items = this.getItems().filter(i => i.id !== id);
        this.saveItems(items);
    }

    async fetchUser(): Promise<User> {
        await this.simulateDelay();
        return this.getUser();
    }

    async updateUser(data: Partial<User>): Promise<void> {
        await this.simulateDelay();
        const user = this.getUser();
        const updated = { ...user, ...data };

        // Ensure preferences object exists
        if (!updated.preferences) {
            updated.preferences = {
                accent_color: 'blue',
                language: 'en',
                theme: 'system',
                grid_columns: 12
            };
        }

        // Sync nested preferences if they exist in the root update
        if (data.accent_color) updated.preferences.accent_color = data.accent_color;
        if (data.language) updated.preferences.language = data.language;
        if (data.project_name) updated.preferences.project_name = data.project_name;

        this.saveUser(updated);
    }

    async updatePreferences(prefs: any): Promise<void> {
        await this.simulateDelay();
        const user = this.getUser();
        user.preferences = { ...user.preferences, ...prefs };

        // Sync back to root properties for consistency
        if (prefs.accent_color) user.accent_color = prefs.accent_color;
        if (prefs.language) user.language = prefs.language;
        if (prefs.project_name) user.project_name = prefs.project_name;
        if (prefs.theme) user.theme = prefs.theme;

        this.saveUser(user);
    }

    // --- Multi-Dashboard (Demo) ---

    async fetchDashboards(): Promise<Dashboard[]> {
        await this.simulateDelay();
        return this.getDashboards().sort((a, b) => a.position - b.position);
    }

    async createDashboard(name: string): Promise<Dashboard> {
        await this.simulateDelay();
        const dashboards = this.getDashboards();
        const dash: Dashboard = {
            id: Date.now(),
            name,
            position: dashboards.length,
            is_default: false,
            created_at: ''
        };
        dashboards.push(dash);
        this.saveDashboards(dashboards);
        return dash;
    }

    async renameDashboard(id: number, name: string): Promise<void> {
        await this.simulateDelay();
        const dashboards = this.getDashboards();
        const dash = dashboards.find(d => d.id === id);
        if (dash) dash.name = name;
        this.saveDashboards(dashboards);
    }

    async deleteDashboard(id: number): Promise<void> {
        await this.simulateDelay();
        let dashboards = this.getDashboards().filter(d => d.id !== id);
        // Ensure at least one default remains
        if (dashboards.length && !dashboards.some(d => d.is_default)) {
            dashboards[0].is_default = true;
        }
        this.saveDashboards(dashboards);
        // Drop the deleted dashboard's items
        this.saveItems(this.getItems().filter(i => (i.dashboard_id ?? DEFAULT_DASHBOARD_ID) !== id));
    }

    async setDefaultDashboard(id: number): Promise<void> {
        await this.simulateDelay();
        const dashboards = this.getDashboards();
        dashboards.forEach(d => { d.is_default = d.id === id; });
        this.saveDashboards(dashboards);
    }

    async reorderDashboards(ids: number[]): Promise<void> {
        await this.simulateDelay();
        const dashboards = this.getDashboards();
        ids.forEach((id, index) => {
            const dash = dashboards.find(d => d.id === id);
            if (dash) dash.position = index;
        });
        this.saveDashboards(dashboards);
    }

    // --- Monitoring (Demo) ---

    /**
     * Bookmarks with status checking enabled, read from the live items so a
     * bookmark the visitor marks becomes a monitor straight away.
     */
    private monitoredItems(): DemoMonitoredItem[] {
        const out: DemoMonitoredItem[] = [];
        for (const item of this.getItems()) {
            if (item.type !== 'bookmark' || !item.content) continue;
            try {
                const c = JSON.parse(item.content);
                if (c.statusCheck && c.url) {
                    out.push({ id: item.id!, label: c.label || c.url, url: c.url });
                }
            } catch { /* malformed content: not a monitor */ }
        }
        return out;
    }

    getMonitorSettings(): MonitorSettings {
        const stored = localStorage.getItem(STORAGE_KEY_MONITOR);
        if (!stored) return { ...DEFAULT_MONITOR_SETTINGS };
        try {
            return { ...DEFAULT_MONITOR_SETTINGS, ...JSON.parse(stored) };
        } catch {
            return { ...DEFAULT_MONITOR_SETTINGS };
        }
    }

    async fetchMonitorSettings(): Promise<MonitorSettings> {
        await this.simulateDelay(120);
        return this.getMonitorSettings();
    }

    /** Persists the config so toggling 24/7 or alerts behaves like the real thing. */
    async saveMonitorSettings(patch: Partial<MonitorSettings>): Promise<MonitorSettings> {
        await this.simulateDelay(120);
        const next = { ...this.getMonitorSettings(), ...patch };
        localStorage.setItem(STORAGE_KEY_MONITOR, JSON.stringify(next));
        return next;
    }

    async fetchMonitorOverview(): Promise<DemoOverviewRow[]> {
        await this.simulateDelay(200);
        if (this.getMonitorSettings().mode === 'off') return [];
        const now = Date.now();
        return this.monitoredItems().map(m => buildOverviewRow(m.id, m.label, now));
    }

    async fetchMonitorHistory(itemId: number, range: string): Promise<DemoHistory> {
        await this.simulateDelay(200);
        const item = this.monitoredItems().find(m => m.id === itemId);
        return buildHistory(itemId, item?.label || '', range, Date.now());
    }

    /**
     * Health map for the ping batch, honouring the synthetic outages so a
     * service that the status page reports as down also shows a red dot.
     */
    healthFor(urls: string[]): Record<string, string> {
        const monitors = this.monitoredItems();
        const out: Record<string, string> = {};
        for (const url of urls) {
            const m = monitors.find(x => x.url === url);
            out[url] = m && isCurrentlyDown(m.id, m.label) ? 'down' : 'up';
        }
        return out;
    }

    // --- Helpers ---

    private simulateDelay(ms: number = 300): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const demoService = new DemoService();
