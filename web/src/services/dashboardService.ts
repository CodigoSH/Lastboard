import { apiService } from './apiService';
import { GridItem, MessageResponse } from '../types';

/**
 * Dashboard Service
 * Handles grid item management, including coordinate updates and drag-and-drop persistence.
 */
export const dashboardService = {
    async getItems(): Promise<GridItem[]> {
        return apiService.get<GridItem[]>('/api/dashboard');
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

    async createItem(item: Omit<GridItem, 'id' | 'created_at'>): Promise<GridItem> {
        return apiService.post<GridItem>('/api/dashboard/item', item);
    },

    async deleteItem(id: number): Promise<MessageResponse> {
        return apiService.delete<MessageResponse>(`/api/dashboard/item/${id}`);
    },

    async checkHealth(url: string): Promise<{ status: string }> {
        return apiService.get<{ status: string }>(`/api/dashboard/health?url=${encodeURIComponent(url)}`);
    }
};
