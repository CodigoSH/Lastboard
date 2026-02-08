import { dashboardService } from '../services/dashboardService';
import { GridItem } from '../types';

type Listener = (state: DashboardState) => void;

interface DashboardState {
    isEditing: boolean;
    items: GridItem[];
    searchQuery: string;
    isOffline: boolean;
    updateAvailable: boolean;
    stats: {
        cpu_usage: number;
        ram_usage: number;
        temperature: number;
    } | null;
    availableWidth: number;
    gridColumns: number;
}

// Mock data used only as a last-resort offline fallback when no user-scoped
// cache exists AND the backend is unreachable.
const INITIAL_ITEMS: GridItem[] = [
    {
        id: 1,
        type: 'bookmark',
        x: 1, y: 1, w: 1, h: 1,
        content: {
            label: 'CodigoSH',
            url: 'https://github.com/CodigoSH/Lastboard',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/git.png',
            iconName: 'git'
        }
    }
];

class DashboardStore {
    private state: DashboardState = {
        isEditing: false,
        items: [],
        searchQuery: '',
        isOffline: false,
        updateAvailable: false,
        stats: null,
        availableWidth: 1200, // Default fallback
        gridColumns: 12
    };
    private listeners: Listener[] = [];
    private userId: number = 0;

    // Returns a cache key scoped to the authenticated user.  Falls back to
    // the legacy unscoped key before setUserId() is called (edge case).
    private getStorageKey(): string {
        return this.userId ? `lastboard-items-${this.userId}` : 'lastboard-items';
    }

    // Called from index.ts after userStore.fetchUser() resolves.  Scopes the
    // localStorage cache to this user so that a different user logging into
    // the same browser never sees stale items.
    setUserId(id: number) {
        this.userId = id;
    }

