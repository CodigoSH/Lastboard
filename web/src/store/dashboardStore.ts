import { dashboardService } from '../services/dashboardService';
import { GridItem } from '../types';

type Listener = (state: DashboardState) => void;

interface DashboardState {
    isEditing: boolean;
    items: GridItem[];
}

const STORAGE_KEY = 'csh-dashboard-items';

// Mock data for initial dashboard state
const INITIAL_ITEMS: GridItem[] = [
    { id: 1, type: 'bookmark', x: 1, y: 1, w: 1, h: 1, content: { label: 'Proxmox', url: '#', icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png', iconName: 'proxmox' } },
    { id: 2, type: 'bookmark', x: 2, y: 1, w: 1, h: 1, content: { label: 'TrueNAS', url: '#', icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/truenas.png', iconName: 'truenas' } },
    { id: 3, type: 'bookmark', x: 3, y: 1, w: 1, h: 1, content: { label: 'Cloudflare', url: '#', icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/cloudflare.png', iconName: 'cloudflare' } },
    { id: 4, type: 'bookmark', x: 1, y: 2, w: 1, h: 1, content: { label: 'GitHub', url: '#', icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/github.png', iconName: 'github' } },
    { id: 5, type: 'bookmark', x: 2, y: 2, w: 1, h: 1, content: { label: 'VS Code', url: '#', icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/vscode.png', iconName: 'vscode' } },
    { id: 6, type: 'bookmark', x: 3, y: 2, w: 1, h: 1, content: { label: 'Documentation', url: '#', icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docs.png', iconName: 'docs' } }
];

class DashboardStore {
    private state: DashboardState = {
        isEditing: false,
        items: [...INITIAL_ITEMS] // Initialize with mock data
    };
    private listeners: Listener[] = [];

    constructor() {
        // Try to load from localStorage on initialization
        this.loadFromLocalStorage();
    }

    private saveToLocalStorage() {
        try {
            const serialized = JSON.stringify(this.state.items);
            localStorage.setItem(STORAGE_KEY, serialized);
            console.log('[DashboardStore] Saved to localStorage, count:', this.state.items.length);
        } catch (error) {
            console.error('[DashboardStore] Failed to save to localStorage', error);
        }
    }

    private loadFromLocalStorage() {
        try {
            const serialized = localStorage.getItem(STORAGE_KEY);
            if (serialized) {
                const items = JSON.parse(serialized);
                if (Array.isArray(items) && items.length > 0) {
                    this.state.items = items;
                    console.log('[DashboardStore] Loaded from localStorage, count:', items.length);
                }
            }
        } catch (error) {
            console.error('[DashboardStore] Failed to load from localStorage', error);
        }
    }

    subscribe(listener: Listener) {
        this.listeners.push(listener);
        // Ensure items is always an array before notifying
        this.ensureItemsIsArray();
        // Make a safe copy of state for initial call
        listener({ ...this.state, items: [...this.state.items] });
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private ensureItemsIsArray() {
        // CRITICAL: Ensure this.state.items is ALWAYS an array
        if (!Array.isArray(this.state.items)) {
            console.error('[DashboardStore] CRITICAL: items is not an array, resetting to empty array', typeof this.state.items);
            this.state.items = [];
        }
    }

    private notify() {
        // Ensure items is an array before notifying
        this.ensureItemsIsArray();
        // Always pass a copy with items as array
        const safeCopy = {
            ...this.state,
            items: [...this.state.items]
        };
        this.listeners.forEach(listener => listener(safeCopy));
    }

    setEditMode(isEditing: boolean) {
        this.state.isEditing = isEditing;
        this.notify();
    }

    toggleEditMode() {
        this.setEditMode(!this.state.isEditing);
    }

    async fetchItems() {
        try {
            // Try to fetch from backend first
            try {
                const items = await dashboardService.getItems();
                if (Array.isArray(items) && items.length > 0) {
                    this.state.items = items;
                    this.saveToLocalStorage();
                    console.log('[DashboardStore] Loaded from backend, count:', items.length);
                } else {
                    throw new Error('Backend returned empty or invalid data');
                }
            } catch (apiError) {
                console.log('[DashboardStore] Backend not available, checking localStorage');

                // Try localStorage next
                const serialized = localStorage.getItem(STORAGE_KEY);
                if (serialized) {
                    const storedItems = JSON.parse(serialized);
                    if (Array.isArray(storedItems) && storedItems.length > 0) {
                        this.state.items = storedItems;
                        console.log('[DashboardStore] Loaded from localStorage, count:', storedItems.length);
                    } else {
                        // Last resort: use initial mock data
                        this.state.items = [...INITIAL_ITEMS];
                        this.saveToLocalStorage();
                        console.log('[DashboardStore] Using initial mock data');
                    }
                } else {
                    // No localStorage, use initial mock data
                    this.state.items = [...INITIAL_ITEMS];
                    this.saveToLocalStorage();
                    console.log('[DashboardStore] First run, using initial mock data');
                }
            }
            this.ensureItemsIsArray();
            this.notify();
        } catch (error) {
            console.error('[DashboardStore] Failed to fetch dashboard items', error);
            this.state.items = [];
        }
    }

    async updateItem(updatedItem: Partial<GridItem> & { id: number }) {
        try {
            this.ensureItemsIsArray();

            // Optimistic update
            const itemIndex = this.state.items.findIndex(item => item.id === updatedItem.id);
            if (itemIndex === -1) return;

            const previousItem = { ...this.state.items[itemIndex] };
            this.state.items[itemIndex] = { ...this.state.items[itemIndex], ...updatedItem };
            this.saveToLocalStorage();
            this.notify();

            // Sync with backend
            try {
                await dashboardService.updateItem(updatedItem);
            } catch (apiError) {
                // Rollback on failure
                console.error('[DashboardStore] Failed to sync item update, rolling back', apiError);
                this.state.items[itemIndex] = previousItem;
                this.saveToLocalStorage();
                this.notify();
            }
        } catch (error) {
            console.error('[DashboardStore] Error updating item', error);
        }
    }

    async addItem(newItem: Omit<GridItem, 'id' | 'created_at'>) {
        try {
            console.log('[DashboardStore] Adding item:', newItem);
            this.ensureItemsIsArray();
            console.log('[DashboardStore] Items is array:', Array.isArray(this.state.items), 'Length:', this.state.items.length);

            // Generate temporary ID for optimistic update
            const tempId = Date.now();
            const optimisticItem: GridItem = {
                ...newItem,
                id: tempId,
                created_at: new Date().toISOString()
            };

            // Optimistic update
            this.state.items.push(optimisticItem);
            console.log('[DashboardStore] Item added, new length:', this.state.items.length);
            this.saveToLocalStorage();
            this.notify();

            // Sync with backend
            try {
                const createdItem = await dashboardService.createItem(newItem);
                // Replace temporary item with real item from backend
                const itemIndex = this.state.items.findIndex(item => item.id === tempId);
                if (itemIndex !== -1) {
                    this.state.items[itemIndex] = createdItem;
                    this.saveToLocalStorage();
                    this.notify();
                }
            } catch (apiError) {
                // Backend not available, keep optimistic item with temp ID
                console.log('[DashboardStore] Backend not available, using client-side ID');
            }
        } catch (error) {
            console.error('[DashboardStore] Error adding item', error);
        }
    }

    async deleteItem(id: number) {
        try {
            this.ensureItemsIsArray();

            // Optimistic delete
            const itemIndex = this.state.items.findIndex(item => item.id === id);
            if (itemIndex === -1) return;

            const deletedItem = this.state.items[itemIndex];
            this.state.items.splice(itemIndex, 1);
            this.saveToLocalStorage();
            this.notify();

            // Sync with backend
            try {
                await dashboardService.deleteItem(id);
            } catch (apiError) {
                // Rollback on failure
                console.error('[DashboardStore] Failed to delete item, rolling back', apiError);
                this.state.items.push(deletedItem);
                this.saveToLocalStorage();
                this.notify();
            }
        } catch (error) {
            console.error('[DashboardStore] Error deleting item', error);
        }
    }

    getState() {
        this.ensureItemsIsArray();
        return {
            ...this.state,
            items: [...this.state.items]
        };
    }
}

export const dashboardStore = new DashboardStore();
