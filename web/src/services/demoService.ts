import { DEFAULT_ITEMS, DEFAULT_USER } from '../config/defaults';
import { GridItem, User, ApiResponse } from '../types';

/**
 * Demo Service ("Backend in Browser")
 * Handles data persistence in localStorage specifically for the demo mode.
 * Simulates API responses and networking delay.
 */

const STORAGE_KEY_ITEMS = 'lastboard_demo_items';
const STORAGE_KEY_USER = 'lastboard_demo_user';
const STORAGE_KEY_TIMESTAMP = 'lastboard_demo_start';

const DEMO_TTL_MS = 3600 * 1000; // 1 Hour

class DemoService {

    constructor() {
        this.checkTTL();
    }

    /**
     * Checks if the demo session has expired.
     * If expired (> 1 hour), resets all data to defaults.
     */
    private checkTTL() {
        const start = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
        const now = Date.now();

        if (!start || (now - parseInt(start)) > DEMO_TTL_MS) {
            console.log('[DemoService] Session expired or new. Resetting demo environment.');
            this.resetDemo();
        }
    }

    private resetDemo() {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(DEFAULT_ITEMS));
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEFAULT_USER));
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

    // --- Simulated API Methods ---

    async fetchItems(): Promise<GridItem[]> {
        await this.simulateDelay();
        return this.getItems();
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

    // --- Helpers ---

    private simulateDelay(ms: number = 300): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const demoService = new DemoService();
