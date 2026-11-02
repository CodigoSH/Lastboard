import { describe, expect, test } from 'bun:test';
import { logLineHtml, TASK_LINES, taskRowHtml, tasksListHtml, typeLabel } from './ProxmoxTasks.template';
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

describe('the list of tasks', () => {
    const t = (k: string) => `[${k}]`;
    const fmt = { time: (n: number) => `T${n}`, span: (n: number) => `S${n}` };
    const many: PxTask[] = Array.from({ length: TASK_LINES + 7 }, (_, i) => ({ upid: `u${i}`, type: 'vzdump', id: '100', user: 'root@pam', state: 'ok', start: 1000 + i }));
    test('shows fifteen and offers the rest in a window, which shows them all', () => {
        const html = tasksListHtml(many, () => 60, t, fmt);
        expect(html.match(/data-upid=/g)?.length).toBe(TASK_LINES);
        expect(html).toContain('data-tp-all');
        expect(html).toContain(`<span class="n">${many.length}</span>`);
        const all = tasksListHtml(many, () => 60, t, fmt, true);
        expect(all.match(/data-upid=/g)?.length).toBe(many.length);
        expect(all).not.toContain('data-tp-all');
    });
    test('a short list has no button, and an empty one says so', () => {
        expect(tasksListHtml(many.slice(0, TASK_LINES), () => 60, t, fmt)).not.toContain('data-tp-all');
        expect(tasksListHtml([], () => null, t, fmt)).toContain('[proxmox.tasks_empty]');
    });
});
