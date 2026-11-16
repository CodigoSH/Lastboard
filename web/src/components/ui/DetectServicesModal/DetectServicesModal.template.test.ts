import { describe, expect, test } from 'bun:test';
import { destinationText, detectHtml, eyebrowText, groupHtml, initialOf, listHtml, resultHtml, rowHtml, selectHtml, type RowView, type T, type WindowView } from './DetectServicesModal.template';

const t: T = (key, params) => `[${key}${params ? ':' + JSON.stringify(params) : ''}]`;
const evil = '<img src=x onerror=alert(1)>';

const row = (o: Partial<RowView> = {}): RowView => ({
    key: 'h1/plex', checked: true, name: 'Plex', url: 'http://nas:32400', candidates: ['http://nas:32400'], note: '', linkedTo: '', iconUrl: '', health: '', group: 'add', ...o,
});
const view = (o: Partial<WindowView> = {}): WindowView => ({
    source: 'docker', state: 'ready', hostName: 'Home', hosts: [{ id: 'h1', name: 'Home' }], hostId: 'h1', address: 'nas', groupBy: 'host', rows: [row()],
    withoutAddress: 0, boards: [{ id: 1, name: 'Main' }], boardId: 1, canPickBoard: false, selected: 1, result: null, busy: false, error: '', open: { linked: false, ignored: false }, sections: [], ...o,
});

