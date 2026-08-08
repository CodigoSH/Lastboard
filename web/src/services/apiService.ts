import { csrfToken } from './csrf';

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
        return csrfToken();
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

                // Health Check (Demo: "up", except services in a synthetic outage)
                if (url === '/api/dashboard/health/batch' && method === 'POST') {
                    return demoService.healthFor(body.urls || []) as any;
                }
                if (url.startsWith('/api/dashboard/health')) return { status: 'up' } as any;

                // Monitoring (Demo: synthetic history, see demoMonitor)
                if (url === '/api/monitor/settings' && method === 'GET') {
                    return demoService.fetchMonitorSettings() as any;
                }
                if (url === '/api/monitor/settings' && method === 'POST') {
                    return demoService.saveMonitorSettings(body) as any;
                }
                if (url === '/api/monitor/overview') return demoService.fetchMonitorOverview() as any;
                if (url.startsWith('/api/monitor/history') && method === 'GET') {
                    const params = new URLSearchParams(url.split('?')[1] || '');
                    return demoService.fetchMonitorHistory(
                        parseInt(params.get('item_id') || '0', 10),
                        params.get('range') || '24h') as any;
                }
                if (url.startsWith('/api/monitor/history') && method === 'DELETE') {
                    return { ok: true, deleted: 0 } as any;
                }
                if (url === '/api/monitor/test') return { ok: true } as any;

                // Multi-Dashboard (Demo: persisted in localStorage via demoService)
                if (url === '/api/dashboards' && method === 'GET') return demoService.fetchDashboards() as any;
                if (url === '/api/dashboards/reorder' && method === 'PUT') {
                    await demoService.reorderDashboards(body.ids || []);
                    return { status: 'reordered' } as any;
                }
                if (url.startsWith('/api/dashboards/') && url.endsWith('/default') && method === 'POST') {
                    await demoService.setDefaultDashboard(parseInt(url.split('/')[3] || '0'));
                    return { status: 'updated' } as any;
                }
                if (url === '/api/dashboards' && method === 'POST') return demoService.createDashboard(body.name) as any;
                if (url.startsWith('/api/dashboards/') && method === 'PATCH') {
                    await demoService.renameDashboard(parseInt(url.split('/').pop() || '0'), body.name);
                    return { status: 'updated' } as any;
                }
                if (url.startsWith('/api/dashboards/') && method === 'DELETE') {
                    await demoService.deleteDashboard(parseInt(url.split('/').pop() || '0'));
                    return { status: 'deleted' } as any;
                }

                // API widget (Demo: synthetic counters, see demoApi)
                if (url === '/api/widget/api-fetch' && method === 'POST') {
                    const { demoApiValues } = await import('./demoApi');
                    return { ok: true, values: demoApiValues(body.paths || []) } as any;
                }

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
                const text = await response.text();
                let message = text.trim();
                try { message = JSON.parse(text).error || message; } catch { }
                throw new Error(message || `HTTP ${response.status}: ${response.statusText}`);
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

    async post<T>(url: string, data: unknown): Promise<T> {
        return this.request<T>(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async patch<T>(url: string, data: unknown): Promise<T> {
        return this.request<T>(url, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async put<T>(url: string, data: unknown): Promise<T> {
        return this.request<T>(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(url: string): Promise<T> {
        return this.request<T>(url, { method: 'DELETE' });
    }

    async postForm<T>(url: string, data: FormData): Promise<T> {
        const fullUrl = `${this.baseUrl}${url}`;
        const token = this.getCsrfToken();
        const headers: Record<string, string> = {};
        if (token) headers['X-CSRF-Token'] = token;
        // Do NOT set Content-Type — the browser sets it with the correct multipart boundary
        try {
            const response = await fetch(fullUrl, { method: 'POST', headers, body: data });
            if (!response.ok) {
                const text = await response.text();
                let message = text.trim();
                try { message = JSON.parse(text).error || message; } catch { }
                throw new Error(message || `HTTP ${response.status}: ${response.statusText}`);
            }
            const text = await response.text();
            return text ? JSON.parse(text) : {} as T;
        } catch (error) {
            console.error(`[ApiService] Request failed: ${fullUrl}`, error);
            throw error;
        }
    }
}

export const apiService = new ApiService();
