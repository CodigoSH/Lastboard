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
        return apiService.patch<MessageResponse>(`/api/dashboard/item/${item.id}`, item);
    },

    async createItem(item: Omit<GridItem, 'id' | 'created_at'>): Promise<GridItem> {
        return apiService.post<GridItem>('/api/dashboard/item', item);
    },

    async deleteItem(id: number): Promise<MessageResponse> {
        return apiService.delete<MessageResponse>(`/api/dashboard/item/${id}`);
    }
};
