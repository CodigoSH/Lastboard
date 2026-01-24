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

    async updatePreferences(preferences: { accent_color: string, language: string }): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/user/preferences', preferences);
    },

    async changePassword(data: any): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/user/change-password', data);
    }
};
