/**
 * Core Types for Lastboard
 * These interfaces mirror the Go backend structures and API responses.
 */

export interface UserPreferences {
    accent_color: string;
    language: string;
    theme?: string; // 'light' | 'dark' | 'system'
    // Client-only preferences (synced if backend supports)
    grid_columns?: number; // Replaces fixed widget width
    avatar_url?: string;
    project_name?: string;
    beta_updates?: boolean;
    widget_min_width?: number;
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
    grid_columns?: number;
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
    status?: 'up' | 'down' | 'pending';
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
        LASTBOARD_CONFIG?: {
            API_BASE_URL: string;
            DEBUG_MODE: boolean;
        };
        notifier?: any;
    }
}
