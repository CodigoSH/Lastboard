import { apiService } from './apiService';
import { Dashboard } from '../types';

/**
 * Multi-Dashboard Service
 * Handles CRUD operations for dashboards via /api/dashboards.
 */
export const multiDashboardService = {
    async getAll(): Promise<Dashboard[]> {
        return apiService.get<Dashboard[]>('/api/dashboards');
    },

    async create(name: string): Promise<Dashboard> {
        return apiService.post<Dashboard>('/api/dashboards', { name });
    },

    async delete(id: number): Promise<void> {
        await apiService.delete<{ status: string }>(`/api/dashboards/${id}`);
    },

    async rename(id: number, name: string): Promise<void> {
        await apiService.patch<{ status: string }>(`/api/dashboards/${id}`, { name });
    },
    
    async setDefault(id: number): Promise<void> {
        await apiService.post<{ status: string }>(`/api/dashboards/${id}/default`, {});
    },
};
