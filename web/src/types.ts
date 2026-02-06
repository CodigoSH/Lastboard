/**
 * Core Types for Kashboard
 * These interfaces mirror the Go backend structures and API responses.
 */

export interface UserPreferences {
    accent_color: string;
    language: string;
    theme?: string; // 'light' | 'dark' | 'system'
    // Client-only preferences (synced if backend supports)
    widget_min_width?: number; // Replaces fixed column counts
    avatar_url?: string;
    project_name?: string;
    beta_updates?: boolean;
}

export interface User {
    id?: number;
    username: string;
    initials: string;
    role: string;
    avatar_url: string;
    accent_color: string;
    language: string;
    theme?: string; // Sync with backend response
    widget_min_width?: number;
    project_name?: string;
    beta_updates?: boolean;
    is_superadmin?: boolean;
    preferences?: UserPreferences; // Derived on client
}

export interface GridItem {
    id: number;
    parent_id?: number;
    type: string; // 'container' | 'widget' | 'bookmark'
    x: number;
    y: number;
    w: number;
    h: number;
    url?: string; // Added for widget compatibility
    content: any; // JSON string or object depending on context
    created_at?: string;
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
        KASHBOARD_CONFIG?: {
            API_BASE_URL: string;
            DEBUG_MODE: boolean;
        };
        notifier?: any;
    }
}
