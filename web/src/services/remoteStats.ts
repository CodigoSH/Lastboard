import { apiService } from './apiService';
import type { RemoteReply } from '../widgets/core/remoteTelemetry';

/** One reading for a Server Health widget that points at another server. */
export function fetchRemoteStats(itemId: number): Promise<RemoteReply> {
    return apiService.get<RemoteReply>(`/api/widget/${itemId}/remote-stats`);
}

/** The settings form's test: what is typed now, with the stored password unless a new one is typed. */
export function testRemoteStats(body: { id: number; config: Record<string, string>; password: string }): Promise<RemoteReply> {
    return apiService.post<RemoteReply>('/api/widget/remote-stats/test', body);
}
