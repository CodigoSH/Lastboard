import { apiService } from './apiService';
import { guardedUpdateBody } from './itemUpdate';
import { GridItem, MessageResponse } from '../types';

/**
 * Dashboard Service
 * Handles grid item management, including coordinate updates and drag-and-drop persistence.
 */
export const dashboardService = {
    async getItems(dashboardId?: number): Promise<GridItem[]> {
        const url = dashboardId !== undefined
            ? `/api/dashboard?dashboard_id=${dashboardId}`
            : '/api/dashboard';
        return apiService.get<GridItem[]>(url);
    },

    async updateItem(item: Partial<GridItem> & { id: number }): Promise<MessageResponse> {
        // Fix for un-nesting: If parent_id is explicitly undefined (meaning set to null/root),
        // we need to signal the backend because JSON.stringify strips undefined fields.
        const payload: any = { ...item };
        if (item.parent_id === undefined && 'parent_id' in item) {
            // Logic: Check if it's REALLY undefined (missing) or explicitly set to undefined/null.
            // TS makes this hard. Use a sentinel or just check logic.
            // But actually, updateItem is usually called with Partial<GridItem>.
            // If caller passed { parent_id: undefined }, it exists in object.
            payload.clear_parent = true;
        }
        return apiService.patch<MessageResponse>(`/api/dashboard/item/${item.id}`, payload);
    },

    /**
     * Saves new content only if the fields named in `expected` still hold what
     * the caller last saw. Rejects with the server's "error.conflict" when they
     * do not, which means somebody else saved in between.
     *
     * Sends the content and nothing else: the rest of an item (position, size)
     * is whatever this browser's copy says, and that copy may be the old one.
     */
    async updateItemGuarded(
        item: { id: number; content: string },
        expected: Record<string, string | null>,
    ): Promise<MessageResponse> {
        return apiService.patch<MessageResponse>(`/api/dashboard/item/${item.id}`, guardedUpdateBody(item, expected));
    },

    async createItem(item: Omit<GridItem, 'id' | 'created_at'>): Promise<GridItem> {
        return apiService.post<GridItem>('/api/dashboard/item', item);
    },

    /**
     * Moves an item to another dashboard, carrying its whole subtree (used for
     * sections). The backend reassigns every descendant in one transaction.
     */
    async moveItem(id: number, payload: { dashboard_id: number; x: number; y: number }): Promise<MessageResponse> {
        return apiService.patch<MessageResponse>(`/api/dashboard/item/${id}/move`, payload);
    },

    async deleteItem(id: number): Promise<MessageResponse> {
        return apiService.delete<MessageResponse>(`/api/dashboard/item/${id}`);
    },

    async checkHealth(url: string): Promise<{ status: string }> {
        return apiService.get<{ status: string }>(`/api/dashboard/health?url=${encodeURIComponent(url)}`);
    },

    async checkHealthBatch(urls: string[]): Promise<Record<string, string>> {
        return apiService.post<Record<string, string>>('/api/dashboard/health/batch', { urls });
    }
};
