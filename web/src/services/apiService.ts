import { ApiResponse } from '../types';

/**
 * Centalized API Service
 * Handles base URL configuration, headers, and robust error parsing.
 */
class ApiService {
    private baseUrl: string;

    constructor() {
        // Fallback to relative path if no CONFIG is present
        this.baseUrl = window.KASHBOARD_CONFIG?.API_BASE_URL || '';
    }

    private getCsrfToken(): string {
        const match = document.cookie.split('; ').find(c => c.startsWith('csrf_token='));
        return match ? decodeURIComponent(match.split('=')[1]) : '';
    }

    private async request<T>(url: string, options: RequestInit): Promise<T> {
        const fullUrl = `${this.baseUrl}${url}`;
        const method = (options.method || 'GET').toUpperCase();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
            const token = this.getCsrfToken();
            if (token) {
                headers['X-CSRF-Token'] = token;
            }
        }

        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Handle empty responses (like 204 No Content) or empty bodies
            const text = await response.text();
            return text ? JSON.parse(text) : {} as T;
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
