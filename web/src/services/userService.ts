import { api } from './api';

interface User {
    username?: string;
    initials?: string;
    role?: string;
    preferences?: any;
    avatar_url?: string;
}

/**
 * User Service
 * Isolates user-related API interactions and business logic.
 */
export const userService = {
    async getCurrentUser(): Promise<User> {
        return api.get('/api/me');
    },

    async updateProfile(data: Partial<User>): Promise<User> {
        return api.patch('/api/user/me', data);
    },

    async syncPreferences(preferences: any): Promise<any> {
        return api.post('/api/user/preferences', preferences);
    }
};
