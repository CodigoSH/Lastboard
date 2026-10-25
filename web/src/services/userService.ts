import { apiService } from './apiService';
import { User, MessageResponse } from '../types';
import { ownLabelBody } from './accountAccess';

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
        beta_updates?: boolean,
        unit_system?: string,
        dashboard_background?: string
    }): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/user/preferences', preferences);
    },

    async changePassword(data: unknown): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/user/change-password', data);
    },

    // Admin Methods
    async getUsers(): Promise<User[]> {
        return apiService.get<User[]>('/api/users');
    },

    async createUser(data: unknown): Promise<MessageResponse> {
        return apiService.post<MessageResponse>('/api/users', data);
    },

    async adminUpdateUser(data: unknown): Promise<MessageResponse> {
        return apiService.put<MessageResponse>('/api/users', data);
    },

    /** The administrator naming its own account; a member's label is set by the administrator. */
    async setOwnLabel(label: string): Promise<void> {
        await apiService.put('/api/user/label', ownLabelBody(label));
    },

    async deleteUser(id: number, password?: string): Promise<MessageResponse> {
        if (password) {
            return apiService.post<MessageResponse>('/api/users/delete', { id, admin_password: password });
        }
        return apiService.delete<MessageResponse>(`/api/users?id=${id}`);
    }
};