describe('what a container says is escaped', () => {
    test('in a row: name, address, note, link, key and icon', () => {
        const html = rowHtml(row({
            key: `h1/${evil}`, name: evil, url: evil, candidates: [evil, 'http://b'], linkedTo: evil, iconUrl: `x" onerror="alert(1)`,
        }), t);
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('onerror="alert(1)"');
        expect(html).toContain('&lt;img src=x');
        const linked = rowHtml(row({ group: 'linked', name: evil, linkedTo: evil, iconUrl: `x" onerror="alert(1)` }), t);
        expect(linked).not.toContain('<img src=x');
        expect(linked).not.toContain('onerror="alert(1)"');
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
        const linked = rowHtml(row({ group: 'linked', linkedTo: 'My Plex' }), t);
        expect(linked).toContain('row--linked');
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

describe('groups: what there is to add, what is already done, what was set aside', () => {
    const rows = [row({ key: 'a' }), row({ key: 'b', group: 'linked', linkedTo: 'X', checked: false }), row({ key: 'c', group: 'ignored', checked: false }), row({ key: 'd', group: 'ignored', checked: false })];
    test('three groups in that order, each with how many it holds', () => {
        const html = listHtml({ rows, open: { linked: false, ignored: false } }, t);
        expect(html.indexOf('group--add')).toBeLessThan(html.indexOf('group--linked'));
        expect(html.indexOf('group--linked')).toBeLessThan(html.indexOf('group--ignored'));
        expect(html).toContain('[detect.group_new:{&quot;count&quot;:&quot;1&quot;}]');
        expect(html).toContain('[detect.group_linked:{&quot;count&quot;:&quot;1&quot;}]');
        expect(html).toContain('[detect.group_ignored:{&quot;count&quot;:&quot;2&quot;}]');
    });
    test('the two that fold are folded until opened, and a group with nothing in it is not there', () => {
        const closed = listHtml({ rows, open: { linked: false, ignored: false } }, t);
        expect(closed).toMatch(/data-fold="linked" aria-expanded="false"/);
        expect(closed).toMatch(/<div class="group__rows" hidden>/);
        const opened = listHtml({ rows, open: { linked: true, ignored: true } }, t);
        expect(opened).toMatch(/data-fold="linked" aria-expanded="true"/);
        expect(listHtml({ rows: [row()], open: { linked: false, ignored: false } }, t)).not.toContain('group--linked');
        expect(listHtml({ rows: [row()], open: { linked: false, ignored: false } }, t)).not.toContain('group--ignored');
    });
    test('the group to add carries the ticking, and says so when there is nothing in it', () => {
        const html = listHtml({ rows, open: { linked: false, ignored: false } }, t);
        expect(html).toContain('id="dt-all"');
        expect(html).toContain('id="dt-none"');
        expect(groupHtml('add', [], { open: { linked: false, ignored: false } }, t)).toContain('[detect.nothing_new]');
    });
    test('a row to add can be ticked, edited and ignored; the others only say what they are and offer one way out', () => {
        const add = rowHtml(row(), t);
        expect(add).toContain('class="pick"');
        expect(add).toContain('act--edit');
        expect(add).toContain('act--ignore');
        const linked = rowHtml(row({ group: 'linked', linkedTo: 'X' }), t);
        expect(linked).toContain('act--anyway');
        expect(linked).not.toContain('class="pick"');
        expect(linked).not.toContain('class="addr"');
        const ignored = rowHtml(row({ group: 'ignored' }), t);
        expect(ignored).toContain('act--unignore');
        expect(ignored).not.toContain('class="pick"');
    });
    test('the actions say their word; none is an icon alone', () => {
        const html = rowHtml(row(), t);
        expect(html).toContain('act--edit">[detect.edit]<');
        expect(html).toContain('act--ignore">[detect.ignore]<');
    });
    test('the fields of a row to add are folded away until it is edited', () => {
        const html = rowHtml(row(), t);
        expect(html).toMatch(/<div class="row__edit" hidden>/);
        expect(html).toContain('class="row__name">Plex<');
        expect(html).toContain('class="row__addr">http://nas:32400<');
    });
});

describe('what "not answering" means, said once and where it matters', () => {
    test('the explanation is there while a row to add does not answer, and only then', () => {
        const down = groupHtml('add', [row({ health: 'down' })], { open: { linked: false, ignored: false } }, t);
        expect(down).toMatch(/id="dt-hint-down">\[detect\.hint_down\]/);
        const up = groupHtml('add', [row({ health: 'up' })], { open: { linked: false, ignored: false } }, t);
        expect(up).toMatch(/id="dt-hint-down" hidden>/);
    });
    test('a row that is not in the group to add does not call for it', () => {
        const html = groupHtml('add', [row({ health: 'up' })], { open: { linked: false, ignored: false } }, t);
        expect(html).toMatch(/dt-hint-down" hidden/);
    });
});

describe('where it goes', () => {
    const base = { boards: [{ id: 1, name: 'Main' }, { id: 2, name: 'Lab' }], boardId: 2 };
    test('one section is named, several are listed, and nothing ticked says nothing', () => {
        expect(destinationText({ ...base, sections: [] }, t)).toBe('');
        expect(destinationText({ ...base, sections: ['Podman'] }, t)).toBe('[detect.destination:{"board":"Lab","section":"Podman"}]');
        expect(destinationText({ ...base, sections: ['A', 'B'] }, t)).toBe('[detect.destination_many:{"board":"Lab","sections":"A, B"}]');
        expect(destinationText({ ...base, sections: ['A', 'B', 'C', 'D'] }, t)).toContain('"sections":"A, B, C…"');
    });
    test('the footer carries it, only while there is a list to send', () => {
        expect(detectHtml(view({ sections: ['Home'] }), t)).toContain('id="dt-dest">[detect.destination');
        expect(detectHtml(view({ state: 'empty' }), t)).not.toContain('id="dt-dest"');
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
    test('notes are chips, and a bookmark already serving it says so in the accent one', () => {
        expect(rowHtml(row({ note: 'stopped' }), (k) => k)).toContain('<span class="chip">detect.note_stopped</span>');
        expect(rowHtml(row({ group: 'linked', linkedTo: 'My Plex' }), (k) => k)).toContain('class="chip chip--linked"');
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
    test('a row to add says in words whether its address answers, right under its name', () => {
        const html = rowHtml(row({ health: 'up' }), (k) => k);
        expect(html.indexOf('row__name')).toBeLessThan(html.indexOf('row__health'));
        expect(html).toContain('data-h="up">detect.reachable<');
    });
    test('the list sits in a frame whose name is on its border', () => {
        const html = detectHtml(view({ hostName: 'Home' }), (k) => k);
        expect(html).toContain('<div class="frame"><span class="frame__title">');
        expect(html).toContain('id="dt-list"');
    });
});
