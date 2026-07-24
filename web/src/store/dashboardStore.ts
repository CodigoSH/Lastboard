import { dashboardService } from '../services/dashboardService';
import { demoService } from '../services/demoService';
import { Dashboard, GridItem } from '../types';

type Listener = (state: DashboardState) => void;

interface DashboardState {
    isEditing: boolean;
    selectMode: boolean;
    selectedIds: number[];
    items: GridItem[];
    searchQuery: string;
    isOffline: boolean;
    updateAvailable: boolean;
    loading: boolean;
    stats: {
        cpu_usage: number;
        ram_usage: number;
        temperature: number;
    } | null;
    availableWidth: number;
    gridColumns: number;
    dashboards: Dashboard[];
    currentDashboardId: number | null;
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
            url: 'https://git.codigosh.com/CodigoSH/Lastboard',
            icon: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/git.webp',
            iconName: 'git'
        }
    }
];

class DashboardStore {
    private state: DashboardState = {
        isEditing: false,
        selectMode: false,
        selectedIds: [],
        items: [],
        searchQuery: '',
        isOffline: false,
        updateAvailable: false,
        loading: true,
        stats: null,
        availableWidth: 1200, // Default fallback
        gridColumns: 12,
        dashboards: [],
        currentDashboardId: null
    };
    private listeners: Listener[] = [];
    private _addItemQueue: Promise<void> = Promise.resolve();
    private userId: number = 0;

    // Returns a cache key scoped to the authenticated user and the active dashboard.
    // Falls back to 'default' when currentDashboardId is not yet known to prevent
    // stale data from one dashboard bleeding into another.
    private getStorageKey(): string {
        const dash = this.state.currentDashboardId ?? 'default';
        return this.userId ? `lastboard-items-${this.userId}-${dash}` : 'lastboard-items';
    }

    // Called from index.ts after userStore.fetchUser() resolves.  Scopes the
    // localStorage cache to this user so that a different user logging into
    // the same browser never sees stale items.
    setUserId(id: number) {
        this.userId = id;
    }

    // Returns true when running in pure-frontend demo mode (no real backend used).
    private isDemo(): boolean {
        return window.LASTBOARD_CONFIG?.demo_mode === true;
    }

    constructor() {
        // Item cache is NOT pre-loaded here — it may contain another user's
        // data.  fetchItems() loads the correct set from the backend and uses
        // a user-scoped cache key for the offline fallback.
        // Skip backend connections in demo mode (all data is in localStorage)
        if (!this.isDemo()) {
            this.initSocket();
            this.checkSystemUpdate();
        } else {
            this.startDemoStats();
        }
    }

