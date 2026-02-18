import { ApiResponse } from '../types';

/**
 * Centalized API Service
 * Handles base URL configuration, headers, and robust error parsing.
 */
class ApiService {
    private baseUrl: string;

    constructor() {
        // Fallback to relative path if no CONFIG is present
        this.baseUrl = window.LASTBOARD_CONFIG?.API_BASE_URL || '';
    }

    private getCsrfToken(): string {
        const match = document.cookie.split('; ').find(c => c.startsWith('csrf_token='));
        return match ? decodeURIComponent(match.split('=')[1]) : '';
    }

    private async request<T>(url: string, options: RequestInit): Promise<T> {
        // --- DEMO MODE INTERCEPTION ---
        if (window.LASTBOARD_CONFIG?.demo_mode) {
            const { demoService } = await import('./demoService');
            const method = (options.method || 'GET').toUpperCase();
            const body = options.body ? JSON.parse(options.body as string) : {};

            try {
                // User & Auth
                if (url === '/api/me') return demoService.fetchUser() as any;
                if (url === '/api/user/update-profile') {
                    await demoService.updateUser(body);
                    return { message: 'Profile updated (Demo)' } as any;
                }
                if (url === '/api/user/preferences') {
                    await demoService.updatePreferences(body);
                    return { message: 'Preferences updated (Demo)' } as any;
                }
                if (url === '/api/user/change-password') return { message: 'Password changed (Demo)' } as any;

                // Dashboard Items
                if (url === '/api/dashboard') return demoService.fetchItems() as any;
                if (url.startsWith('/api/dashboard/item') && method === 'POST') {
                    return demoService.saveItem(body) as any;
                }
                if (url.startsWith('/api/dashboard/item/') && method === 'PATCH') {
                    const id = parseInt(url.split('/').pop() || '0');
                    return demoService.saveItem({ ...body, id }) as any;
                }
                if (url.startsWith('/api/dashboard/item/') && method === 'DELETE') {
                    const id = parseInt(url.split('/').pop() || '0');
                    await demoService.deleteItem(id);
                    return { message: 'Item deleted (Demo)' } as any;
                }

                // Health Check (Mock success)
                if (url.startsWith('/api/dashboard/health')) return { status: 200 } as any;

                // Admin (Mock success)
                if (url === '/api/users' && method === 'GET') return [await demoService.fetchUser()] as any;
                if (url === '/api/users') return { message: 'Admin action simulated (Demo)' } as any;

                console.warn('[DemoMode] Unhandled URL, returning empty object:', url);
                return {} as T;
            } catch (e) {
                console.error('[DemoMode] Error:', e);
                throw e;
            }
        }
        // ------------------------------

        const fullUrl = `${this.baseUrl}${url}`;
        const method = (options.method || 'GET').toUpperCase();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
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
                cache: 'no-store'
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
