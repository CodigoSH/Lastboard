import { describe, expect, test } from 'bun:test';
import { logLineLevel, shouldPollLog, taskErrorKey, taskLevel, taskLogText, taskSeconds, taskTypeKey } from './proxmoxTasks';

describe('taskTypeKey', () => {
    test('the qemu and container spellings of one action share a word', () => {
        expect(taskTypeKey('qmstart')).toBe(taskTypeKey('vzstart'));
        expect(taskTypeKey('qmshutdown')).toBe(taskTypeKey('vzshutdown'));
        expect(taskTypeKey('qmigrate')).toBe(taskTypeKey('vzmigrate'));
        expect(taskTypeKey('vzdump')).toBe('proxmox.task_type_backup');
        expect(taskTypeKey('aptupdate')).toBe('proxmox.task_type_update');
        expect(taskTypeKey('imgcopy')).toBe('proxmox.task_type_diskcopy');
    });

    test('an unknown type, or an object property name, has no key', () => {
        expect(taskTypeKey('srvreload')).toBeNull();
        expect(taskTypeKey('constructor')).toBeNull();
        expect(taskTypeKey('')).toBeNull();
    });
});

describe('taskLevel', () => {
    test('ok is green, warning and running amber, error red', () => {
        expect(taskLevel('ok')).toBe('up');
        expect(taskLevel('warning')).toBe('warn');
        expect(taskLevel('running')).toBe('warn');
        expect(taskLevel('error')).toBe('bad');
    });
});

describe('taskSeconds', () => {
    test('a finished task is end minus start', () => {
        expect(taskSeconds({ start: 100, end: 160, state: 'ok' }, 9999)).toBe(60);
    });
    test('a running task counts up to now', () => {
        expect(taskSeconds({ start: 100, state: 'running' }, 190)).toBe(90);
    });
    test('a clock that says the task ends before it starts gives nothing', () => {
        expect(taskSeconds({ start: 200, end: 100, state: 'ok' }, 0)).toBeNull();
    });
});

describe('shouldPollLog', () => {
    test('asks again only for a running task, open, on a visible page', () => {
        expect(shouldPollLog({ running: true, open: true, hidden: false })).toBe(true);
        expect(shouldPollLog({ running: false, open: true, hidden: false })).toBe(false);
        expect(shouldPollLog({ running: true, open: false, hidden: false })).toBe(false);
        expect(shouldPollLog({ running: true, open: true, hidden: true })).toBe(false);
    });
});

describe('taskErrorKey', () => {
    test('a translation key is kept, anything else is a connection error', () => {
        expect(taskErrorKey(new Error('proxmox.forbidden'))).toBe('proxmox.forbidden');
        expect(taskErrorKey(new Error('boom'))).toBe('proxmox.connection_error');
        expect(taskErrorKey(null)).toBe('proxmox.connection_error');
    });
});

test('taskLogText joins lines with newlines', () => {
    expect(taskLogText(['a', 'b'])).toBe('a\nb');
});

describe('logLineLevel', () => {
    test('the verdicts Proxmox writes at the start of a line are tinted', () => {
        expect(logLineLevel('TASK ERROR: job errors')).toBe('err');
        expect(logLineLevel('ERROR: Backup of VM 100 failed')).toBe('err');
        expect(logLineLevel('WARN: no such disk')).toBe('warn');
        expect(logLineLevel('TASK WARNINGS: 1')).toBe('warn');
    });
    test('a line that only mentions an error is plain', () => {
        expect(logLineLevel('INFO: previous ERROR cleared')).toBe('');
        expect(logLineLevel('ERRORS=0')).toBe('');
        expect(logLineLevel('')).toBe('');
    });
});
