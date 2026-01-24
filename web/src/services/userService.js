import { api } from './api.js';

/**
 * User Service
 * Isolates user-related API interactions and business logic.
 */
export const userService = {
    async getCurrentUser() {
        return api.get('/api/me');
    },

    async updateProfile(data) {
        return api.patch('/api/user/me', data);
    },

    async syncPreferences(preferences) {
        return api.post('/api/user/preferences', preferences);
    }
};
