import { ApiResponse } from '../types';

/**
 * Centalized API Service
 * Handles base URL configuration, headers, and robust error parsing.
 */
class ApiService {
    private baseUrl: string;

    constructor() {
        // Fallback to relative path if no CONFIG is present
        this.baseUrl = window.CSH_CONFIG?.API_BASE_URL || '';
    }

    private async request<T>(url: string, options: RequestInit): Promise<T> {
        const fullUrl = `${this.baseUrl}${url}`;

        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[ApiService] Request failed: ${fullUrl}`, error);
            // Re-throw to be handled by store/component
            throw error;
        }
    }

    async get<T>(url: string): Promise<T> {
        return this.request<T>(url, { method: 'GET' });
    }

    async post<T>(url: string, data: any): Promise<T> {
        return this.request<T>(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async patch<T>(url: string, data: any): Promise<T> {
        return this.request<T>(url, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async put<T>(url: string, data: any): Promise<T> {
        return this.request<T>(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(url: string): Promise<T> {
        return this.request<T>(url, { method: 'DELETE' });
    }
}

export const apiService = new ApiService();
