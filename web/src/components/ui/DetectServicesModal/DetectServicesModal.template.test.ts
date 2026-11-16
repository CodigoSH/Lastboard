import { describe, expect, test } from 'bun:test';
import { countHtml, detectHtml, eyebrowText, ignoredCount, initialOf, listedTotal, resultHtml, rowHtml, selectHtml, type RowView, type T, type WindowView } from './DetectServicesModal.template';

const t: T = (key, params) => `[${key}${params ? ':' + JSON.stringify(params) : ''}]`;
const evil = '<img src=x onerror=alert(1)>';

const row = (o: Partial<RowView> = {}): RowView => ({
    key: 'h1/plex', checked: true, name: 'Plex', url: 'http://nas:32400', candidates: ['http://nas:32400'], note: '', linkedTo: '', iconUrl: '', health: '', ignored: false, ...o,
});
const view = (o: Partial<WindowView> = {}): WindowView => ({
    source: 'docker', state: 'ready', hostName: 'Home', hosts: [{ id: 'h1', name: 'Home' }], hostId: 'h1', address: 'nas', groupBy: 'host', rows: [row()],
    withoutAddress: 0, boards: [{ id: 1, name: 'Main' }], boardId: 1, canPickBoard: false, selected: 1, result: null, busy: false, error: '', showIgnored: false, ...o,
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

describe('a hypervisor\'s window', () => {
    test('has no address or sections to choose: a machine has an address of its own', () => {
        const html = detectHtml(view({ source: 'proxmox' }), t);
        expect(html).not.toContain('id="dt-address"');
        expect(html).not.toContain('id="dt-group"');
        expect(html).toContain('id="dt-list"');
        expect(detectHtml(view(), t)).toContain('id="dt-address"');
    });
    test('says it has no hypervisor, and why a machine opens its console', () => {
        expect(detectHtml(view({ source: 'proxmox', state: 'nohost' }), t)).toContain('[detect.no_hypervisor]');
        expect(detectHtml(view({ source: 'docker', state: 'nohost' }), t)).toContain('[detect.no_host]');
        expect(rowHtml(row({ note: 'no_ip' }), t)).toContain('[detect.note_no_ip]');
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

describe('whether the address answers', () => {
    test('says so for each answer, and nothing when it was not asked', () => {
        const en = (k: string) => ({ 'detect.reachable': 'Responds', 'detect.unreachable': 'No response' } as Record<string, string>)[k] ?? k;
        expect(rowHtml(row({ health: 'up' }), en)).toContain('data-h="up">Responds<');
        expect(rowHtml(row({ health: 'down' }), en)).toContain('data-h="down">No response<');
        expect(rowHtml(row(), en)).toContain('data-h=""></span>');
    });
});

describe('ignoring a service', () => {
    const en = (k: string) => k;
    test('every row has the button, and says which way it works', () => {
        expect(rowHtml(row(), en)).toContain('class="ignore" aria-label="detect.ignore"');
        expect(rowHtml(row(), en)).toContain('aria-pressed="false"');
        const ignored = rowHtml(row({ ignored: true }), en);
        expect(ignored).toContain('aria-label="detect.unignore"');
        expect(ignored).toContain('aria-pressed="true"');
    });
    test('an ignored row says so with a pill, and the pill is there but hidden on the others so it can be switched in place', () => {
        expect(rowHtml(row({ ignored: true }), en)).toContain('chip chip--ignored">detect.ignored<');
        expect(rowHtml(row({ ignored: true }), en)).toContain('is-ignored');
        expect(rowHtml(row(), en)).toContain('chip chip--ignored" hidden>');
        expect(rowHtml(row(), en)).not.toContain('is-ignored');
    });
    test('the ignored ones are hidden unless asked for, and the button that asks says how many there are', () => {
        const rows = [row(), row({ key: 'h1/b', ignored: true }), row({ key: 'h1/c', ignored: true })];
        const hidden = detectHtml(view({ rows }), en);
        expect(hidden).toContain('class="list hide-ignored" id="dt-list"');
        expect(hidden).toMatch(/id="dt-ignored" aria-pressed="false">\[?detect\.show_ignored/);
        expect(hidden).not.toMatch(/id="dt-ignored"[^>]* hidden/);
        const shown = detectHtml(view({ rows, showIgnored: true }), en);
        expect(shown).toContain('class="list" id="dt-list"');
        expect(shown).toContain('detect.hide_ignored');
    });
    test('with nothing ignored the button is not there to press', () => {
        expect(detectHtml(view(), en)).toMatch(/id="dt-ignored"[^>]* hidden/);
    });
    test('the count says how many are on show, not how many exist', () => {
        const rows = [row(), row({ key: 'h1/b', ignored: true })];
        expect(detectHtml(view({ rows, selected: 1 }), en)).toContain('<b>1</b> / 1<');
        expect(detectHtml(view({ rows, selected: 1, showIgnored: true }), en)).toContain('<b>1</b> / 2<');
        expect(ignoredCount({ rows })).toBe(1);
        expect(listedTotal({ rows, showIgnored: false })).toBe(1);
    });
    test('leaving a row unticked says nothing about it: no pill, no ignored state', () => {
        const html = rowHtml(row({ checked: false }), en);
        expect(html).not.toContain('is-ignored');
        expect(html).toContain('chip--ignored" hidden');
    });
});

describe('how the window reads', () => {
    test('a service without an icon wears the first letter of its name, past the ordinal it is filed under', () => {
        expect(initialOf('05 Bookorbit')).toBe('B');
        expect(initialOf('  jellyfin')).toBe('J');
        expect(initialOf('12')).toBe('');
        expect(initialOf('')).toBe('');
        expect(initialOf('émile')).toBe('É');
        expect(rowHtml(row({ iconUrl: '', name: '05 Bookorbit' }), (k) => k)).toContain('class="face__letter" aria-hidden="true">B<');
        expect(rowHtml(row({ iconUrl: '', name: evil }), (k) => k)).not.toContain('<img src=x');
    });
    test('the window says which host it is listing, under the right product', () => {
        expect(detectHtml(view({ source: 'docker', hostName: 'Podman' }), (k) => k)).toContain('frame__title">widget.docker.name · Podman<');
        expect(detectHtml(view({ source: 'proxmox', hostName: 'Home' }), (k) => k)).toContain('frame__title">widget.proxmox.name · Home<');
        expect(detectHtml(view({ hostName: '' }), (k) => k)).not.toContain('frame__title');
    });
    test('a host named after the product is not said twice', () => {
        const t = (k: string) => (k === 'widget.docker.name' ? 'Docker' : 'Proxmox');
        expect(eyebrowText('docker', 'Podman', t)).toBe('Docker · Podman');
        expect(eyebrowText('proxmox', 'Proxmox', t)).toBe('Proxmox');
        expect(eyebrowText('proxmox', 'my proxmox lab', t)).toBe('my proxmox lab');
    });
    test('how many are ticked of how many are listed', () => {
        expect(countHtml(3, 12)).toBe('<b>3</b> / 12');
        expect(detectHtml(view({ selected: 2, rows: [row(), row({ key: 'h1/b' })] }), (k) => k)).toContain('id="dt-count"><b>2</b> / 2<');
    });
    test('notes are chips, and a bookmark already serving it says so in the accent one', () => {
        const html = rowHtml(row({ linkedTo: 'My Plex', note: 'stopped' }), (k) => k);
        expect(html).toContain('class="chip chip--linked"');
        expect(html).toContain('<span class="chip">detect.note_stopped</span>');
    });
    test('the loading state draws placeholders, and still says what it waits for', () => {
        const html = detectHtml(view({ state: 'loading', hostName: 'Home' }), (k) => k);
        expect(html).toContain('list--skeleton');
        expect(html).toContain('detect.loading');
    });
});

describe("the product's own dropdowns and the icon button", () => {
    test('a dropdown carries its options as data and its value, escaped', () => {
        const html = selectHtml('dt-board', [{ value: '1', label: 'Main' }, { value: '2', label: evil }], '2', 'Board');
        expect(html).toContain('<app-select id="dt-board"');
        expect(html).toContain('value="2"');
        expect(html).toContain('data-options="[{&quot;value&quot;:&quot;1&quot;');
        expect(html).not.toContain('<img src=x');
    });
    test('no native select is left in the window', () => {
        const html = detectHtml(view({ boards: [{ id: 1, name: 'M' }, { id: 2, name: 'N' }], canPickBoard: true, hosts: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], rows: [row({ candidates: ['http://a', 'http://b'] })] }), (k) => k);
        expect(html).not.toContain('<select');
        expect(html).toContain('id="dt-host"');
        expect(html).toContain('id="dt-board"');
        expect(html).toContain('id="dt-group"');
        expect(html).toContain('class="alt"');
        expect(html).toContain('menu-min-width="460"');
    });
    test("the row's tile is a button that opens the icon search, and a row with one address has no menu", () => {
        expect(rowHtml(row(), (k) => k)).toContain('<button type="button" class="face" aria-label="detect.choose_icon"');
        expect(rowHtml(row(), (k) => k)).not.toContain('app-select');
    });
    test('every row has its line of pills, with the answer first, so the rows keep one height', () => {
        const plain = rowHtml(row(), (k) => k);
        expect(plain).toContain('<div class="row__meta"><span class="row__health"');
        expect(plain).not.toContain('class="chip chip--linked"');
        const linked = rowHtml(row({ linkedTo: 'X', health: 'up' }), (k) => k);
        expect(linked.indexOf('row__health')).toBeLessThan(linked.indexOf('chip chip--linked'));
    });
    test('the list sits in a frame whose name is on its border', () => {
        const html = detectHtml(view({ hostName: 'Home' }), (k) => k);
        expect(html).toContain('<div class="frame"><span class="frame__title">');
        expect(html).toContain('id="dt-list"');
    });
});
