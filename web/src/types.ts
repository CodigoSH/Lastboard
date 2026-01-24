/**
 * Core Types for CSH Dashboard
 * These interfaces mirror the Go backend structures and API responses.
 */

export interface UserPreferences {
    accent_color: string;
    language: string;
    // Client-only preferences (synced if backend supports)
    grid_columns_pc?: number;
    grid_columns_tablet?: number;
    grid_columns_mobile?: number;
}

export interface User {
    username: string;
    initials: string;
    role: string;
    avatar_url: string;
    accent_color: string;
    language: string;
    preferences?: UserPreferences; // Derived on client or from separate table
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface MessageResponse {
    message: string;
}

declare global {
    interface Window {
        CSH_CONFIG?: {
            API_BASE_URL: string;
            DEBUG_MODE: boolean;
        };
        notifier?: any;
    }
}
