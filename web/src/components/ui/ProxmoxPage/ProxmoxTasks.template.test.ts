import { describe, expect, test } from 'bun:test';
import { logLineHtml, taskRowHtml, typeLabel } from './ProxmoxTasks.template';
import type { PxTask } from '../../../services/proxmoxTasks';

const t = (key: string) => `[${key}]`;
const fmt = { time: (s: number) => `at ${s}`, span: (s: number) => `${s}s` };
const task = (over: Partial<PxTask> = {}): PxTask => ({
    upid: 'UPID:kprox:0000A1B2:00C0FFEE:6717A8B0:vzdump:106:root@pam:', type: 'vzdump', id: '106',
    user: 'root@pam', state: 'ok', start: 100, end: 160, ...over,
});

// Everything in a task is written by the hypervisor, so none of it may become markup.
describe('what the hypervisor wrote is text', () => {
    const evil = '<img src=x onerror=alert(1)>';

    test('a log line', () => {
        const html = logLineHtml(`ERROR: ${evil}`);
        expect(html).not.toContain('<img');
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(html).toContain('ll--err');
    });

    test('every field of a task row', () => {
        const html = taskRowHtml(task({ type: evil, id: evil, user: evil, message: evil, state: 'error', upid: `x" onclick="alert(1)` }), 60, t, fmt);
        expect(html).not.toContain('<img');
        expect(html).not.toContain('" onclick="');
    });
});

describe('typeLabel', () => {
    test('a known type has a word, an unknown one is shown as it came', () => {
        expect(typeLabel('vzdump', t)).toBe('[proxmox.task_type_backup]');
        expect(typeLabel('hamigrate', t)).toBe('hamigrate');
    });
});
