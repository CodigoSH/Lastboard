import { apiService } from './apiService';
import type { PxTask, PxTaskLog, TaskScope } from './proxmoxTasks';

/**
 * The requests behind the tasks view. Kept apart from proxmoxTasks.ts so that
 * file stays pure and its tests never load the API client.
 */

const q = encodeURIComponent;

export async function fetchTasks(scope: TaskScope): Promise<PxTask[]> {
    const vm = scope.vmid ? `&vmid=${scope.vmid}` : '';
    const out = await apiService.get<{ tasks?: PxTask[] }>(
        `/api/proxmox/tasks?host=${q(scope.host)}&node=${q(scope.node)}${vm}`);
    return out?.tasks ?? [];
}

export async function fetchTaskLog(scope: TaskScope, upid: string): Promise<PxTaskLog> {
    const out = await apiService.get<Partial<PxTaskLog>>(
        `/api/proxmox/task-log?host=${q(scope.host)}&node=${q(scope.node)}&upid=${q(upid)}`);
    return { lines: out?.lines ?? [], running: out?.running === true, truncated: out?.truncated === true };
}

/** The last lines of a node's system log. Optional: it needs a privilege the recommended role does not carry. */
export async function fetchJournal(host: string, node: string): Promise<string[]> {
    const out = await apiService.get<{ lines?: string[] }>(`/api/proxmox/journal?host=${q(host)}&node=${q(node)}`);
    return out?.lines ?? [];
}
