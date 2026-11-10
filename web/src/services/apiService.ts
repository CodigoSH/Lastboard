import { csrfToken } from './csrf';
import { isForbidden } from './access';

/** A failed request: the server's message, and the status it came with. */
export class ApiError extends Error {
    constructor(message: string, public status: number) {
        super(message);
        this.name = 'ApiError';
    }
}

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

    /** The JSON an API answers with; an empty body (204) is an empty object, a failure carries the server's message. */
    private async readJson<T>(response: Response): Promise<T> {
        const text = await response.text();
        if (!response.ok) {
            let message = text.trim();
            try { message = JSON.parse(text).error || message; } catch { }
            throw new ApiError(message || `HTTP ${response.status}: ${response.statusText}`, response.status);
        }
        return text ? JSON.parse(text) : {} as T;
    }

    private async request<T>(url: string, options: RequestInit): Promise<T> {
        // The demo has no server: its answers are made in the browser.
        if (window.LASTBOARD_CONFIG?.demo_mode) {
            const { demoRequest } = await import('./demoRouter');
            return demoRequest<T>(url, options);
        }

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

            return await this.readJson<T>(response);
        } catch (error) {
            // A missing permission is an answer, not a fault worth a red line.
            if (!isForbidden(error)) console.error(`[ApiService] Request failed: ${fullUrl}`, error);
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

    /**
     * POSTs JSON and returns the file the server answers with.
     *
     * For downloads that need a secret in the request: it goes in the body, not
     * in a link the browser would keep in its history.
     */
    async postForFile(url: string, data: unknown): Promise<{ blob: Blob; filename: string }> {
        const token = this.getCsrfToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['X-CSRF-Token'] = token;
        const response = await fetch(`${this.baseUrl}${url}`, { method: 'POST', headers, body: JSON.stringify(data) });
        if (!response.ok) {
            throw new Error((await response.text()).trim() || `HTTP ${response.status}: ${response.statusText}`);
        }
        const named = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') || '');
        return { blob: await response.blob(), filename: named?.[1] || 'lastboard-backup.json' };
    }

    async postForm<T>(url: string, data: FormData): Promise<T> {
        const fullUrl = `${this.baseUrl}${url}`;
        const token = this.getCsrfToken();
        const headers: Record<string, string> = {};
        if (token) headers['X-CSRF-Token'] = token;
        // Do NOT set Content-Type — the browser sets it with the correct multipart boundary
        try {
            const response = await fetch(fullUrl, { method: 'POST', headers, body: data });
            return await this.readJson<T>(response);
        } catch (error) {
            console.error(`[ApiService] Request failed: ${fullUrl}`, error);
            throw error;
        }
    }
}

export const apiService = new ApiService();
