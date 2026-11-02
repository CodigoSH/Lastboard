import { apiService } from './apiService';
import { holdReading, sharedRead } from './infraReadings';

/**
 * The overview of every monitored service, as the server gives it. The tile on the board and the
 * status page both read it; asked through here they make one request between them while one is on
 * its way, and the last answer is held for the page to open on.
 */
export function fetchMonitorOverview<T>(): Promise<T[]> {
    return sharedRead('monitor:overview', async () => {
        const rows = await apiService.get<T[]>('/api/monitor/overview');
        const list = Array.isArray(rows) ? rows : [];
        holdReading('monitor', list);
        return list;
    });
}