    constructor() {
        // Item cache is NOT pre-loaded here — it may contain another user's
        // data.  fetchItems() loads the correct set from the backend and uses
        // a user-scoped cache key for the offline fallback.
        this.initSocket();
        this.checkSystemUpdate();
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

    private async checkSystemUpdate() {
        try {
            const res = await fetch('/api/system/update/check');
            if (res.ok) {
                const info = await res.json();
                if (info.available) {
                    this.state.updateAvailable = true;
                    this.notify();
                }
            }
        } catch (e) {
            // fail silently
        }
    }

    private saveToLocalStorage() {
        try {
            const serialized = JSON.stringify(this.state.items);
            localStorage.setItem(this.getStorageKey(), serialized);
        } catch (error) {
            console.error('[DashboardStore] Failed to save to localStorage', error);
        }
    }

    private loadFromLocalStorage() {
        try {
            const serialized = localStorage.getItem(this.getStorageKey());
            if (serialized) {
                const items = JSON.parse(serialized);
                if (Array.isArray(items) && items.length > 0) {
                    this.state.items = items;
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
        // Make a deep copy of state for initial call
        listener({ ...this.state, items: this.deepCopyItems(this.state.items) });
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

    private deepCopyItems(items: GridItem[]): GridItem[] {
        return items.map(item => {
            // Deep copy content if it's an object
            let contentCopy = item.content;
            if (typeof item.content === 'string') {
                try {
                    const parsed = JSON.parse(item.content);
                    if (typeof parsed === 'object' && parsed !== null) {
                        contentCopy = JSON.stringify(parsed);
                    }
                } catch {
                    // Content is not JSON, keep as is
                }
            }
            return { ...item, content: contentCopy };
        });
    }

    private notify() {
        // Ensure items is an array before notifying
        this.ensureItemsIsArray();
        // Always pass a deep copy to prevent mutation
        const safeCopy = {
            ...this.state,
            items: this.deepCopyItems(this.state.items)
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

    setGridMetrics(width: number, columns: number) {
        if (width === this.state.availableWidth && columns === this.state.gridColumns) return;
        this.state.availableWidth = width;
        this.state.gridColumns = columns;
        // Do NOT notify for this? Or strictly for layout reactivity?
        // Layout reactivity is handled by BookmarkGrid calling render().
        // Store notification might trigger full framework update which is heavy.
        // But if other components need it, we should notify.
        // Let's notify. BookmarkGrid should be smart enough not to loop.
        // Actually, BookmarkGrid SUBSCRIBES to this. Updating state triggers notify -> triggers BookmarkGrid.
        // This creates a loop if BookmarkGrid calls setGridMetrics inside its render/resize loop.
        // CAREFUL.
        // BookmarkGrid.ts L80: `dashboardStore.subscribe`.
        // BookmarkGrid updates Metrics on Resize.
        // If it calls store.setGridMetrics -> Store notifies -> BookmarkGrid receives update -> checks changes -> renders.
        // This is safe provided `setGridMetrics` has the equality check above.
        this.notify();
    }

    async fetchItems() {
        try {
            // Try to fetch from backend first
            try {
                const items = await dashboardService.getItems();
                if (Array.isArray(items)) {
                    this.state.items = items;
                    this.state.isOffline = false;
                    this.saveToLocalStorage();
                } else {
                    throw new Error('Backend returned invalid data');
                }
            } catch (apiError) {
                this.state.isOffline = true;

                // Try localStorage next
                const serialized = localStorage.getItem(this.getStorageKey());
                if (serialized) {
                    const storedItems = JSON.parse(serialized);
                    if (Array.isArray(storedItems) && storedItems.length > 0) {
                        this.state.items = storedItems;
                    } else {
                        // Last resort: use initial mock data
                        this.state.items = [...INITIAL_ITEMS];
                        this.saveToLocalStorage();
                    }
                } else {
                    // No localStorage, use initial mock data
                    this.state.items = [...INITIAL_ITEMS];
                    this.saveToLocalStorage();
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

            // console.log('[DashboardStore] Updating item', updatedItem.id, 'Found index:', itemIndex);

            if (itemIndex === -1) {
                console.warn('[DashboardStore] Item not found for update:', updatedItem.id);
                return;
            }

            const previousItem = { ...this.state.items[itemIndex] };
            this.state.items[itemIndex] = { ...this.state.items[itemIndex], ...updatedItem };
            this.saveToLocalStorage();
            this.notify();

            // Sync with backend
            try {
                await dashboardService.updateItem(updatedItem);
                this.state.isOffline = false;
                this.notify(); // Notify connectivity restore
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

        // console.log(`[DashboardStore] Resizing item ${id} to ${w}x${h}`);

        // 1. Update the Container First
        await this.updateItem({ id, w, h });

        // 2. If it's a section, we MUST reflow children to fit new width
        if (item.type === 'section') {
            // We use 'w' (new width) as the container width
            await this.reflowChildren(id, w);
        }
    }

    private async reflowChildren(parentId: number, containerWidth: number) {
        const { collisionService } = await import('../services/collisionService');

        const children = this.state.items
            .filter(b => b.parent_id === parentId)
            .sort((a, b) => (a.y - b.y) || (a.x - b.x));

        if (children.length === 0) return;

        // console.log(`[DashboardStore] Reflowing ${children.length} children for parent ${parentId}`);

        const placedItems: { x: number, y: number, w: number, h: number }[] = [];

        for (const child of children) {
            const slot = collisionService.findAvailableSlot(child.w, child.h, placedItems, containerWidth);

            placedItems.push({ x: slot.x, y: slot.y, w: child.w, h: child.h });

            if (child.x !== slot.x || child.y !== slot.y) {
                // console.log(`[DashboardStore] Reflow moving child ${child.id} to ${slot.x},${slot.y}`);
                await this.updateItem({
                    id: child.id,
                    x: slot.x,
                    y: slot.y
                });
            }
        }
    }

    async addItem(newItem: Omit<GridItem, 'id' | 'created_at'>): Promise<GridItem | undefined> {
        try {
            // console.log('[DashboardStore] Adding item:', newItem);
            this.ensureItemsIsArray();

            // Sync with backend FIRST
            // We wait for the backend to return the real ID to ensure consistency.
            try {
                // Compatibility Fix: Ensure URL is empty string for widgets
                const payload: any = { ...newItem };
                if (payload.type === 'widget' && !payload.url) {
                    payload.url = '';
                }

                // FIX: Use Store state for grid metrics if available, fallback to DOM/Prefs if not ready
                // Dynamic Grid Width Detection
                const { userStore } = await import('./userStore');
                const user = userStore.getUser();
                const prefs = user?.preferences;

                // Priority: State > DOM > Window
                let gridWidth = this.state.gridColumns;

                // Fallback (e.g. initial load before ResizeObserver)
                if (!gridWidth || gridWidth < 1) {
                    const minWidth = prefs?.widget_min_width || 140;
                    const gap = 16;
                    const gridEl = document.querySelector('bookmark-grid');
                    const availableWidth = this.state.availableWidth || gridEl?.clientWidth || window.innerWidth;
                    gridWidth = Math.floor((availableWidth + gap) / (minWidth + gap));
                }

                if (gridWidth < 1) gridWidth = 1;
                if (gridWidth > 24) gridWidth = 24;

                if (!payload.x || !payload.y) {
                    const { collisionService } = await import('../services/collisionService');
                    // We need to pass the CURRENT items to find a slot
                    const slot = collisionService.findFirstAvailableSlot(payload.w || 1, payload.h || 1, this.state.items, gridWidth);
                    payload.x = slot.x;
                    payload.y = slot.y;
                }

                const createdItem = await dashboardService.createItem(payload);
                this.state.isOffline = false;

                // Add the REAL item from backend
                this.state.items.push(createdItem);
                // console.log('[DashboardStore] Item added (Synced), new length:', this.state.items.length);
                this.saveToLocalStorage();
                this.notify();
                return createdItem;
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
                return undefined;
            }
        } catch (error) {
            console.error('[DashboardStore] Error adding item', error);
            return undefined;
        }
    }

    // Legacy reflowGrid removed in favor of CSS Grid auto-fill


    async deleteItem(id: number) {
        try {
            this.ensureItemsIsArray();

            // Optimistic delete
            const itemIndex = this.state.items.findIndex(item => item.id === id);

            // console.log('[DashboardStore] Deleting item', id, 'Found index:', itemIndex);

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
