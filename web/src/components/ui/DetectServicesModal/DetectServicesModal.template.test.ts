import { describe, expect, test } from 'bun:test';
import { detectHtml, resultHtml, rowHtml, type RowView, type T, type WindowView } from './DetectServicesModal.template';

const t: T = (key, params) => `[${key}${params ? ':' + JSON.stringify(params) : ''}]`;
const evil = '<img src=x onerror=alert(1)>';

const row = (o: Partial<RowView> = {}): RowView => ({
    key: 'h1/plex', checked: true, name: 'Plex', url: 'http://nas:32400', candidates: ['http://nas:32400'], note: '', linkedTo: '', iconUrl: '', ...o,
});
const view = (o: Partial<WindowView> = {}): WindowView => ({
    state: 'ready', hostName: 'Home', hosts: [{ id: 'h1', name: 'Home' }], hostId: 'h1', address: 'nas', groupBy: 'host', rows: [row()],
    withoutAddress: 0, boards: [{ id: 1, name: 'Main' }], boardId: 1, canPickBoard: false, selected: 1, result: null, busy: false, error: '', ...o,
});

describe('what a container says is escaped', () => {
    test('in a row: name, address, note, link, key and icon', () => {
        const html = rowHtml(row({
            key: `h1/${evil}`, name: evil, url: evil, candidates: [evil, 'http://b'], linkedTo: evil, iconUrl: `x" onerror="alert(1)`,
        }), t);
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('onerror="alert(1)"');
        expect(html).toContain('&lt;img src=x');
    });
    test('in the whole window: the host\'s name and the error', () => {
        const html = detectHtml(view({ hostName: evil, hosts: [{ id: 'a', name: evil }, { id: 'b', name: 'B' }], state: 'empty', error: evil }), t);
        expect(html).not.toContain('<img src=x');
    });
});

describe('a row', () => {
    test('has a choice of addresses only when there is more than one', () => {
        expect(rowHtml(row(), t)).not.toContain('class="alt"');
        expect(rowHtml(row({ candidates: ['http://a', 'http://b'] }), t)).toContain('class="alt"');
    });
    test('is ticked as it was proposed', () => {
        expect(rowHtml(row({ checked: true }), t)).toContain('checked');
        expect(rowHtml(row({ checked: false }), t)).not.toContain('checked');
    });
    test('says why it is as it is', () => {
        expect(rowHtml(row({ note: 'host_network' }), t)).toContain('[detect.note_host_network]');
        expect(rowHtml(row({ note: 'stopped' }), t)).toContain('[detect.note_stopped]');
        const linked = rowHtml(row({ linkedTo: 'My Plex' }), t);
        expect(linked).toContain('is-linked');
        expect(linked).toContain('&quot;name&quot;:&quot;My Plex&quot;');
    });
    test('can be found by its name', () => {
        expect(rowHtml(row({ name: 'Home Assistant', key: 'h1/ha' }), t)).toContain('data-search="home assistant h1/ha"');
    });
});

describe('the window', () => {
    test('lists the rows, with its controls and the count on the button', () => {
        const html = detectHtml(view({ selected: 3 }), t);
        expect(html).toContain('id="dt-list"');
        expect(html).toContain('id="dt-address"');
        expect(html).toContain('id="dt-group"');
        expect(html).toContain('&quot;count&quot;:&quot;3&quot;');
    });
    test('offers the host only when there are several, and the board only to one who may choose', () => {
        const one = detectHtml(view(), t);
        expect(one).not.toContain('id="dt-host"');
        expect(one).not.toContain('id="dt-board"');
        const many = detectHtml(view({ hosts: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], canPickBoard: true, boards: [{ id: 1, name: 'M' }, { id: 2, name: 'N' }] }), t);
        expect(many).toContain('id="dt-host"');
        expect(many).toContain('id="dt-board"');
        expect(detectHtml(view({ canPickBoard: true, boards: [{ id: 1, name: 'M' }] }), t)).not.toContain('id="dt-board"');
        // An account that may not choose is not offered the choice, however many boards there are.
        expect(detectHtml(view({ canPickBoard: false, boards: [{ id: 1, name: 'M' }, { id: 2, name: 'N' }] }), t)).not.toContain('id="dt-board"');
    });
    test('the button is off with nothing ticked, or while it works', () => {
        expect(detectHtml(view({ selected: 0 }), t)).toMatch(/id="dt-create" disabled/);
        expect(detectHtml(view({ busy: true }), t)).toMatch(/id="dt-create" disabled/);
        expect(detectHtml(view(), t)).not.toMatch(/id="dt-create" disabled/);
    });
    test('says how many were left out for having nothing to open', () => {
        expect(detectHtml(view({ withoutAddress: 4 }), t)).toContain('&quot;count&quot;:&quot;4&quot;');
        expect(detectHtml(view(), t)).not.toContain('detect.hidden');
    });
    test('has a state of its own while loading, with no host, and with nothing to add', () => {
        expect(detectHtml(view({ state: 'loading' }), t)).toContain('[detect.loading:{&quot;host&quot;:&quot;Home&quot;}]');
        expect(detectHtml(view({ state: 'nohost' }), t)).toContain('[detect.no_host]');
        const empty = detectHtml(view({ state: 'empty' }), t);
        expect(empty).toContain('[detect.empty]');
        expect(empty).not.toContain('id="dt-create"');
        expect(detectHtml(view({ state: 'empty', error: 'down' }), t)).toContain('down');
    });
});

describe('the result', () => {
    test('says what was added, what was not, and offers to undo only what can be', () => {
        const html = resultHtml({ created: 5, failed: 1, notFit: 2, undoable: 5, undone: null }, t);
        expect(html).toContain('detect.added:{&quot;count&quot;:&quot;5&quot;}');
        expect(html).toContain('detect.failed:{&quot;count&quot;:&quot;1&quot;}');
        expect(html).toContain('detect.limit:{&quot;count&quot;:&quot;2&quot;}');
        expect(html).toContain('id="dt-undo"');
        expect(resultHtml({ created: 0, failed: 0, notFit: 0, undoable: 0, undone: null }, t)).not.toContain('dt-undo');
    });
    test('after an undo it says how many were removed and offers nothing more', () => {
        const html = resultHtml({ created: 0, failed: 0, notFit: 0, undoable: 0, undone: 4 }, t);
        expect(html).toContain('detect.undone:{&quot;count&quot;:&quot;4&quot;}');
        expect(html).not.toContain('dt-undo');
    });
});
