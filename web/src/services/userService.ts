import { apiService } from './apiService';
import { User, MessageResponse } from '../types';

/**
 * User Service
 * Bridges the backend Go logic with the frontend state.
 */
export const userService = {
    async getCurrentUser(): Promise<User> {
        return apiService.get<User>('/api/me');
    },

    async updateProfile(data: Partial<User>): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/user/update-profile', data);
    },

    async updatePreferences(preferences: {
        accent_color?: string,
        language?: string,
        theme?: string,
        widget_min_width?: number,
        project_name?: string,
        beta_updates?: boolean
    }): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/user/preferences', preferences);
    },

    async changePassword(data: any): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/user/change-password', data);
    },

    // Admin Methods
    async getUsers(): Promise<User[]> {
        return apiService.get<User[]>('/api/users');
    },

    async createUser(data: any): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/users', data);
    },

    async adminUpdateUser(data: any): Promise<MessageResponse> {
        return apiService.put<MessageResponse>('/api/users', data);
    },

    async deleteUser(id: number): Promise<MessageResponse> {
        return apiService.delete<MessageResponse>(`/api/users?id=${id}`);
    }
};
