import { dashboardService } from '../services/dashboardService';
import { GridItem } from '../types';

type Listener = (state: DashboardState) => void;

interface DashboardState {
    isEditing: boolean;
    items: GridItem[];
    searchQuery: string;
    isOffline: boolean;
    stats: {
        cpu_usage: number;
        ram_usage: number;
        temperature: number;
    } | null;
}

const STORAGE_KEY = 'kashboard-items';

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
        items: [...INITIAL_ITEMS], // Initialize with mock data
        searchQuery: '',
        isOffline: false,
        stats: null
    };
    private listeners: Listener[] = [];

    constructor() {
        // Try to load from localStorage on initialization
        this.loadFromLocalStorage();
        this.initSocket();
    }

    private initSocket() {
        // Import socketService dynamically to avoid circular dependencies if any
        import('../services/socketService').then(({ socketService }) => {
            socketService.subscribe((stats) => {
                this.state.stats = {
                    cpu_usage: stats.cpu_usage,
                    ram_usage: stats.ram_usage,
                    temperature: stats.temperature
                };
                this.notify();
            });
        });
    }

    private saveToLocalStorage() {
        try {
            // DEBUG: Check for parent_id presence
            const parented = this.state.items.filter(i => i.parent_id !== undefined);
            if (parented.length > 0) {
                console.log('[DashboardStore] Saving items with parent_id:', parented.map(p => ({ id: p.id, parent_id: p.parent_id })));
            } else {
                console.log('[DashboardStore] Saving items: NO PARENT_ID FOUND');
            }

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

    setSearchQuery(query: string) {
        this.state.searchQuery = query.toLowerCase().trim();
        this.notify();
    }

    async fetchItems() {
        try {
            // Try to fetch from backend first
            try {
                const items = await dashboardService.getItems();
                if (Array.isArray(items) && items.length > 0) {
                    // CSH-FIX: Backend might strip parent_id (Go struct missing field?).
                    // We merge local parent_id if backend one is missing.
                    const serializedLocal = localStorage.getItem(STORAGE_KEY);
                    if (serializedLocal) {
                        const localItems = JSON.parse(serializedLocal) as GridItem[];
                        items.forEach(backendItem => {
                            if (backendItem.parent_id === undefined) {
                                const localMatch = localItems.find(l => l.id === backendItem.id);
                                if (localMatch && localMatch.parent_id !== undefined) {
                                    backendItem.parent_id = localMatch.parent_id;
                                    console.log('[DashboardStore] Restored parent_id from local storage for item:', backendItem.id);
                                }
                            }
                        });
                    }

                    this.state.items = items;
                    this.state.isOffline = false;
                    this.saveToLocalStorage();
                    console.log('[DashboardStore] Loaded from backend (merged local parent_id), count:', items.length);
                } else {
                    throw new Error('Backend returned empty or invalid data');
                }
            } catch (apiError) {
                console.log('[DashboardStore] Backend not available, checking localStorage');
                this.state.isOffline = true;

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
            // Use loose equality to handle potential string/number mismatches
            const itemIndex = this.state.items.findIndex(item => item.id == updatedItem.id);

            console.log('[DashboardStore] Updating item', updatedItem.id, 'Found index:', itemIndex);

            if (itemIndex === -1) {
                console.warn('[DashboardStore] Item not found for update:', updatedItem.id);
                return;
            }

            // console.log('[DashboardStore] Updating item Payload:', JSON.stringify(updatedItem));

            const previousItem = { ...this.state.items[itemIndex] };
            this.state.items[itemIndex] = { ...this.state.items[itemIndex], ...updatedItem };
            this.saveToLocalStorage();
            this.notify();

            // Sync with backend
            try {
                await dashboardService.updateItem(updatedItem);
                this.state.isOffline = false;
                this.notify(); // Notify connectivity restore
                console.log('[DashboardStore] Item sync successful');
            } catch (apiError) {
                // Rollback on failure
                console.error('[DashboardStore] Failed to sync item update (offline?), keeping local state', apiError);
                this.state.isOffline = true;
                this.saveToLocalStorage();
                this.notify();
            }
        } catch (error) {
            console.error('[DashboardStore] Error updating item', error);
        }
    }

    /**
     * Specialized action for resizing items.
     * Handles complex logic like reflowing children for sections.
     */
    async resizeItem(id: number, w: number, h: number) {
        const item = this.state.items.find(i => i.id === id);
        if (!item) return;

        console.log(`[DashboardStore] Resizing item ${id} to ${w}x${h}`);

        // 1. Update the Container First
        await this.updateItem({ id, w, h });

        // 2. If it's a section, we MUST reflow children to fit new width
        if (item.type === 'section') {
            // We use 'w' (new width) as the container width
            await this.reflowChildren(id, w);
        }
    }

    private async reflowChildren(parentId: number, containerWidth: number) {
        // Get fresh state
        import('../services/collisionService').then(async ({ collisionService }) => {
            const children = this.state.items
                .filter(b => b.parent_id === parentId)
                .sort((a, b) => (a.y - b.y) || (a.x - b.x));

            if (children.length === 0) return;

            console.log(`[DashboardStore] Reflowing ${children.length} children for parent ${parentId}`);

            const placedItems: { x: number, y: number, w: number, h: number }[] = [];

            for (const child of children) {
                const slot = collisionService.findAvailableSlot(child.w, child.h, placedItems, containerWidth);

                placedItems.push({ x: slot.x, y: slot.y, w: child.w, h: child.h });

                if (child.x !== slot.x || child.y !== slot.y) {
                    console.log(`[DashboardStore] Reflow moving child ${child.id} to ${slot.x},${slot.y}`);
                    // Await each update to ensure sequence (though parallel works too usually)
                    await this.updateItem({
                        id: child.id,
                        x: slot.x,
                        y: slot.y
                    });
                }
            }
        });
    }

    async addItem(newItem: Omit<GridItem, 'id' | 'created_at'>) {
        try {
            console.log('[DashboardStore] Adding item:', newItem);
            this.ensureItemsIsArray();

            // Sync with backend FIRST
            // We wait for the backend to return the real ID to ensure consistency.
            try {
                // Compatibility Fix: Ensure URL is empty string for widgets
                const payload: any = { ...newItem };
                if (payload.type === 'widget' && !payload.url) {
                    payload.url = '';
                }

                const createdItem = await dashboardService.createItem(payload);
                this.state.isOffline = false;

                // Add the REAL item from backend
                this.state.items.push(createdItem);
                console.log('[DashboardStore] Item added (Synced), new length:', this.state.items.length);
                this.saveToLocalStorage();
                this.notify();
            } catch (apiError) {
                // If backend fails, we do NOT add it optimistically for widgets/new items to avoid "ghost" items
                // that can't be saved. Or we can fallback to offline mode if truly offline.
                console.error('[DashboardStore] Failed to add item to backend', apiError);

                // Optional: Show error notification here
                // For now, we fall back to offline mode for robustness ONLY if network error,
                // but if 400 Bad Request, we should abort.
                // Since apiService throws generic errors, we can check message or type if available.
                // For safety in this "Fix" task, we will NOT add it if it fails validation (400).
                // If it's a network error (isOffline usually true), we could allow it,
                // but let's stick to "wait for success" as requested.
            }
        } catch (error) {
            console.error('[DashboardStore] Error adding item', error);
        }
    }

    async deleteItem(id: number) {
        try {
            this.ensureItemsIsArray();

            // Optimistic delete
            // Use loose equality to handle potential string/number mismatches from API
            const itemIndex = this.state.items.findIndex(item => item.id == id);

            console.log('[DashboardStore] Deleting item', id, 'Found index:', itemIndex);

            if (itemIndex === -1) {
                console.warn('[DashboardStore] Item not found for deletion:', id);
                return;
            }

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
