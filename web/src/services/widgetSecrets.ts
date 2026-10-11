import { apiService } from './apiService';

/**
 * What a widget keeps secret, as the page can know it: which are set, never
 * what they are. The server will not send the values, so there is nothing here
 * to show — the field shows dots for a name that is listed.
 */
export interface WidgetSecretNames { names: string[] }

export function listWidgetSecrets(itemId: number): Promise<WidgetSecretNames> {
    return apiService.get<WidgetSecretNames>(`/api/widget/${itemId}/secrets`);
}

export function saveWidgetSecrets(itemId: number, patch: { set: Record<string, string>; clear: string[] }): Promise<WidgetSecretNames> {
    return apiService.put<WidgetSecretNames>(`/api/widget/${itemId}/secrets`, patch);
}
