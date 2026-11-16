import { describe, expect, test } from 'bun:test';
import { addressLineHtml, detectHtml, eyebrowText, groupHtml, headHtml, initialOf, listHtml, previewHtml, resultHtml, rowHtml, sectionPlaceholder, sectionStatus, sectionStatusHtml, selectHtml, type RowView, type T, type WindowView } from './DetectServicesModal.template';

const t: T = (key, params) => `[${key}${params ? ':' + JSON.stringify(params) : ''}]`;
const evil = '<img src=x onerror=alert(1)>';

const row = (o: Partial<RowView> = {}): RowView => ({
    key: 'h1/plex', checked: true, name: 'Plex', url: 'http://nas:32400', candidates: ['http://nas:32400'], note: '', linkedTo: '', iconUrl: '', health: '', group: 'add', console: false, ...o,
});
const view = (o: Partial<WindowView> = {}): WindowView => ({
    source: 'docker', state: 'ready', hostName: 'Home', hosts: [{ id: 'h1', name: 'Home' }], hostId: 'h1', address: 'nas', groupBy: 'host', rows: [row()],
    withoutAddress: 0, boards: [{ id: 1, name: 'Main' }], boardId: 1, canPickBoard: false, selected: 1, result: null, busy: false, error: '', hasProjects: false, addressEditing: false, open: { linked: false, ignored: false }, sectionName: '', autoSections: [], preview: [], boardSections: [], ...o,
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
    test('the host dropdown sits between the search and the buttons, and stays while loading or after a failure', () => {
        const hosts = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
        const ready = detectHtml(view({ hosts }), t);
        expect(ready.indexOf('id="dt-search"')).toBeLessThan(ready.indexOf('id="dt-host"'));
        expect(ready.indexOf('id="dt-host"')).toBeLessThan(ready.indexOf('id="dt-all"'));
        // A host that is loading or has nothing must not trap the person on it.
        for (const state of ['loading', 'empty'] as const) expect(detectHtml(view({ hosts, state }), t)).toContain('id="dt-host"');
        expect(detectHtml(view({ state: 'empty' }), t)).not.toContain('id="dt-host"');
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
    test('has no host address line and no switch for projects: a machine has an address of its own', () => {
        const html = detectHtml(view({ source: 'proxmox', hasProjects: true }), t);
        expect(html).not.toContain('id="dt-addr"');
        expect(html).not.toContain('id="dt-by-project"');
        expect(html).toContain('id="dt-list"');
        expect(detectHtml(view(), t)).toContain('id="dt-addr"');
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
        expect(html).toContain('group--add');
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
    test('the group to add has only its rows, and says so when there is nothing in it; its head is the frame\'s', () => {
        const html = listHtml({ rows, open: { linked: false, ignored: false } }, t);
        expect(html).not.toContain('id="dt-all"');
        expect(html).not.toContain('dt-hint-down');
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

describe('the head of the frame', () => {
    test('says what the list is, how many there are, and how many are ticked, with a bar for it', () => {
        const html = headHtml([row({ key: 'a' }), row({ key: 'b', checked: false }), row({ key: 'c', checked: false }), row({ key: 'd', group: 'linked', linkedTo: 'X' })], t);
        expect(html).toContain('head__title">[detect.group_new_title]<');
        expect(html).toContain('head__count">3<');
        expect(html).toContain('<b>1</b> / 3');
        expect(html).toContain('inline-size:33%');
    });
    test('an empty list has an empty bar, not a broken one', () => {
        expect(headHtml([], t)).toContain('inline-size:0%');
    });
    test('the explanation of "not answering" is there while a row to add does not answer, and only then', () => {
        expect(headHtml([row({ health: 'down' })], t)).toMatch(/id="dt-hint-down"><svg/);
        expect(headHtml([row({ health: 'up' })], t)).toMatch(/id="dt-hint-down" hidden>/);
        expect(headHtml([row({ group: 'linked', health: 'down' })], t)).toMatch(/id="dt-hint-down" hidden>/);
    });
    test('it sits in the frame above the list, and the ticking is beside the search', () => {
        const html = detectHtml(view(), t);
        expect(html.indexOf('id="dt-head"')).toBeLessThan(html.indexOf('id="dt-list"'));
        expect(html.indexOf('id="dt-search"')).toBeLessThan(html.indexOf('id="dt-all"'));
        expect(html.indexOf('id="dt-all"')).toBeLessThan(html.indexOf('id="dt-head"'));
        expect(html).toContain('id="dt-none"');
    });
});

describe('where it goes', () => {
    test('the section field shows the title the window would choose, or that there are several', () => {
        expect(sectionPlaceholder({ autoSections: [] }, t)).toBe('');
        expect(sectionPlaceholder({ autoSections: ['Podman'] }, t)).toBe('Podman');
        expect(sectionPlaceholder({ autoSections: ['A', 'B'] }, t)).toBe('[detect.section_several]');
    });
    test('the footer has the preview on the left and, on the right, the board, the section and the buttons', () => {
        const html = detectHtml(view(), t);
        const at = (needle: string) => html.indexOf(needle);
        expect(at('id="dt-preview"')).toBeLessThan(at('class="footer__side"'));
        expect(at('class="footer__side"')).toBeLessThan(at('id="dt-section"'));
        expect(at('id="dt-section"')).toBeLessThan(at('id="dt-cancel"'));
        expect(at('id="dt-cancel"')).toBeLessThan(at('id="dt-create"'));
        expect(html).toContain('class="footer footer--ready"');
        const empty = detectHtml(view({ state: 'empty' }), t);
        expect(empty).not.toContain('footer--ready');
        expect(empty).toContain('id="dt-cancel"');
    });
    test('the footer has the field, filled with what the person typed, and the preview', () => {
        const html = detectHtml(view({ sectionName: 'My lab', autoSections: ['Home'], preview: [{ title: 'My lab', tiles: [{ name: 'Plex', iconUrl: '' }] }] }), t);
        expect(html).toContain('id="dt-section" value="My lab" placeholder="Home"');
        expect(html).toContain('id="dt-preview"');
        expect(html).toContain('class="preview__title" title="My lab">My lab<');
        expect(detectHtml(view({ state: 'empty' }), t)).not.toContain('id="dt-section"');
    });
    test('the preview shows a box for each section with its tiles (eighteen at most), a letter where there is no icon, and how many more', () => {
        const tiles = Array.from({ length: 25 }, (_, i) => ({ name: `s${i}`, iconUrl: i === 0 ? '/api/icons/x' : '' }));
        const html = previewHtml([{ title: 'A', tiles }, { title: 'B', tiles: [{ name: 'p', iconUrl: '' }] }], t);
        expect(html.match(/preview__box/g)?.length).toBe(2);
        expect(html).toContain('<img src="/api/icons/x"');
        expect(html).toContain('tile__letter">S<');
        expect(html).toContain('tile--more">+7<');
        expect(previewHtml([], t)).toContain('[detect.preview_none]');
    });
    test('what is typed in a name or a title is escaped in the preview', () => {
        const html = previewHtml([{ title: evil, tiles: [{ name: evil, iconUrl: '' }] }], t);
        expect(html).not.toContain('<img src=x');
    });
    test('the field says whether the title is taken on the board: free, there already, or a mix', () => {
        const have = ['Media', 'Lab'];
        const sec = (...titles: string[]) => titles.map(title => ({ title, tiles: [] }));
        expect(sectionStatus({ preview: [], boardSections: have }).kind).toBe('none');
        expect(sectionStatus({ preview: sec('lab'), boardSections: have }).kind).toBe('exists');
        expect(sectionStatus({ preview: sec(' LAB '), boardSections: have }).kind).toBe('exists');
        expect(sectionStatus({ preview: sec('New'), boardSections: have }).kind).toBe('free');
        expect(sectionStatus({ preview: sec('Media', 'New', 'Other'), boardSections: have })).toEqual({ kind: 'mixed', existing: 1, created: 2 });
        expect(sectionStatus({ preview: sec('X'), boardSections: [] }).kind).toBe('free');
    });
    test('it says so in words, on the line of the field, and nothing while nothing is ticked', () => {
        expect(sectionStatusHtml({ kind: 'none', existing: 0, created: 0 }, t)).toBe('');
        expect(sectionStatusHtml({ kind: 'exists', existing: 1, created: 0 }, t)).toContain('[detect.section_exists]');
        expect(sectionStatusHtml({ kind: 'free', existing: 0, created: 1 }, t)).toContain('[detect.section_free]');
        expect(sectionStatusHtml({ kind: 'mixed', existing: 1, created: 2 }, t)).toContain('{&quot;existing&quot;:&quot;1&quot;,&quot;created&quot;:&quot;2&quot;}');
        const html = detectHtml(view({ preview: [{ title: 'Lab', tiles: [] }], boardSections: ['lab'] }), t);
        expect(html).toMatch(/id="dt-section-status" role="status">.*detect\.section_exists/);
        // It is inside the box of the title, after the field.
        expect(html).toMatch(/<input type="text" id="dt-section"[^>]*><span class="status status--exists"/);
        expect(html).not.toContain('class="existing"');
    });
});

describe('a console is not read as an address', () => {
    test('a row whose address is its console says what it does, and keeps the address as its tooltip', () => {
        const html = rowHtml(row({ console: true, url: 'https://pve:8006/#v1:0:=lxc%2F1' }), t);
        expect(html).toContain('row__addr--console" title="https://pve:8006/#v1:0:=lxc%2F1">[detect.console_label]<');
        expect(rowHtml(row(), t)).not.toContain('row__addr--console');
    });
    test('the only-answering button is there to be shown, and hidden until some answer and some do not', () => {
        expect(detectHtml(view({ rows: [row({ health: 'up' }), row({ key: 'b', health: 'down' })] }), t)).toMatch(/id="dt-only-up">/);
        expect(detectHtml(view({ rows: [row({ health: 'up' })] }), t)).toMatch(/id="dt-only-up" hidden>/);
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
        expect(rowHtml(row({ note: 'stopped' }), (k) => k)).toContain('<span class="chip" title="detect.note_stopped">detect.note_stopped</span>');
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

describe('what a Docker window no longer asks for up front', () => {
    test('nothing above the tools is asked up front, and the host only when there are several', () => {
        const one = detectHtml(view(), t);
        expect(one).not.toContain('class="controls"');
        expect(one).not.toContain('id="dt-host"');
        expect(one).not.toContain('id="dt-address"');
        expect(one).not.toContain('id="dt-group"');
        expect(detectHtml(view({ hosts: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }), t)).toContain('class="tools__host"');
    });
    test('the address the ports are built on is a line of the head, with a button to change it', () => {
        const line = addressLineHtml({ address: '10.0.0.2', addressEditing: false }, t);
        expect(line).toContain('[detect.address_based:{&quot;address&quot;:&quot;10.0.0.2&quot;}]');
        expect(line).toContain('id="dt-addr-change"');
        expect(line).not.toContain('id="dt-address"');
    });
    test('while it is changed the line is its field and a button to leave it, and what is in it is escaped', () => {
        const line = addressLineHtml({ address: evil, addressEditing: true }, t);
        expect(line).toContain('id="dt-address"');
        expect(line).toContain('id="dt-addr-done"');
        expect(line).not.toContain('<img src=x');
    });
    test('one section for each project is a switch under the section field, only where there are projects, and off while a title is typed', () => {
        expect(detectHtml(view(), t)).not.toContain('id="dt-by-project"');
        const on = detectHtml(view({ hasProjects: true, groupBy: 'project' }), t);
        expect(on).toMatch(/id="dt-by-project" checked>/);
        expect(on).toContain('[detect.group_project]');
        expect(detectHtml(view({ hasProjects: true, sectionName: 'Lab' }), t)).toMatch(/id="dt-by-project" disabled>/);
    });
});
