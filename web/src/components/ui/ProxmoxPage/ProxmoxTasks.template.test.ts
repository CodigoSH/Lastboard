import { describe, expect, test } from 'bun:test';
import { logLineHtml, TASK_LINES, taskGroupsHtml, taskRowHtml, tasksListHtml, typeLabel } from './ProxmoxTasks.template';
import { groupTasksByMachine, type PxTask } from '../../../services/proxmoxTasks';

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

describe('the tasks tab by machine', () => {
    const t = (k: string) => `[${k}]`;
    const fmt = { time: (n: number) => `T${n}`, span: (n: number) => `S${n}` };
    const num = (n: number) => `#${n}`;
    const mk = (id: string, state: PxTask['state'], start: number): PxTask => ({ upid: `u${id}${start}`, type: 'vzdump', id, user: 'root@pam', state, start });
    const tasks = [mk('100', 'ok', 10), mk('100', 'error', 20), mk('100', 'ok', 30), mk('101', 'ok', 40), mk('', 'running', 5)];
    const items = groupTasksByMachine(tasks).map(group => ({ group, name: group.id || 'node', face: '' }));

    test('a card says how many tasks the machine has and opens it on its tasks', () => {
        const html = taskGroupsHtml(items, 'cards', t, fmt, num);
        expect(html.match(/data-tg=/g)?.length).toBe(3);
        expect(html).toContain('<b>#3</b><span>[proxmox.tasks]</span>');
        expect(html).toContain('data-tg="100"');
        // The failure is counted, and the node's own tasks (no machine) are a card of their own.
        expect(html).toMatch(/\[proxmoxpage.tasks_failed\]<\/span><b>#1<\/b>/);
        expect(html).toContain('data-tg=""');
    });
    test('the list holds the same machines, with named columns', () => {
        const html = taskGroupsHtml(items, 'list', t, fmt, num);
        expect(html.match(/data-tg=/g)?.length).toBe(3);
        expect(html).toContain('[proxmoxpage.tasks_machine]');
        expect(html).toContain('[proxmoxpage.tasks_failed]');
        expect(html).not.toContain('class="cards"');
    });
    test('the name of a machine is text', () => {
        const evil = [{ ...items[0], name: '<img src=x onerror=alert(1)>' }];
        expect(taskGroupsHtml(evil, 'cards', t, fmt, num)).not.toContain('<img src=x');
        expect(taskGroupsHtml(evil, 'list', t, fmt, num)).not.toContain('<img src=x');
    });
    test('nothing to show says so', () => {
        expect(taskGroupsHtml([], 'cards', t, fmt, num)).toContain('[proxmox.tasks_empty]');
    });
});