    // In demo mode there is no backend WebSocket, so the Telemetry widget would
    // sit at 0. Feed it a gentle synthetic random-walk so visitors see the
    // widget working. Real installs never call this (guarded by isDemo()).
    private startDemoStats() {
        let cpu = 22, ram = 48, temp = 46;
        const step = (v: number, min: number, max: number, amp: number) => {
            v += (Math.random() - 0.5) * amp;
            return Math.max(min, Math.min(max, v));
        };
        const tick = () => {
            cpu = step(cpu, 6, 72, 10);
            ram = step(ram, 38, 70, 5);
            temp = step(temp, 40, 60, 3);
            this.state.stats = {
                cpu_usage: cpu,
                ram_usage: ram,
                temperature: temp
            };
            this.notify();
        };
        tick();
        setInterval(tick, 2000);
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


            socketService.subscribeNotification((type) => {
                if (type === 'update_available') {
                    this.checkSystemUpdate(); // Re-validate with user preferences (beta toggle)
                }
            });
        });
    }

    private async checkSystemUpdate() {
        try {
            // Delay slightly to ensure user prefs are loaded
            setTimeout(async () => {
                const { userStore } = await import('./userStore');
                const { updateService } = await import('../services/UpdateService');

                const user = userStore.getUser();
                const betaUpdates = user?.preferences?.beta_updates || false;

                const info = await updateService.check(betaUpdates);
                if (info.available) {
                    this.state.updateAvailable = true;
                    this.notify();
                }
            }, 2000);
        } catch (e) {
            // fail silently
        }
    }

    private saveToLocalStorage() {
        try {
            const serialized = JSON.stringify(this.state.items);
            localStorage.setItem(this.getStorageKey(), serialized);
        } catch (error: any) {
            console.error('[DashboardStore] Failed to save to localStorage', error);
            // Emergency cleanup if quota exceeded
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                this.sanitizeStorage();
            }
        }
    }

    private sanitizeStorage() {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Cleanup legacy/temporary cache keys
                if (key && (key.includes('user_cache') || key.includes('old_dashboard_'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) { }
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
            return { ...item, content: contentCopy, status: item.status };
        });
    }

    // Set item status without syncing to backend (transient state)
    setItemStatus(id: number, status: 'up' | 'down' | 'pending') {
        const itemIndex = this.state.items.findIndex(item => item.id === id);
        if (itemIndex === -1) return;

        // Only notify if status actually changed to prevent excessive re-renders
        if (this.state.items[itemIndex].status === status) return;

        this.state.items[itemIndex].status = status;
        this.notify();
    }

    /**
     * Batch update multiple item statuses with only ONE notification.
     * Crucial for performance during mass pings (e.g. 50+ bookmarks).
     */
    setItemStatuses(updates: { id: number, status: 'up' | 'down' | 'pending' }[]) {
        let hasChanged = false;
        
        updates.forEach(update => {
            const itemIndex = this.state.items.findIndex(item => item.id === update.id);
            if (itemIndex !== -1) {
                if (this.state.items[itemIndex].status !== update.status) {
                    this.state.items[itemIndex].status = update.status;
                    hasChanged = true;
                }
            }
        });

        if (hasChanged) {
            this.notify();
        }
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
        // Selection is an edit-mode concept; leaving edit mode ends it.
        if (!isEditing) {
            this.state.selectMode = false;
            this.state.selectedIds = [];
        }
        this.notify();
    }

    toggleEditMode() {
        this.setEditMode(!this.state.isEditing);
    }

    setSelectMode(on: boolean) {
        if (this.state.selectMode === on) return;
        this.state.selectMode = on;
        if (!on) this.state.selectedIds = [];
        this.notify();
    }

    toggleSelectMode() {
        this.setSelectMode(!this.state.selectMode);
    }

    toggleSelectedItem(id: number) {
        this.state.selectedIds = this.state.selectedIds.includes(id)
            ? this.state.selectedIds.filter(x => x !== id)
            : [...this.state.selectedIds, id];
        this.notify();
    }

    clearSelectedItems() {
        if (!this.state.selectedIds.length) return;
        this.state.selectedIds = [];
        this.notify();
    }

    setSearchQuery(query: string) {
        this.state.searchQuery = query.toLowerCase().trim();
        this.notify();
    }

    setGridMetrics(width: number, columns: number) {
        if (width === this.state.availableWidth && columns === this.state.gridColumns) return;
        this.state.availableWidth = width;
        this.state.gridColumns = columns;

        this.notify();
    }

    async fetchItems() {
        // --- DEMO MODE: use localStorage via demoService ---
        if (this.isDemo()) {
            const items = await demoService.fetchItems(this.state.currentDashboardId ?? undefined);
            this.state.items = items;
            this.state.loading = false;
            this.notify();
            return;
        }

        // 1. STALE: Try to load from localStorage immediately for instant UI
        const cached = localStorage.getItem(this.getStorageKey());
        if (cached) {
            try {
                const storedItems = JSON.parse(cached);
                if (Array.isArray(storedItems) && storedItems.length > 0) {
                    this.state.items = storedItems;
                    this.state.loading = false; // We have data, even if stale
                    this.notify();
                }
            } catch (e) {
                console.warn('[DashboardStore] Failed to parse cached items', e);
            }
        }

        // 2. REVALIDATE: Fetch from backend in background
        try {
            const items = await dashboardService.getItems(
                this.state.currentDashboardId ?? undefined
            );
            if (Array.isArray(items)) {
                // Preserve transient ping status — the backend never stores it.
                // Without this, every background revalidation wipes the green dots.
                const statusMap = new Map(this.state.items.map(i => [i.id, i.status]));
                const merged = items.map(item => ({
                    ...item,
                    status: statusMap.get(item.id) ?? item.status
                }));

                // Exclude status from the change comparison — it is UI-only state
                // and comparing it against fresh backend items always shows as changed.
                const strip = (arr: typeof items) => arr.map(({ status, ...rest }) => rest);
                const hasChanged = JSON.stringify(strip(this.state.items)) !== JSON.stringify(strip(merged));

                this.state.items = merged;
                this.state.isOffline = false;
                this.state.loading = false;
                this.saveToLocalStorage();

                if (hasChanged) {
                    this.notify();
                }
            } else {
                throw new Error('Backend returned invalid data');
            }
        } catch (apiError) {
            console.error('[DashboardStore] API fetch failed', apiError);
            this.state.isOffline = true;
            this.state.loading = false;

            // If we don't even have cache, fallback to mock
            if (this.state.items.length === 0) {
                this.state.items = [...INITIAL_ITEMS];
                this.saveToLocalStorage();
                this.notify();
            } else {
                this.notify(); // Notify so UI knows we're done (offline)
            }
        }
    }

    async updateItem(updatedItem: Partial<GridItem> & { id: number }) {
        // --- DEMO MODE ---
        if (this.isDemo()) {
            const itemIndex = this.state.items.findIndex(item => item.id === updatedItem.id);
            if (itemIndex !== -1) {
                this.state.items[itemIndex] = { ...this.state.items[itemIndex], ...updatedItem };
                await demoService.saveItem(this.state.items[itemIndex]);
                this.notify();
            }
            return;
        }

        try {
            this.ensureItemsIsArray();

            // Optimistic update
            const itemIndex = this.state.items.findIndex(item => item.id === updatedItem.id);

            if (itemIndex === -1) {
                console.warn('[DashboardStore] Item not found for update:', updatedItem.id);
                return;
            }

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
     * Moves an item to another dashboard. Fetches the target board's items,
     * auto-places the item there (compact, collision-free), persists the new
     * dashboard_id + x/y (and detaches from its parent if it was nested), then
     * drops it from the current board's view. Returns true on success.
     */
    async moveItemToDashboard(itemId: number, targetDashboardId: number, gridCols: number = 12): Promise<boolean> {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) return false;
        if (targetDashboardId === this.state.currentDashboardId) return false;

        // A section takes its whole subtree; a plain item is just itself.
        const subtreeIds = this._collectSubtreeIds(itemId);

        // --- DEMO MODE ---
        if (this.isDemo()) {
            for (const id of subtreeIds) {
                const it = this.state.items.find(i => i.id === id);
                if (it) {
                    await demoService.saveItem({
                        ...it,
                        dashboard_id: targetDashboardId,
                        parent_id: id === itemId ? undefined : it.parent_id,
                    });
                }
            }
            this.state.items = this.state.items.filter(i => !subtreeIds.has(i.id));
            this.notify();
            return true;
        }

        try {
            const { collisionService } = await import('../services/collisionService');
            // Auto-place against the TARGET board's root items.
            const targetItems = await dashboardService.getItems(targetDashboardId);
            const rootItems = targetItems.filter(i => i.parent_id == null);
            const pos = collisionService.findCompactPosition(item.w || 1, item.h || 1, rootItems, gridCols);

            if (item.type === 'section') {
                // Sections move as a subtree through the dedicated atomic endpoint.
                await dashboardService.moveItem(itemId, { dashboard_id: targetDashboardId, x: pos.x, y: pos.y });
            } else {
                const update: Partial<GridItem> & { id: number } = {
                    id: itemId,
                    dashboard_id: targetDashboardId,
                    x: pos.x,
                    y: pos.y,
                };
                // Leaving a section: detach from the parent that stays behind
                // (parent_id: undefined signals clear_parent to the backend).
                if (item.parent_id != null) {
                    update.parent_id = undefined;
                }
                await dashboardService.updateItem(update);
            }

            this.state.items = this.state.items.filter(i => !subtreeIds.has(i.id));
            this.state.isOffline = false;
            this.saveToLocalStorage();
            this.notify();
            return true;
        } catch (apiError) {
            console.error('[DashboardStore] Failed to move item to dashboard', apiError);
            this.state.isOffline = true;
            this.notify();
            return false;
        }
    }

    /**
     * Moves several items to another dashboard in one action. Items whose
     * ancestor is also selected are skipped (a moved section already carries its
     * children). Each remaining top-level item is moved in turn — placement
     * accounts for the ones moved just before it. Returns how many were moved.
     */
    async moveItemsToDashboard(ids: number[], targetDashboardId: number, gridCols: number = 12): Promise<number> {
        if (targetDashboardId === this.state.currentDashboardId) return 0;

        const idSet = new Set(ids);
        const topLevel = ids.filter(id => {
            const it = this.state.items.find(i => i.id === id);
            if (!it) return false;
            // Drop it if any ancestor is also in the selection.
            let p = it.parent_id ?? null;
            while (p != null) {
                if (idSet.has(p)) return false;
                p = this.state.items.find(i => i.id === p)?.parent_id ?? null;
            }
            return true;
        });

        let moved = 0;
        for (const id of topLevel) {
            if (await this.moveItemToDashboard(id, targetDashboardId, gridCols)) moved++;
        }
        return moved;
    }

    /** Collects an item id together with every descendant id (any depth). */
    private _collectSubtreeIds(rootId: number): Set<number> {
        const ids = new Set<number>([rootId]);
        let added = true;
        while (added) {
            added = false;
            for (const it of this.state.items) {
                if (it.parent_id != null && ids.has(it.parent_id) && !ids.has(it.id)) {
                    ids.add(it.id);
                    added = true;
                }
            }
        }
        return ids;
    }

    /**
     * Specialized action for resizing items.
     * Handles complex logic like reflowing children for sections.
     */
    async resizeItem(id: number, w: number, h: number) {
        const item = this.state.items.find(i => i.id === id);
        if (!item) return;

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

        const placedItems: { x: number, y: number, w: number, h: number }[] = [];

        for (const child of children) {
            const slot = collisionService.findAvailableSlot(child.w, child.h, placedItems, containerWidth);

            placedItems.push({ x: slot.x, y: slot.y, w: child.w, h: child.h });

            if (child.x !== slot.x || child.y !== slot.y) {
                await this.updateItem({
                    id: child.id,
                    x: slot.x,
                    y: slot.y
                });
            }
        }
    }

    async addItem(newItem: Omit<GridItem, 'id' | 'created_at'>): Promise<GridItem | undefined> {
        // --- DEMO MODE ---
        if (this.isDemo()) {
            const tagged = { ...newItem } as GridItem;
            // Tag with the active dashboard so new items stay on the right one.
            if (this.state.currentDashboardId != null && tagged.dashboard_id == null) {
                tagged.dashboard_id = this.state.currentDashboardId;
            }
            const createdItem = await demoService.saveItem(tagged);
            this.state.items.push(createdItem);
            this.notify();
            return createdItem;
        }

        // Serialize concurrent addItem calls so collision detection always reads
        // the up-to-date items array and two rapid adds never land on the same slot.
        const prev = this._addItemQueue;
        let resolveCurrent!: () => void;
        this._addItemQueue = new Promise(r => { resolveCurrent = r; });
        await prev;

        try {
            this.ensureItemsIsArray();

            // Sync with backend FIRST
            // We wait for the backend to return the real ID to ensure consistency.
            try {
                // Compatibility Fix: Ensure URL is empty string for widgets
                const payload: any = { ...newItem };
                if (payload.type === 'widget' && !payload.url) {
                    payload.url = '';
                }

                // Always tag the item with the active dashboard so it is never
                // stored as NULL and cannot bleed into other dashboards.
                if (this.state.currentDashboardId !== null) {
                    payload.dashboard_id = this.state.currentDashboardId;
                }


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
                    const slot = collisionService.findCompactPosition(payload.w || 1, payload.h || 1, this.state.items, gridWidth);
                    payload.x = slot.x;
                    payload.y = slot.y;
                }

                const createdItem = await dashboardService.createItem(payload);
                this.state.isOffline = false;

                // Add the REAL item from backend
                this.state.items.push(createdItem);
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
        } finally {
            resolveCurrent();
        }
    }




    async deleteItem(id: number) {
        // --- DEMO MODE ---
        if (this.isDemo()) {
            this.state.items = this.state.items.filter(item => item.id !== id);
            await demoService.deleteItem(id);
            this.notify();
            return;
        }

        try {
            this.ensureItemsIsArray();

            // Optimistic delete
            const itemIndex = this.state.items.findIndex(item => item.id === id);

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

    // ── Multi-Dashboard ────────────────────────────────────────────────────────

    /**
     * Fetches all dashboards for the current user.
     * If no dashboard is selected yet, auto-selects the default (or first) one.
     */
    async fetchDashboards(): Promise<void> {
        const { multiDashboardService } = await import('../services/multiDashboardService');
        const raw = await multiDashboardService.getAll();
        const result = Array.isArray(raw) ? raw : [];
        this.state.dashboards = result;

        if (this.state.currentDashboardId === null && result.length > 0) {
            // Priority: Default flag (synced from last session on any device) > First item
            const defaultDash = result.find(d => d.is_default) ?? result[0];
            this.state.currentDashboardId = defaultDash.id;

            // Remove the stale "default" catch-all key now that we have a real dashboard ID.
            // Without this, fetchItems() would read old content from a previous dashboard
            // on the next page load if the order of fetches ever changed.
            if (this.userId) {
                localStorage.removeItem(`lastboard-items-${this.userId}-default`);
            }
        }

        this.notify();
    }

    /**
     * Switches the active dashboard, clears the item cache, and re-fetches items.
     */
    async switchDashboard(id: number): Promise<void> {
        this.state.currentDashboardId = id;
        this.state.items = [];
        this.state.loading = true;
        this.notify();

        // 1. Persist choice universally to the backend
        const { multiDashboardService } = await import('../services/multiDashboardService');
        multiDashboardService.setDefault(id).catch(err => {
            console.warn('[DashboardStore] Failed to sync default dashboard to backend', err);
        });

        // 2. Load items for the new dashboard
        await this.fetchItems();
    }

    /**
     * Creates a new dashboard and refreshes the list.
     * Does NOT auto-switch to it.
     */
    async createDashboard(name: string): Promise<Dashboard> {
        const { multiDashboardService } = await import('../services/multiDashboardService');
        const newDash = await multiDashboardService.create(name);
        await this.fetchDashboards();
        return newDash;
    }

    /**
     * Renames a dashboard.
     */
    async renameDashboard(id: number, name: string): Promise<void> {
        const { multiDashboardService } = await import('../services/multiDashboardService');
        await multiDashboardService.rename(id, name);
        await this.fetchDashboards();
    }

    /**
     * Deletes a dashboard.
     * If the deleted dashboard is the currently active one, switches to the new default.
     */
    async deleteDashboard(id: number): Promise<void> {
        const { multiDashboardService } = await import('../services/multiDashboardService');
        await multiDashboardService.delete(id);

        if (this.state.currentDashboardId === id) {
            await this.fetchDashboards();
            const newDefault = this.state.dashboards.find(d => d.is_default) ?? this.state.dashboards[0];
            if (newDefault) {
                await this.switchDashboard(newDefault.id);
            }
        } else {
            await this.fetchDashboards();
        }
    }

    /**
     * Saves a new order for the dashboards list.
     */
    async reorderDashboards(ids: number[]): Promise<void> {
        const { multiDashboardService } = await import('../services/multiDashboardService');
        await multiDashboardService.reorder(ids);
        await this.fetchDashboards();
    }
}

export const dashboardStore = new DashboardStore();
