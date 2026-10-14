

import { dashboardStore } from '../../../store/dashboardStore';
import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';
import { clockTimezone, searchCities } from '../../../services/cityGeocoder';
import { apiService } from '../../../services/apiService';
import '../Select/Select';
import type { AppSelect } from '../Select/Select';
import type { SelectOption } from '../Select/Select.template';
import '../ColorPicker/ColorPicker';
import css from './WidgetConfigModal.css' with { type: 'text' };
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { appearanceControlsTemplate } from './WidgetConfigModal.template';
import { setupPasswordToggles } from '../../../services/passwordToggle';
import { API_PRESETS, getPreset } from '../../../widgets/apiPresets';
import { cleanWidgetTitle, widgetTakesPill } from '../../../services/widgetTitle';
import { DEFAULT_TELEMETRY_INTERVAL, TELEMETRY_INTERVALS, telemetryInterval } from '../../../widgets/core/telemetryInterval';
import { loadProxmox } from '../../../services/proxmoxApi';
import { listWidgetSecrets, saveWidgetSecrets } from '../../../services/widgetSecrets';
import { secretsPatch, SECRET_MASK, type SecretChange } from '../../../services/secretField';
import { dockerSecretName, hostTokenChange } from '../../../services/dockerHostSecret';
import { HEADER_NAME, planApiSecrets } from '../../../widgets/apiSecrets';
import { testRemoteStats } from '../../../services/remoteStats';
import { telemetrySource } from '../../../widgets/core/remoteTelemetry';
import {
    applySourceVisibility, describeTest, readSourceSettings, secretChanges,
    showSavedSecrets, sourceOptions, telemetrySourceTemplate, wireSecretBoxes,
} from './TelemetrySourceForm';
import {
    type DockerContainer,
    type DockerHost,
    containerName,
    defaultContainerUrl,
    fetchContainers,
    hostErrorKey,
    fetchAgentVersion,
    shortId,
} from '../../../services/dockerShared';

const ICON_EDIT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
const esc = (s: string): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

class WidgetConfigModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private currentItem: GridItem | null = null;
    /** Which host's containers the Docker form is showing. */
    private _dockerSelectedHost = '';
    /** The zone of a city picked from the clock's list during this edit. */
    private _clockPickedTimezone: string | null = null;
    private _selectedColor: string = '#333333';
    private _selectedBorderWidth: number = 1;
    private _widgetTitle: string = '';

    private readonly premiumColors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#64748b', '#f8fafc', '#1e293b', '#333333'
    ];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
        setupPasswordToggles(this.shadowRoot!);
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners(); // Initial setup
    }

    /** The Docker agent tokens that are saved, by secret name, as of opening. */
    private _dockerSaved = new Set<string>();
    /** What the host forms decided about tokens; applied when the widget is saved. */
    private _dockerPending: Record<string, SecretChange> = {};
    /** A token just typed for a host that is not saved yet, to try it before saving. */
    private _dockerTyped: Record<string, string> = {};

    open(item: GridItem) {
        this.currentItem = item;
        this._dockerSaved = new Set();
        this._dockerPending = {};
        this._dockerTyped = {};
        listWidgetSecrets(item.id).then(r => { this._dockerSaved = new Set(r.names); }).catch(() => { });
        // Each widget starts on its own active host, not on whatever was
        // selected the last time this dialog was open for another one.
        this._dockerSelectedHost = '';
        // A city picked in an earlier edit, or an edit that was cancelled, is not
        // this clock's.
        this._clockPickedTimezone = null;

        // Init Appearance State
        let content: any = {};
        try {
            content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
        } catch (e) {
            console.error('Failed to parse content', e);
        }
        this._selectedColor = content.borderColor || '';
        this._selectedBorderWidth = content.borderWidth || 1;
        this._widgetTitle = cleanWidgetTitle(content.title);

        this.render();

        // Re-bind listeners after render
        this.setupEventListeners();

        // Pick the tab before showing, so the modal is laid out once instead of
        // being reflowed while already on screen.
        this.switchTab('general');

        if (this.dialog) this.dialog.showModal();
    }


    close() {
        if (this.dialog) this.dialog.close();
        this.currentItem = null;
    }

    private setupEventListeners() {
        if (!this.shadowRoot) return;

        // Tab Switching
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = (e.currentTarget as HTMLElement).dataset.tab;
                if (tabName) this.switchTab(tabName);
            });
        });

        // Close button
        this.shadowRoot.getElementById('close-btn')?.addEventListener('click', () => this.close());

        // Save button
        this.shadowRoot.getElementById('save-btn')?.addEventListener('click', () => this.save());

        // Widget-specific bindings
        if (this.currentItem) {
            const content = typeof this.currentItem.content === 'string'
                ? JSON.parse(this.currentItem.content)
                : this.currentItem.content;
            const widgetId = content.widgetId;

            if (widgetId === 'clock') {
                const clockSearchBtn = this.shadowRoot.getElementById('clock-search-btn');
                if (clockSearchBtn) {
                    clockSearchBtn.addEventListener('click', () => this.searchClockCity());
                }
                // Typing after picking a city means the picked zone no longer
                // belongs to what is in the box.
                this.shadowRoot.getElementById('clock-city')?.addEventListener('input', () => {
                    this._clockPickedTimezone = null;
                });
            } else if (widgetId === 'weather') {
                const weatherSearchBtn = this.shadowRoot.getElementById('weather-search-btn');
                if (weatherSearchBtn) {
                    weatherSearchBtn.addEventListener('click', () => this.searchWeatherCity());
                }

                const forecastCheck = this.shadowRoot.getElementById('weather-forecast') as HTMLInputElement;
                const daysRow = this.shadowRoot.getElementById('weather-days-row');
                if (forecastCheck && daysRow) {
                    forecastCheck.addEventListener('change', () => {
                        daysRow.style.display = forecastCheck.checked ? '' : 'none';
                    });
                }

                // Stepper
                const daysInput = this.shadowRoot.getElementById('weather-days') as HTMLInputElement;
                const decBtn = this.shadowRoot.getElementById('weather-days-dec');
                const incBtn = this.shadowRoot.getElementById('weather-days-inc');
                if (daysInput && decBtn && incBtn) {
                    decBtn.addEventListener('click', () => {
                        const v = parseInt(daysInput.value) || 1;
                        if (v > 1) daysInput.value = String(v - 1);
                    });
                    incBtn.addEventListener('click', () => {
                        const v = parseInt(daysInput.value) || 1;
                        if (v < 6) daysInput.value = String(v + 1);
                    });
                }
            } else if (widgetId === 'telemetry') {
                // "At least one" guard: prevent deselecting all metric toggles
                this.shadowRoot.querySelectorAll('.metric-toggle').forEach(toggle => {
                    toggle.addEventListener('change', () => {
                        const all = Array.from(
                            this.shadowRoot!.querySelectorAll<HTMLInputElement>('.metric-toggle')
                        );
                        const checked = all.filter(cb => cb.checked);
                        if (checked.length === 0) {
                            // Re-check the one that was just unchecked
                            (toggle as HTMLInputElement).checked = true;
                        }
                    });
                });
            } else if (widgetId === 'proxmox') {
                this.setupProxmoxEvents(content);
            } else if (widgetId === 'monitor') {
                this.setupMonitorEvents(content);
            } else if (widgetId === 'docker') {
                this.setupDockerEvents();
            } else if (widgetId === 'api') {
                const methodSel = this.shadowRoot.getElementById('api-method') as AppSelect | null;
                if (methodSel) methodSel.options = [
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                ];
                const viewSel = this.shadowRoot.getElementById('api-view') as AppSelect | null;
                if (viewSel) {
                    viewSel.options = [
                        { value: 'metrics', label: i18n.t('widget.api.view_metrics') || 'Metrics' },
                        { value: 'list', label: i18n.t('widget.api.view_list') || 'List' },
                    ];
                    // The array path only means anything in list view.
                    viewSel.addEventListener('change', () => {
                        const group = this.shadowRoot?.getElementById('api-array-group');
                        if (group) group.style.display = viewSel.value === 'list' ? 'flex' : 'none';
                    });
                }

                const refreshSel = this.shadowRoot.getElementById('api-refresh') as AppSelect | null;
                if (refreshSel) refreshSel.options = [
                    { value: '30', label: '30s' },
                    { value: '60', label: '1m' },
                    { value: '300', label: '5m' },
                    { value: '600', label: '10m' },
                ];

                const presetSel = this.shadowRoot.getElementById('api-preset') as AppSelect | null;
                if (presetSel) {
                    // Advanced first, then presets grouped under category headers.
                    const catOrder = ['media', 'network', 'infra', 'files', 'downloads', 'dev'];
                    const opts: SelectOption[] = [
                        { value: '', label: i18n.t('widget.api.preset_custom') || 'Advanced (custom)' },
                    ];
                    for (const cat of catOrder) {
                        const inCat = API_PRESETS.filter(p => p.category === cat);
                        if (!inCat.length) continue;
                        opts.push({ value: '', label: i18n.t('widget.api.cat.' + cat), header: true });
                        for (const p of inCat) opts.push({ value: p.id, label: p.name });
                    }
                    presetSel.options = opts;
                    // The list is long enough that scanning it is slower than
                    // typing the service name. Same wording as the status page
                    // search, which does the same job.
                    presetSel.searchable = true;
                    presetSel.searchPlaceholder = i18n.t('monitor.search_placeholder');
                }

                const applyPresetUI = (id: string) => {
                    const simple = this.shadowRoot!.getElementById('api-simple') as HTMLElement | null;
                    const advanced = this.shadowRoot!.getElementById('api-advanced') as HTMLElement | null;
                    const p = getPreset(id);
                    if (simple) simple.style.display = p ? 'block' : 'none';
                    if (advanced) advanced.style.display = p ? 'none' : 'grid';
                    // Only the advanced form needs the two-column layout; the
                    // preset form is four fields and looks lost when stretched.
                    this.shadowRoot!.getElementById('modal')?.classList.toggle('dialog--wide', !p);
                    if (p) {
                        const keyLabel = this.shadowRoot!.getElementById('api-key-label');
                        const keyHint = this.shadowRoot!.getElementById('api-key-hint');
                        const keyGroup = this.shadowRoot!.getElementById('api-key-group') as HTMLElement | null;
                        const baseInput = this.shadowRoot!.getElementById('api-baseurl') as HTMLInputElement | null;
                        if (keyLabel) keyLabel.textContent = i18n.t(p.keyLabelKey);
                        if (keyHint) keyHint.textContent = p.keyHintKey ? i18n.t(p.keyHintKey) : '';
                        if (keyGroup) keyGroup.style.display = p.needsKey ? 'block' : 'none';
                        if (baseInput) baseInput.placeholder = p.urlPlaceholder;

                        // Third field: only the presets that address a specific
                        // node/entity/page ask for it.
                        const extraGroup = this.shadowRoot!.getElementById('api-extra-group') as HTMLElement | null;
                        const extraLabel = this.shadowRoot!.getElementById('api-extra-label');
                        const extraHint = this.shadowRoot!.getElementById('api-extra-hint');
                        const extraInput = this.shadowRoot!.getElementById('api-extra') as HTMLInputElement | null;
                        if (extraGroup) extraGroup.style.display = p.extraLabelKey ? 'block' : 'none';
                        if (extraLabel && p.extraLabelKey) extraLabel.textContent = i18n.t(p.extraLabelKey);
                        if (extraHint) extraHint.textContent = p.extraHintKey ? i18n.t(p.extraHintKey) : '';
                        if (extraInput) extraInput.placeholder = p.extraPlaceholder || '';
                    }
                };
                if (presetSel) {
                    presetSel.addEventListener('change', (e: any) => applyPresetUI(e.detail));
                    applyPresetUI(presetSel.value || '');
                }
            }
        }

        // Appearance Controls Listeners
        this.shadowRoot.querySelectorAll('.premium-color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const el = e.currentTarget as HTMLElement;
                if (el.classList.contains('premium-color-swatch--custom')) return; // handled by input

                this._selectedColor = el.dataset.color!;
                this.updateAppearanceUI();
            });
        });

        const colorInput = this.shadowRoot.getElementById('widget-borderColor') as HTMLInputElement;
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                this._selectedColor = (e.target as HTMLInputElement).value;
                this.updateAppearanceUI();
            });
        }

        this.shadowRoot.querySelectorAll('.border-width-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const el = e.currentTarget as HTMLElement;
                this._selectedBorderWidth = parseInt(el.dataset.width!);
                this.updateAppearanceUI();
            });
        });
    }

    private updateAppearanceUI() {
        if (!this.shadowRoot) return;

        // Update Swatches
        this.shadowRoot.querySelectorAll('.premium-color-swatch').forEach(swatch => {
            const el = swatch as HTMLElement;
            const color = el.dataset.color;
            const isCustom = el.classList.contains('premium-color-swatch--custom');

            if (color) {
                // Preset
                if (color === this._selectedColor) {
                    el.classList.add('active');
                    if (!el.querySelector('svg')) {
                        el.innerHTML += '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>';
                    }
                } else {
                    el.classList.remove('active');
                    const svg = el.querySelector('svg');
                    if (svg) svg.remove();
                }
            } else if (isCustom) {
                // Custom
                const isCustomColor = !this.premiumColors.includes(this._selectedColor) && this._selectedColor !== '';
                el.classList.toggle('active', isCustomColor);

                const svg = el.querySelector('svg');
                if (svg) svg.style.fill = isCustomColor ? '#fff' : 'rgba(255,255,255,0.4)';

                const input = this.shadowRoot?.getElementById('widget-borderColor') as HTMLInputElement;
                if (input && isCustomColor) input.value = this._selectedColor;

                if (isCustomColor) el.style.backgroundColor = this._selectedColor;
                else el.style.backgroundColor = '#333';
            }
        });

        // Update Width Buttons
        this.shadowRoot.querySelectorAll('.border-width-btn').forEach(btn => {
            const w = parseInt((btn as HTMLElement).dataset.width!);
            btn.classList.toggle('active', w === this._selectedBorderWidth);
        });
    }

    private switchTab(tabName: string) {
        if (!this.shadowRoot) return;

        // Update Buttons
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabName);
        });

        // Update Content
        this.shadowRoot.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    private async save() {
        if (!this.currentItem) return;

        // Parse existing content
        const oldContent = typeof this.currentItem.content === 'string'
            ? JSON.parse(this.currentItem.content)
            : this.currentItem.content;

        const widgetId = oldContent.widgetId;
        let newContent = { ...oldContent };

        if (widgetId === 'clock') {
            const cityInput = this.shadowRoot?.getElementById('clock-city') as HTMLInputElement;
            const h12Input = this.shadowRoot?.getElementById('clock-12h') as HTMLInputElement;
            const dateInput = this.shadowRoot?.getElementById('clock-date') as HTMLInputElement;
            const cityDisplayInput = this.shadowRoot?.getElementById('clock-show-city') as HTMLInputElement;
            const saveBtn = this.shadowRoot?.getElementById('save-btn') as any;

            const city = cityInput?.value || '';

            // Show loading state
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = i18n.t('general.loading');
            }

            const timezone = await clockTimezone({
                city,
                previousCity: oldContent.city,
                previousTimezone: oldContent.timezone,
                picked: this._clockPickedTimezone,
                language: i18n.getLocale().code,
            });

            newContent.city = city;
            newContent.timezone = timezone;
            newContent.hour12 = h12Input?.checked || false;
            newContent.showDate = dateInput?.checked || false;
            newContent.showCity = cityDisplayInput?.checked ?? true;
            newContent.showSeconds = (this.shadowRoot?.getElementById('clock-seconds') as HTMLInputElement)?.checked ?? true;

            this._clockPickedTimezone = null;

            // Restore button state
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = i18n.t('general.save');
            }
        } else if (widgetId === 'weather') {
            const cityInput = this.shadowRoot?.getElementById('weather-city') as HTMLInputElement;
            const latInput = this.shadowRoot?.getElementById('weather-lat') as HTMLInputElement;
            const lonInput = this.shadowRoot?.getElementById('weather-lon') as HTMLInputElement;
            const forecastInput = this.shadowRoot?.getElementById('weather-forecast') as HTMLInputElement;
            const daysInput = this.shadowRoot?.getElementById('weather-days') as HTMLInputElement;

            newContent.city = cityInput?.value || '';
            newContent.latitude = parseFloat(latInput?.value) || 0;
            newContent.longitude = parseFloat(lonInput?.value) || 0;
            newContent.showForecast = forecastInput?.checked || false;
            newContent.forecastDays = parseInt(daysInput?.value) || 5;
            delete newContent.unit;
        // Notepad and Markdown are written in the widget itself, not here: their
        // settings form only points at the Personalize tab. Saving used to read
        // a `#notepad-text` / `#markdown-text` field that this form has never
        // rendered, so `textInput` was always null and the fallback wrote an
        // empty string over the note. Changing a border colour erased what you
        // had written. The text is already in `newContent` — leave it there.
        } else if (widgetId === 'api') {
            const val = (id: string) => (this.shadowRoot?.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)?.value ?? '';
            newContent.title = val('api-title').trim();
            const presetId = val('api-preset');

            if (presetId) {
                // Guided preset: compose the whole config from base URL + key.
                const preset = getPreset(presetId);
                const base = val('api-baseurl').trim();
                // The key is never in the content: what the box holds is only
                // whether there is one, and the server fills the templates in.
                const hasKey = val('api-key') !== '';
                const extra = val('api-extra').trim();
                if (preset) {
                    const cfg = preset.build(base, hasKey, extra);
                    newContent.preset = presetId;
                    newContent.baseUrl = base;
                    delete newContent.apiKey;
                    delete newContent.secret_headers;
                    newContent.apiExtra = extra;
                    newContent.url = cfg.url;
                    newContent.method = cfg.method || 'GET';
                    newContent.headers = cfg.headers || {};
                    newContent.arrayPath = cfg.arrayPath || '';
                    // Presets that point at an array are list widgets; state it
                    // rather than leaving the widget to infer it.
                    newContent.viewMode = cfg.arrayPath ? 'list' : 'metrics';
                    newContent.mappings = cfg.mappings || [];
                    newContent.refreshSec = cfg.refreshSec || 60;
                }
            } else {
                // Advanced (manual). Names stay in the widget; values are secrets.
                const mappings: { label: string; path: string; format?: string }[] = [];
                val('api-fields').split('\n').forEach(line => {
                    if (!line.trim()) return;
                    const eq = line.indexOf('=');
                    if (eq < 0) return;
                    const label = line.slice(0, eq).trim();
                    let rest = line.slice(eq + 1).trim();
                    let format: string | undefined;
                    const pipe = rest.lastIndexOf('|');
                    if (pipe >= 0) {
                        format = rest.slice(pipe + 1).trim().toLowerCase() || undefined;
                        rest = rest.slice(0, pipe).trim();
                    }
                    if (rest) mappings.push({ label, path: rest, format });
                });
                newContent.preset = '';
                newContent.url = val('api-url').trim();
                newContent.method = val('api-method') || 'GET';
                delete newContent.headers;
                delete newContent.apiKey;
                newContent.viewMode = val('api-view') === 'list' ? 'list' : 'metrics';
                // Only meaningful in list view; clearing it keeps the saved config
                // honest about what the widget will render.
                newContent.arrayPath = newContent.viewMode === 'list' ? val('api-array').trim() : '';
                newContent.mappings = mappings;
                newContent.refreshSec = parseInt(val('api-refresh')) || 60;
            }

            const root = this.shadowRoot!;
            const keyBox = root.getElementById('api-key') as HTMLInputElement | null;
            const plan = planApiSecrets({
                preset: !!presetId,
                rows: Array.from(root.querySelectorAll<HTMLElement>('.header-row')).map(row => {
                    const name = (row.querySelector('.api-header-name') as HTMLInputElement).value.trim();
                    const box = row.querySelector('.api-header-value') as HTMLInputElement;
                    // Dots only mean "saved" for the name they were saved under.
                    return { name, raw: box.value, saved: box.dataset.saved === '1' && box.dataset.name === name };
                }).filter(r => r.name === '' || HEADER_NAME.test(r.name)),
                keyRaw: keyBox?.value ?? '',
                keySaved: keyBox?.dataset.saved === '1',
                previousHeaderNames: this._savedHeaderNames(),
                hadKey: keyBox?.dataset.saved === '1',
            });
            if (plan.headerNames.length) newContent.secret_headers = plan.headerNames;
            else delete newContent.secret_headers;
            if (plan.patch) {
                try {
                    await saveWidgetSecrets(this.currentItem.id, plan.patch);
                } catch {
                    return;
                }
            }
        } else if (widgetId === 'proxmox') {
            const titleInput = this.shadowRoot?.getElementById('proxmox-title') as HTMLInputElement | null;
            newContent.title = (titleInput?.value || '').trim();

            const refreshSel = this.shadowRoot?.getElementById('proxmox-refresh') as HTMLSelectElement | null;
            newContent.refreshSec = parseInt(refreshSel?.value || '') || 30;

            const nodeToggle = this.shadowRoot?.getElementById('proxmox-shownode') as HTMLInputElement | null;
            newContent.showNode = nodeToggle ? nodeToggle.checked : true;
        } else if (widgetId === 'monitor') {
            // An empty selection means "every monitored service", which is also
            // what a fresh widget starts with — so it keeps working when the
            // user adds services later without reopening this screen.
            const checked = Array.from(
                this.shadowRoot?.querySelectorAll<HTMLInputElement>('.monitor-service:checked') || []
            ).map(cb => parseInt(cb.dataset.id || '0', 10)).filter(id => id > 0);
            const total = this.shadowRoot?.querySelectorAll('.monitor-service').length || 0;
            newContent.items = (checked.length === total) ? [] : checked;

            const titleInput = this.shadowRoot?.getElementById('monitor-title') as HTMLInputElement | null;
            newContent.title = (titleInput?.value || '').trim();

            const refreshSel = this.shadowRoot?.getElementById('monitor-refresh') as HTMLSelectElement | null;
            newContent.refreshSec = parseInt(refreshSel?.value || '') || 60;
        } else if (widgetId === 'docker') {
            const titleInput = this.shadowRoot?.getElementById('docker-title') as HTMLInputElement | null;
            newContent.title = (titleInput?.value || '').trim();

            const refreshSel = this.shadowRoot?.getElementById('docker-refresh') as HTMLSelectElement | null;
            newContent.refreshSec = parseInt(refreshSel?.value || '') || 60;

            // Start from what is stored rather than from scratch: a host that
            // failed to answer drew no rows, and its containers must keep their
            // icons and names instead of being wiped by a save.
            const cfg: Record<string, any> = { ...(newContent.containerConfig || {}) };

            this.shadowRoot?.querySelectorAll<HTMLElement>('.docker-container-row').forEach(row => {
                const sid = row.dataset.sid;
                if (!sid) return;

                const visible = row.querySelector<HTMLInputElement>('.docker-container')?.checked ?? true;
                const label = row.querySelector<HTMLInputElement>('.docker-label')?.value.trim() || '';
                const url = row.querySelector<HTMLInputElement>('.docker-url')?.value.trim() || '';
                const entry: Record<string, any> = { ...(cfg[sid] || {}) };
                if (label) entry.label = label; else delete entry.label;
                // Only an explicit address is stored. An empty field means the
                // widget keeps deriving one, so it follows the container.
                if (url) entry.url = url; else delete entry.url;
                if (visible) delete entry.hidden; else entry.hidden = true;
                // Don't keep an entry that no longer says anything.
                if (Object.keys(entry).length) cfg[sid] = entry;
                else delete cfg[sid];
            });

            newContent.containerConfig = cfg;

            // No host carries its token in the widget; the ones that changed go to the store.
            if (Array.isArray(newContent.hosts)) {
                newContent.hosts = newContent.hosts.map((h: any) => { const { token: _gone, ...rest } = h; return rest; });
            }
            const dockerPatch = secretsPatch(this._dockerPending);
            if (dockerPatch) {
                try {
                    await saveWidgetSecrets(this.currentItem!.id, dockerPatch);
                } catch {
                    return;
                }
                this._dockerPending = {};
            }
        } else if (widgetId === 'telemetry') {
            for (const k of ['source', 'url', 'username', 'header_name', 'cpu_path', 'ram_path', 'ram_used_path', 'ram_total_path', 'temp_path', 'link']) delete newContent[k];
            Object.assign(newContent, this.shadowRoot ? readSourceSettings(this.shadowRoot) : {});
            const patch = this.shadowRoot ? secretsPatch(secretChanges(this.shadowRoot)) : null;
            if (patch) {
                try {
                    await saveWidgetSecrets(this.currentItem!.id, patch);
                } catch {
                    const result = this.shadowRoot?.getElementById('tel-test-result');
                    if (result) result.textContent = i18n.t('general.error');
                    return;
                }
            }
            const intervalInput = this.shadowRoot?.getElementById('telemetry-interval') as HTMLSelectElement;
            newContent.interval = intervalInput ? telemetryInterval(intervalInput.value) : DEFAULT_TELEMETRY_INTERVAL;

            // Collect selected metrics (guarantee at least one)
            const allKeys = ['cpu', 'ram', 'temp'];
            const selected = allKeys.filter(k =>
                (this.shadowRoot?.getElementById(`metric-${k}`) as HTMLInputElement)?.checked
            );
            newContent.metrics = selected.length > 0 ? selected : allKeys;

            // Auto-resize grid cell based on metric count
            const sizeMap: Record<number, { w: number; h: number }> = {
                1: { w: 1, h: 1 },
                2: { w: 2, h: 1 },
                3: { w: 3, h: 1 }
            };
            const newSize = sizeMap[newContent.metrics.length] ?? { w: 3, h: 1 };

            // Persist appearance + content, then resize
            newContent.borderColor = this._selectedColor;
            newContent.borderWidth = this._selectedBorderWidth;
            this._writeTitle(newContent);
            await dashboardStore.updateItem({
                id: this.currentItem!.id,
                content: JSON.stringify(newContent),
                w: newSize.w,
                h: newSize.h
            });
            this.close();
            return; // Skip the generic updateItem below
        }

        if (this.currentItem.type === 'section') {
            const titleInput = this.shadowRoot?.getElementById('section-title') as HTMLInputElement;
            newContent.title = titleInput ? titleInput.value : '';
            // Remove name if present (legacy)
            delete newContent.name;
        }

        // Persist Appearance
        newContent.borderColor = this._selectedColor;
        newContent.borderWidth = this._selectedBorderWidth;
        this._writeTitle(newContent);

        // Optimistic / Store update
        await dashboardStore.updateItem({
            id: this.currentItem.id,
            content: JSON.stringify(newContent)
        });

        this.close();
    }

    /** A widget offers a title; a section has its own field and nothing else does. */
    private _titleForForm(): string | null {
        return this._takesPill() ? this._widgetTitle : null;
    }

    private _takesPill(): boolean {
        if (this.currentItem?.type !== 'widget') return false;
        const c = typeof this.currentItem.content === 'string' ? JSON.parse(this.currentItem.content) : this.currentItem.content;
        return widgetTakesPill(c?.widgetId);
    }

    /** Writes the title the person typed, or removes it: no name, no pill. */
    private _writeTitle(content: any) {
        if (!this._takesPill()) return;
        const input = this.shadowRoot?.getElementById('widget-title') as HTMLInputElement | null;
        const title = cleanWidgetTitle(input ? input.value : this._widgetTitle);
        if (title) content.title = title; else delete content.title;
    }

    render() {
        if (!this.shadowRoot) return;

        // Parse content to pre-fill
        let content: any = {};
        let widgetId = '';
        if (this.currentItem) {
            content = typeof this.currentItem.content === 'string'
                ? JSON.parse(this.currentItem.content)
                : this.currentItem.content;
            widgetId = content.widgetId;
        }

        const esc = (s: string): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const renderForm = () => {
            const renderAppearanceControls = () => appearanceControlsTemplate(this.premiumColors, this._selectedColor, this._selectedBorderWidth, this._titleForForm());

            if (!this.currentItem) return { general: '', customization: '' };

            // --- CLOCK ---
            if (widgetId === 'clock') {
                const city = content.city || '';
                const h12 = content.hour12 || false;
                const showDate = content.showDate !== false;
                const showCity = content.showCity !== false;

                const generalTab = `
                    <div class="field-group">
                        <label>${i18n.t('widget.clock.city')}</label>
                        <div class="input-row">
                            <input type="text" id="clock-city" value="${esc(city)}" placeholder="${i18n.t('widget.clock.city_placeholder')}"/>
                            <app-button variant="ghost" id="clock-search-btn">${i18n.t('widget.weather.search')}</app-button>
                        </div>
                        <small>${i18n.t('widget.clock.city_desc')}</small>
                    </div>

                    <div class="field-group" id="clock-results-container" style="display:none;">
                        <label>${i18n.t('widget.weather.results')}</label>
                        <div id="clock-results" class="weather-results"></div>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${h12 ? 'checked' : ''} />
                        <label for="clock-12h">${i18n.t('widget.clock.use_12h')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${showDate ? 'checked' : ''} />
                        <label for="clock-date">${i18n.t('widget.clock.show_date')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-show-city" ${showCity ? 'checked' : ''} />
                        <label for="clock-show-city">${i18n.t('widget.clock.show_city')}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-seconds" ${content.showSeconds === true ? 'checked' : ''} />
                        <label for="clock-seconds">${i18n.t('widget.clock.show_seconds')}</label>
                    </div>
                `;

                const customizationTab = ``;

                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

                // --- WEATHER ---
            } else if (widgetId === 'weather') {
                const city = content.city || '';
                const lat = content.latitude || '';
                const lon = content.longitude || '';
                const showForecast = content.showForecast || false;
                const forecastDays = content.forecastDays || 5;

                const generalTab = `
                    <div class="field-group">
                        <label>${i18n.t('widget.weather.city')}</label>
                        <div class="input-row">
                            <input type="text" id="weather-city" value="${esc(city)}" placeholder="${i18n.t('widget.weather.city_placeholder')}"/>
                            <app-button variant="ghost" id="weather-search-btn">${i18n.t('widget.weather.search')}</app-button>
                        </div>
                        <small>${i18n.t('widget.weather.city_desc')}</small>
                    </div>

                    <div class="field-group" id="weather-results-container" style="display:none;">
                        <label>${i18n.t('widget.weather.results')}</label>
                        <div id="weather-results" class="weather-results"></div>
                    </div>

                    <div class="field-group">
                        <label>${i18n.t('widget.weather.coordinates')}</label>
                        <div class="input-row">
                            <input type="number" id="weather-lat" value="${lat}" placeholder="${i18n.t('general.latitude')}" step="0.0001" />
                            <input type="number" id="weather-lon" value="${lon}" placeholder="${i18n.t('general.longitude')}" step="0.0001" />
                        </div>
                    </div>

                    <div class="field-group check-row" style="margin-top: 16px;">
                        <input type="checkbox" id="weather-forecast" ${showForecast ? 'checked' : ''} />
                        <label for="weather-forecast">${i18n.t('widget.weather.show_forecast')}</label>
                    </div>

                    <div class="field-group row-aligned" id="weather-days-row" ${!showForecast ? 'style="display:none; margin-top: 16px;"' : 'style="margin-top: 16px;"'}>
                        <label>${i18n.t('widget.weather.forecast_days')}</label>
                        <div class="stepper-wrap">
                            <button type="button" class="stepper-btn" id="weather-days-dec">&minus;</button>
                            <input type="number" id="weather-days" value="${forecastDays}" min="1" max="6" />
                            <button type="button" class="stepper-btn" id="weather-days-inc">+</button>
                        </div>
                    </div>
                `;

                const customizationTab = ``;

                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

                // --- TELEMETRY ---
            } else if (widgetId === 'telemetry') {
                const interval = telemetryInterval(content.interval);
                const activeMetrics: string[] = Array.isArray(content.metrics) ? content.metrics : ['cpu', 'ram', 'temp'];

                const metricDef = [
                    { key: 'cpu', label: i18n.t('widget.telemetry.cpu'), icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>` },
                    { key: 'ram', label: i18n.t('widget.telemetry.ram'), icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="2" y="7" width="20" height="10" rx="1"/><line x1="6" y1="17" x2="6" y2="20"/><line x1="10" y1="17" x2="10" y2="20"/><line x1="14" y1="17" x2="14" y2="20"/><line x1="18" y1="17" x2="18" y2="20"/><line x1="5" y1="10" x2="5" y2="14"/><line x1="9" y1="10" x2="9" y2="14"/><line x1="13" y1="10" x2="13" y2="14"/></svg>` },
                    { key: 'temp', label: i18n.t('widget.telemetry.temp'), icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>` }
                ];

                const metricsRows = metricDef.map(m => `
                    <div class="metric-toggle-row">
                        <span class="metric-toggle-icon">${m.icon}</span>
                        <span class="metric-toggle-label">${m.label}</span>
                        <label class="toggle-switch">
                            <input type="checkbox" class="metric-toggle" id="metric-${m.key}" ${activeMetrics.includes(m.key) ? 'checked' : ''} data-metric="${m.key}" />
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                `).join('');

                const generalTab = `
                    ${telemetrySourceTemplate(content)}
                    <div class="field-group">
                        <label>${i18n.t('widget.telemetry.metrics') || 'Metrics'}</label>
                        <div class="metric-toggles">${metricsRows}</div>
                        <small>${i18n.t('widget.telemetry.metrics_hint') || 'At least one metric must remain active.'}</small>
                    </div>
                    <div class="field-group row-aligned">
                        <label>${i18n.t('widget.telemetry.update_interval')}</label>
                        <app-select id="telemetry-interval" value="${interval}"></app-select>
                    </div>
                `;

                const customizationTab = ``;

                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

                // --- SECTION ---
            } else if (widgetId === 'notepad') {
                const generalTab = `
                    <div style="text-align: center; padding: 32px 20px; color: var(--text-dim);">
                        <p>${i18n.t('widget.config.check_personalize')} </p>
                            </div>
                                `;

                const customizationTab = ``;
                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

            } else if (widgetId === 'markdown') {
                const generalTab = `
                    <div style="text-align: center; padding: 32px 20px; color: var(--text-dim);">
                        <p>${i18n.t('widget.config.check_personalize')}</p>
                    </div>
                `;

                const customizationTab = ``;
                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

                // --- API ---
            } else if (widgetId === 'api') {
                const title = content.title || '';
                const url = content.url || '';
                const method = content.method || 'GET';
                const refreshSec = content.refreshSec || 60;
                const arrayPath = content.arrayPath || '';
                // Widgets saved before the view was an explicit choice inferred it
                // from arrayPath; keep showing them the mode they actually get.
                const viewMode = content.viewMode || (arrayPath ? 'list' : 'metrics');
                const preset = content.preset || '';
                const baseUrl = content.baseUrl || '';
                const apiExtra = content.apiExtra || '';
                const headerNames: string[] = Array.isArray(content.secret_headers) ? content.secret_headers : [];
                const headerRows = Array.from({ length: Math.max(3, headerNames.length) }, (_, n) => `
                    <div class="header-row">
                        <input type="text" class="api-header-name" value="${esc(headerNames[n] || '')}" placeholder="X-Api-Key" spellcheck="false" autocomplete="off" aria-label="${i18n.t('widget.api.header_name')}" />
                        <input type="password" class="api-header-value" value="" spellcheck="false" autocomplete="new-password" data-secret aria-label="${i18n.t('widget.api.header_value')}" />
                    </div>`).join('');
                const fieldsText = (Array.isArray(content.mappings) ? content.mappings : [])
                    .map((m: any) => `${m.label || ''} = ${m.path || ''}${m.format ? ' | ' + m.format : ''}`).join('\n');

                const generalTab = `
                    <div class="field-group row-aligned">
                        <label>${i18n.t('widget.api.preset_label') || 'Service'}</label>
                        <app-select id="api-preset" value="${esc(preset)}"></app-select>
                    </div>
                    <div class="field-group">
                        <label>${i18n.t('widget.api.title_label') || 'Title'}</label>
                        <input type="text" id="api-title" value="${esc(title)}" placeholder="Pi-hole" />
                    </div>

                    <div id="api-simple" style="display:${preset ? 'block' : 'none'}">
                        <div class="field-group">
                            <label>${i18n.t('widget.api.base_url_label') || 'Base URL'}</label>
                            <input type="text" id="api-baseurl" value="${esc(baseUrl)}" placeholder="http://10.0.0.5:8080" />
                            <small>${i18n.t('widget.api.base_url_hint') || 'Just the address of the service — the rest is filled in for you.'}</small>
                        </div>
                        <div class="field-group" id="api-key-group">
                            <label id="api-key-label">${i18n.t('widget.api.key_apikey') || 'API Key'}</label>
                            <input type="password" id="api-key" value="" spellcheck="false" autocomplete="new-password" data-secret />
                            <small id="api-key-hint"></small>
                        </div>
                        <div class="field-group" id="api-extra-group" style="display:none">
                            <label id="api-extra-label"></label>
                            <input type="text" id="api-extra" value="${esc(apiExtra)}" spellcheck="false" placeholder="" />
                            <small id="api-extra-hint"></small>
                        </div>
                    </div>

                    <div id="api-advanced" class="field-grid" style="display:${preset ? 'none' : 'grid'}">
                        <div class="field-group field-span">
                            <label>${i18n.t('widget.api.url_label') || 'Endpoint URL'}</label>
                            <input type="text" id="api-url" value="${esc(url)}" placeholder="http://10.0.0.5/admin/api.php?summary" />
                            <small>${i18n.t('widget.api.url_hint') || 'The server fetches this JSON URL for you (reaches private IPs, no CORS).'}</small>
                        </div>
                        <div class="field-group row-aligned">
                            <label>${i18n.t('widget.api.method_label') || 'Method'}</label>
                            <app-select id="api-method" value="${method}"></app-select>
                        </div>
                        <div class="field-group row-aligned">
                            <label>${i18n.t('widget.api.view_label') || 'View'}</label>
                            <app-select id="api-view" value="${viewMode}"></app-select>
                        </div>
                        <div class="field-group">
                            <label>${i18n.t('widget.api.headers_label') || 'Headers'}</label>
                            <div id="api-header-rows" class="header-rows">${headerRows}</div>
                            <small>${i18n.t('widget.api.headers_hint')}</small>
                        </div>
                        <div class="field-group">
                            <label>${i18n.t('widget.api.fields_label') || 'Fields'}</label>
                            <textarea class="field-textarea" id="api-fields" rows="4" spellcheck="false" placeholder="Queries = dns_queries_today | number&#10;Blocked = ads_percentage_today | percent">${esc(fieldsText)}</textarea>
                            <small>${i18n.t('widget.api.fields_hint') || 'One per line: "Label = path". Path is dot/bracket (a.b[0].c). Optional "| number|bytes|percent".'}</small>
                        </div>
                        <div class="field-group field-span" id="api-array-group" style="display:${viewMode === 'list' ? 'flex' : 'none'}">
                            <label>${i18n.t('widget.api.array_label') || 'List array'}</label>
                            <input type="text" id="api-array" value="${esc(arrayPath)}" placeholder="queue.records" />
                            <small>${i18n.t('widget.api.array_hint_list') || 'Path to the array to list. The fields below are then relative to each item.'}</small>
                        </div>
                        <div class="field-group row-aligned field-span">
                            <label>${i18n.t('widget.api.refresh_label') || 'Refresh'}</label>
                            <app-select id="api-refresh" value="${refreshSec}"></app-select>
                        </div>
                    </div>
                `;

                const customizationTab = ``;
                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };

            } else if (this.currentItem.type === 'section') {
                const title = content.title || '';

                const generalTab = `
                    <div class="field-group">
                        <label>${i18n.t('bookmark.label')}</label>
                        <div class="input-row">
                            <input type="text" id="section-title" value="${esc(title)}" placeholder="${i18n.t('section.placeholder_title')}" />
                        </div>
                        <small>${i18n.t('section.leave_empty')}</small>
                    </div>
                `;

                const customizationTab = ``; // Section customization tab is empty by default, only appearance controls are added.

                return { general: generalTab, customization: customizationTab + renderAppearanceControls() };
            } else if (widgetId === 'proxmox') {
                return this.renderProxmoxForm(content);
            } else if (widgetId === 'monitor') {
                return this.renderMonitorForm(content);
            } else if (widgetId === 'docker') {
                return this.renderDockerForm(content);
            }

            return {
                general: `<p>${i18n.t('widget.config.no_config')}</p>`, customization: ''
            };
        };


        const formData = renderForm();

        this.shadowRoot.innerHTML = `
            <style>${css}</style>
            <dialog class="dialog-base" id="modal" aria-label="${i18n.t('widget.add_title') || 'Widget'}">
                <div class="modal-header">
                    <div class="integrated-tabs">
                        <button class="tab-btn active" data-tab="general">${i18n.t('general.general')}</button>
                        <button class="tab-btn" data-tab="customization">${i18n.t('general.customization')}</button>
                    </div>
                    <button class="modal-close" id="close-btn" aria-label="${i18n.t('general.close')}">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                
                <div class="tab-container">
                    <div class="content">
                         <!-- TAB: GENERAL -->
                        <div id="tab-general" class="tab-content active">
                            ${formData.general}
                        </div>

                         <!-- TAB: CUSTOMIZATION -->
                        <div id="tab-customization" class="tab-content">
                            ${formData.customization}
                        </div>
                    </div>
                </div>

                <div class="actions">
                    ${(['clock', 'telemetry', 'weather', 'notepad', 'markdown', 'docker', 'api', 'monitor', 'proxmox'].includes(widgetId) || this.currentItem?.type === 'section') ? `<app-button variant="primary" id="save-btn">${i18n.t('general.save')}</app-button>` : ''}
                </div>
                <div id="docker-host-overlay" class="docker-overlay" style="display: none;"></div>
            </dialog>
        `;

        this.dialog = this.shadowRoot.querySelector('dialog');

        this.initTelemetrySource();
        this.initApiSecrets();

        // Init Selects (if any in DOM)
        const telSelect = this.shadowRoot.getElementById('telemetry-interval') as AppSelect | null;
        if (telSelect) {
            telSelect.options = TELEMETRY_INTERVALS.map(ms => ({
                value: String(ms),
                label: i18n.formatDuration(ms / 1000),
            }));
        }
    }

    /** Shows which of the API widget's credentials are saved, as dots, and lets the first key replace them. */
    private initApiSecrets() {
        const root = this.shadowRoot;
        const key = root?.getElementById('api-key') as HTMLInputElement | null;
        if (!root || !key || !this.currentItem) return;
        root.addEventListener('focusin', (e) => {
            const el = e.target as HTMLInputElement | null;
            if (el?.matches?.('input[data-secret]')) el.select();
        });
        listWidgetSecrets(this.currentItem.id).then(({ names: saved }) => {
            const has = new Set(saved);
            if (has.has('key')) { key.value = SECRET_MASK; key.dataset.saved = '1'; }
            root.querySelectorAll<HTMLElement>('.header-row').forEach(row => {
                const name = (row.querySelector('.api-header-name') as HTMLInputElement).value.trim();
                const box = row.querySelector('.api-header-value') as HTMLInputElement;
                if (name && has.has(`header.${name.toLowerCase()}`)) { box.value = SECRET_MASK; box.dataset.saved = '1'; box.dataset.name = name; }
            });
        }).catch(() => { });
    }

    private _savedHeaderNames(): string[] {
        const c = typeof this.currentItem?.content === 'string' ? JSON.parse(this.currentItem.content) : this.currentItem?.content;
        return Array.isArray(c?.secret_headers) ? c.secret_headers : [];
    }

    /** The "where do the numbers come from" controls of the Server Health settings. */
    private initTelemetrySource() {
        const root = this.shadowRoot;
        const select = root?.getElementById('telemetry-source') as AppSelect | null;
        if (!root || !select || !this.currentItem) return;

        select.options = sourceOptions();
        select.addEventListener('change', () => applySourceVisibility(root, telemetrySource(select.value)));
        wireSecretBoxes(root);

        const id = this.currentItem.id;
        listWidgetSecrets(id).then(r => showSavedSecrets(root, r.names)).catch(() => { });

        root.getElementById('tel-test')?.addEventListener('click', async () => {
            const result = root.getElementById('tel-test-result');
            if (!result) return;
            result.textContent = i18n.t('general.loading');
            const typed = secretChanges(root);
            const password = typed.password?.action === 'set' ? typed.password.token
                : typed.header_value?.action === 'set' ? typed.header_value.token : '';
            const metrics = ['cpu', 'ram', 'temp'].filter(k => (root.getElementById(`metric-${k}`) as HTMLInputElement | null)?.checked);
            try {
                const reply = await testRemoteStats({ id, config: readSourceSettings(root), password });
                result.textContent = describeTest(reply, metrics);
            } catch {
                result.textContent = describeTest({ ok: false, error: 'unreachable' }, metrics);
            }
        });
    }

    private async searchClockCity() {
        const cityInput = this.shadowRoot?.getElementById('clock-city') as HTMLInputElement;
        const resultsContainer = this.shadowRoot?.getElementById('clock-results-container') as HTMLElement;
        const resultsEl = this.shadowRoot?.getElementById('clock-results') as HTMLElement;
        if (!cityInput || !resultsContainer || !resultsEl) return;

        const query = cityInput.value.trim();
        if (!query) return;

        resultsEl.innerHTML = `<div class="search-loading">${i18n.t('general.loading')}</div>`;
        resultsContainer.style.display = '';

        try {
            const cities = await searchCities(query, i18n.getLocale().code);

            if (cities.length === 0) {
                resultsEl.innerHTML = `<div class="search-empty">${i18n.t('general.no_icons')}</div>`;
                return;
            }

            resultsEl.innerHTML = cities.map((c, i) => `
                <button class="city-result" data-index="${i}">
                    <span class="city-name">${esc(c.name)}</span>
                    <span class="city-detail">${esc(c.detail)}</span>
                </button>
            `).join('');

            resultsEl.querySelectorAll('.city-result').forEach(btn => {
                btn.addEventListener('click', () => {
                    const picked = cities[Number(btn.getAttribute('data-index'))];
                    cityInput.value = picked.name;
                    this._clockPickedTimezone = picked.timezone || null;
                    resultsContainer.style.display = 'none';
                });
            });
        } catch (_) {
            resultsEl.innerHTML = `<div class="search-empty">${i18n.t('general.error')}</div>`;
        }
    }

    private async searchWeatherCity() {
        const cityInput = this.shadowRoot?.getElementById('weather-city') as HTMLInputElement;
        const resultsContainer = this.shadowRoot?.getElementById('weather-results-container') as HTMLElement;
        const resultsEl = this.shadowRoot?.getElementById('weather-results') as HTMLElement;
        if (!cityInput || !resultsContainer || !resultsEl) return;

        const query = cityInput.value.trim();
        if (!query) return;

        resultsEl.innerHTML = `<div class="search-loading">${i18n.t('general.loading')}</div>`;
        resultsContainer.style.display = '';

        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=${i18n.getLocale().code}`);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                resultsEl.innerHTML = `<div class="search-empty">${i18n.t('general.no_icons')}</div>`;
                return;
            }

            resultsEl.innerHTML = data.results.map((r: any) => `
                <button class="city-result" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${esc(r.name)}">
                    <span class="city-name">${esc(r.name)}</span>
                    <span class="city-detail">${esc([r.admin1, r.country].filter(Boolean).join(', '))}</span>
                </button>
            `).join('');

            resultsEl.querySelectorAll('.city-result').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lat = parseFloat(btn.getAttribute('data-lat') || '0');
                    const lon = parseFloat(btn.getAttribute('data-lon') || '0');
                    const name = btn.getAttribute('data-name') || '';

                    (this.shadowRoot?.getElementById('weather-lat') as HTMLInputElement).value = lat.toString();
                    (this.shadowRoot?.getElementById('weather-lon') as HTMLInputElement).value = lon.toString();
                    (this.shadowRoot?.getElementById('weather-city') as HTMLInputElement).value = name;

                    resultsContainer.style.display = 'none';
                });
            });
        } catch (_) {
            resultsEl.innerHTML = `<div class="search-empty">${i18n.t('general.error')}</div>`;
        }
    }

    private refreshDockerContent() {
        if (!this.shadowRoot || !this.currentItem) return;
        const generalTab = this.shadowRoot.getElementById('tab-general');
        if (!generalTab) return;

        const content = typeof this.currentItem.content === 'string'
            ? JSON.parse(this.currentItem.content)
            : this.currentItem.content;

        const formData = this.renderDockerForm(content);
        generalTab.innerHTML = formData.general;
        this.setupDockerEvents();
    }

    private setupDockerEvents() {
        if (!this.shadowRoot) return;
        const root = this.shadowRoot;

        const refreshSel = root.getElementById('docker-refresh') as AppSelect | null;
        if (refreshSel) refreshSel.options = [
            { value: '30', label: '30s' },
            { value: '60', label: '1m' },
            { value: '300', label: '5m' },
            { value: '600', label: '10m' },
        ];

        if (this.currentItem) {
            const content = typeof this.currentItem.content === 'string'
                ? JSON.parse(this.currentItem.content)
                : this.currentItem.content;

            // Always wide: a container's address is a URL with a host and a
            // port, and in the narrow dialog it was cut mid-text — measured
            // needing 72px more than the 156px it had. The two columns still
            // wait for a second host; the width does not.
            root.getElementById('modal')?.classList.add('dialog--wide');

            this.loadDockerContainers(content);
            this.loadAgentVersions(content);
        }

        // Picking a host on the left is what the right-hand column follows.
        root.querySelectorAll<HTMLElement>('.host-item[data-host-id]').forEach(row => {
            const select = () => {
                const id = row.dataset.hostId;
                if (!id || id === this._dockerSelectedHost) return;
                this._dockerSelectedHost = id;
                root.querySelectorAll('.host-item').forEach(x => x.classList.remove('is-selected'));
                row.classList.add('is-selected');
                // A search typed for one host shouldn't silently hide the next
                // host's containers.
                const box = root.getElementById('docker-search') as HTMLInputElement | null;
                if (box) box.value = '';
                this.applyDockerFilters();
            };
            // The edit and delete buttons act on the row without selecting it.
            row.addEventListener('click', (e) => {
                if ((e.target as Element).closest('.host-action-btn')) return;
                select();
            });
            row.addEventListener('keydown', (e) => {
                if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
                    e.preventDefault();
                    select();
                }
            });
        });

        // Narrow the host list itself, for the installations that have enough
        // of them to make scanning slow.
        const hostSearch = root.getElementById('docker-host-search') as HTMLInputElement | null;
        hostSearch?.addEventListener('input', () => {
            const q = hostSearch.value.trim().toLowerCase();
            root.querySelectorAll<HTMLElement>('.host-item[data-host-id]').forEach(row => {
                const name = row.querySelector('.host-name')?.textContent?.toLowerCase() || '';
                row.style.display = !q || name.includes(q) ? '' : 'none';
            });
        });

        // Filter by name or image. Plain substring match on a data attribute
        // built when the row was drawn, so typing never re-queries a host.
        const search = root.getElementById('docker-search') as HTMLInputElement | null;
        search?.addEventListener('input', () => this.applyDockerFilters());


        root.getElementById('docker-show-add-btn')?.addEventListener('click', () => {
            this.showDockerHostForm(null);
        });
        root.querySelectorAll('.host-action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id) {
                    this.showDockerHostForm(id);
                }
            });
        });
        root.querySelectorAll('.host-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (!id) return;

                const confirmationModal = document.querySelector('confirmation-modal') as any;
                let confirmed = false;
                if (confirmationModal) {
                    confirmed = await confirmationModal.confirm(
                        i18n.t('general.delete') || 'Delete',
                        i18n.t('docker.delete_host_confirm') || 'Are you sure you want to delete this host?'
                    );
                } else {
                    confirmed = confirm(i18n.t('general.are_you_sure') || 'Are you sure?');
                }

                if (confirmed) {
                    let content = typeof this.currentItem!.content === 'string'
                        ? JSON.parse(this.currentItem!.content)
                        : { ...this.currentItem!.content };
                    content.hosts = (content.hosts || []).filter((h: any) => h.id !== id);
                    // A host that is gone takes its token with it.
                    const secret = dockerSecretName(id);
                    if (this._dockerSaved.has(secret) || this._dockerPending[secret]) this._dockerPending[secret] = { action: 'clear' };
                    delete this._dockerTyped[id];

                    this.currentItem!.content = JSON.stringify(content);
                    this.refreshDockerContent();
                }
            });
        });
    }

    private showDockerHostForm(hostId: string | null) {
        if (!this.shadowRoot || !this.currentItem) return;
        const overlay = this.shadowRoot.getElementById('docker-host-overlay');
        if (!overlay) return;

        const content = typeof this.currentItem.content === 'string'
            ? JSON.parse(this.currentItem.content)
            : this.currentItem.content;

        const hosts = content.hosts || [];
        const editingHost = hostId ? hosts.find((h: any) => h.id === hostId) || { type: 'local' } : { type: 'local' };
        // Dots when a token is saved, or one was typed for this host and is waiting for Save.
        const pending = hostId ? this._dockerPending[dockerSecretName(hostId)] : undefined;
        const tokenSet = !!hostId && (pending ? pending.action === 'set' : this._dockerSaved.has(dockerSecretName(hostId)));
        
        overlay.innerHTML = `
            <div class="modal-header" style="border-radius: var(--radius) var(--radius) 0 0; border-bottom: 1px solid var(--border);">
                <h3 class="modal-title" style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-main);">${hostId ? (i18n.t('general.edit') || 'Edit') : (i18n.t('docker.add_new_host') || 'Add Host')}</h3>
                <button class="modal-close" id="docker-cancel-overlay-btn" title="${i18n.t('general.close') || 'Close'}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div style="padding: 24px; display: flex; flex-direction: column; flex: 1; overflow-y: auto;">
                <div class="field-group">
                    <label>${i18n.t('docker.host_name') || 'Host Name'}</label>
                    <input type="text" id="docker-name" value="${esc(editingHost.name || '')}" placeholder="${i18n.t('docker.host_name_placeholder')}" />
                </div>
                <div class="field-group" style="margin-top: 12px;">
                    <label>${i18n.t('docker.host_type') || 'Connection Type'}</label>
                    <app-select id="docker-type" value="${editingHost.type}"></app-select>
                </div>
                <div class="field-group" id="docker-url-row" style="margin-top: 12px; ${editingHost.type === 'local' ? 'display: none;' : ''}">
                    <label>${i18n.t('docker.host_url') || 'Agent URL'}</label>
                    <input type="text" id="docker-url" value="${esc(editingHost.url || '')}" placeholder="192.168.1.100:2375" />
                </div>
                <div class="field-group" id="docker-token-row" style="margin-top: 12px; ${editingHost.type === 'agent' ? '' : 'display: none;'}">
                    <label>${i18n.t('docker.host_token') || 'Agent Token'}</label>
                    <input type="password" id="docker-token" value="${tokenSet ? SECRET_MASK : ''}" placeholder="${i18n.t('docker.host_token_placeholder')}" spellcheck="false" autocomplete="new-password" data-secret />
                </div>
                <div class="docker-form-actions" style="margin-top: auto; padding-top: 24px;">
                    <app-button variant="primary" id="docker-save-overlay-btn" style="flex: 1;">${i18n.t('general.save')}</app-button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';

        // Dots on entering the box: the first key replaces them, Delete empties it.
        const tokenBox = this.shadowRoot.getElementById('docker-token') as HTMLInputElement | null;
        tokenBox?.addEventListener('focus', () => tokenBox.select());

        const typeSelect = this.shadowRoot.getElementById('docker-type') as AppSelect | null;
        if (typeSelect) {
            typeSelect.options = [
                { value: 'local', label: i18n.t('docker.host_type_local') || 'Local socket' },
                { value: 'agent', label: i18n.t('docker.host_type_agent') || 'Remote Agent' },
                { value: 'tcp', label: i18n.t('docker.host_type_tcp') || 'Remote TCP' },
                { value: 'tls', label: i18n.t('docker.host_type_tls') || 'Remote TLS' }
            ];

            // The port belongs to the connection type, and one fixed example for
            // all three was wrong for TLS: an unencrypted daemon listens on 2375
            // and a TLS one on 2376, and the agent has its own default. Showing
            // 2375 whatever you picked is how the ports stopped matching what the
            // agent and the guides say.
            const URL_HINT: Record<string, string> = {
                agent: '192.168.1.100:2375',
                tcp: '192.168.1.100:2375',
                tls: '192.168.1.100:2376',
            };

            const toggle = (val?: string) => {
                const t = val || typeSelect.value;
                const url = this.shadowRoot!.getElementById('docker-url-row');
                const token = this.shadowRoot!.getElementById('docker-token-row');
                const urlInput = this.shadowRoot!.getElementById('docker-url') as HTMLInputElement | null;
                if (url) url.style.display = t === 'local' ? 'none' : '';
                if (token) token.style.display = t === 'agent' ? '' : 'none';
                if (urlInput && URL_HINT[t]) urlInput.placeholder = URL_HINT[t];
            };
            typeSelect.addEventListener('change', (e: Event) => toggle((e as CustomEvent).detail.value));
            toggle();
        }

        this.shadowRoot.getElementById('docker-cancel-overlay-btn')?.addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        this.shadowRoot.getElementById('docker-save-overlay-btn')?.addEventListener('click', () => {
            const name = (this.shadowRoot!.getElementById('docker-name') as HTMLInputElement).value.trim();
            const type = (this.shadowRoot!.getElementById('docker-type') as AppSelect).value;
            const urlInput = this.shadowRoot!.getElementById('docker-url') as HTMLInputElement;
            const url = urlInput ? urlInput.value.trim() : '';
            const tokenInput = this.shadowRoot!.getElementById('docker-token') as HTMLInputElement;
            const tokenRaw = tokenInput ? tokenInput.value : '';

            if (!name) return;

            let currentContent = typeof this.currentItem!.content === 'string'
                ? JSON.parse(this.currentItem!.content)
                : { ...this.currentItem!.content };

            if (!currentContent.hosts) currentContent.hosts = [];

            // The token is never in the widget's content: it is a secret of the
            // widget, held here until Save.
            const id = hostId || 'h_' + Math.random().toString(36).slice(2, 8);
            const secret = dockerSecretName(id);
            const before = this._dockerPending[secret];
            const saved = before ? before.action === 'set' : this._dockerSaved.has(secret);
            const change = hostTokenChange({ type, raw: tokenRaw, saved });
            if (change.action === 'set') {
                this._dockerPending[secret] = change;
                this._dockerTyped[id] = change.token;
            } else if (change.action === 'clear') {
                this._dockerPending[secret] = change;
                delete this._dockerTyped[id];
            }

            if (hostId) {
                currentContent.hosts = currentContent.hosts.map((h: any) => {
                    if (h.id !== hostId) return h;
                    const { token: _gone, ...rest } = h;
                    return { ...rest, name, type, url };
                });
            } else {
                currentContent.hosts.push({ id, name, type, url });
            }

            this.currentItem!.content = JSON.stringify(currentContent);
            overlay.style.display = 'none';
            this.refreshDockerContent();
        });
    }

    /**
     * The monitor widget picks from services that are already being monitored,
     * so the list cannot be known until it is fetched. The form renders a
     * placeholder and setupMonitorEvents fills it in — the same shape the docker
     * form uses for its hosts.
     */
    /**
     * The Proxmox tile's own settings. The connection is NOT here: it is one
     * hypervisor per instance, set by an administrator in Preferences, because
     * the token must not travel to a browser. This screen only chooses what the
     * tile shows.
     */
    private renderProxmoxForm(content: any) {
        const renderAppearanceControls = () => appearanceControlsTemplate(this.premiumColors, this._selectedColor, this._selectedBorderWidth, this._titleForForm());
        const refresh = Number(content.refreshSec) > 0 ? Number(content.refreshSec) : 30;
        const showNode = content.showNode !== false;

        const generalTab = `
            <div class="field-group">
                <label>${i18n.t('widget.api.title_label')}</label>
                <input type="text" id="proxmox-title" value="${esc(content.title || '')}"
                       placeholder="${esc(i18n.t('widget.proxmox.name'))}" />
            </div>
            <!-- check-row, which is the class this modal actually styles: a
                 tick box with no rule behind it falls back to the browser's
                 blue one, beside five orange ones. -->
            <div class="field-group check-row">
                <input type="checkbox" id="proxmox-shownode" ${showNode ? 'checked' : ''} />
                <label for="proxmox-shownode">${i18n.t('widget.proxmox.show_node')}</label>
            </div>
            <div class="field-group">
                <small>${i18n.t('widget.proxmox.show_node_desc')}</small>
            </div>
            <div class="field-group" id="proxmox-state"></div>
            <div class="field-group row-aligned">
                <label>${i18n.t('widget.api.refresh_label')}</label>
                <app-select id="proxmox-refresh" value="${refresh}"></app-select>
            </div>
        `;

        return { general: generalTab, customization: renderAppearanceControls() };
    }

    /**
     * Fills the refresh choices and says, plainly, whether this instance can
     * drive the machines or only watch them.
     *
     * Measured on a real host: a token with the auditor role reads everything
     * the tile shows and cannot start anything. Saying so here beats drawing
     * buttons that answer 403 when somebody finally presses one.
     */
    private async setupProxmoxEvents(_content: any) {
        const sel = this.shadowRoot?.getElementById('proxmox-refresh') as AppSelect | null;
        if (sel) sel.options = [
            { value: '15', label: '15s' },
            { value: '30', label: '30s' },
            { value: '60', label: '1m' },
            { value: '300', label: '5m' },
        ];

        const state = this.shadowRoot?.getElementById('proxmox-state');
        if (!state) return;
        try {
            // Several hypervisors may be connected and their tokens need not
            // agree: the widget draws a power button wherever one is allowed,
            // so the line says so if any of them is.
            const hosts = await loadProxmox();
            const anyPower = hosts.some(h => h.caps?.power === true);
            state.innerHTML = `<small>${esc(i18n.t(anyPower
                ? 'widget.proxmox.can_power'
                : 'widget.proxmox.read_only'))}</small>`;
        } catch {
            state.innerHTML = `<small>${esc(i18n.t('proxmox.not_configured'))}</small>`;
        }
    }

    private renderMonitorForm(content: any) {
        const renderAppearanceControls = () => appearanceControlsTemplate(this.premiumColors, this._selectedColor, this._selectedBorderWidth, this._titleForForm());
        const refresh = Number(content.refreshSec) > 0 ? Number(content.refreshSec) : 60;

        const generalTab = `
            <div class="field-group">
                <label>${i18n.t('widget.api.title_label')}</label>
                <input type="text" id="monitor-title" value="${esc(content.title || '')}"
                       placeholder="${esc(i18n.t('widget.monitor.name'))}" />
            </div>
            <div class="field-group">
                <label>${i18n.t('monitor.select_services')}</label>
                <div id="monitor-services" class="monitor-services">
                    <p class="monitor-services__state">${i18n.t('general.loading')}</p>
                </div>
                <small>${i18n.t('monitor.select_services_desc')}</small>
            </div>
            <div class="field-group row-aligned">
                <label>${i18n.t('widget.api.refresh_label')}</label>
                <app-select id="monitor-refresh" value="${refresh}"></app-select>
            </div>
        `;

        return { general: generalTab, customization: renderAppearanceControls() };
    }

    /**
     * Fills the service list. Everything is pre-checked when the widget has no
     * explicit selection, because that is what it renders: all of them.
     */
    private async setupMonitorEvents(content: any) {
        const refreshSel = this.shadowRoot?.getElementById('monitor-refresh') as AppSelect | null;
        if (refreshSel) refreshSel.options = [
            { value: '30', label: '30s' },
            { value: '60', label: '1m' },
            { value: '300', label: '5m' },
            { value: '600', label: '10m' },
        ];

        const box = this.shadowRoot?.getElementById('monitor-services');
        if (!box) return;

        let rows: { item_id: number; name: string }[] = [];
        try {
            rows = await apiService.get<{ item_id: number; name: string }[]>('/api/monitor/overview');
        } catch {
            box.innerHTML = `<p class="monitor-services__state">${esc(i18n.t('general.error'))}</p>`;
            return;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            box.innerHTML = `<p class="monitor-services__state">${esc(i18n.t('monitor.overview_empty'))}</p>`;
            return;
        }

        const selected: number[] = Array.isArray(content.items) ? content.items : [];
        const all = selected.length === 0;

        box.innerHTML = rows.map(r => `
            <label class="monitor-service-row">
                <input type="checkbox" class="monitor-service" data-id="${r.item_id}"
                       ${all || selected.includes(r.item_id) ? 'checked' : ''} />
                <span>${esc(r.name) || '—'}</span>
            </label>
        `).join('');
    }

    /** Past this many hosts, scanning the list is slower than typing a name. */
    private static readonly DOCKER_HOST_SEARCH_FROM = 6;

    /**
     * The Docker form, in one of two shapes.
     *
     * With a single host there is nothing to choose between, so it stays the
     * narrow single column it has always been. From the second host on it
     * becomes master-detail: hosts on the left, the selected host's containers
     * on the right. That also removes a duplication — the hosts used to appear
     * twice, once as a list and again in a filter dropdown.
     *
     * Title, hint, refresh and save stay full width in both: they belong to the
     * widget, not to whichever host is selected.
     */
    private renderDockerForm(content: any) {
        const renderAppearanceControls = () => appearanceControlsTemplate(this.premiumColors, this._selectedColor, this._selectedBorderWidth, this._titleForForm());

        const hosts: DockerHost[] = content.hosts || [];
        const refresh = Number(content.refreshSec) > 0 ? Number(content.refreshSec) : 60;
        const split = hosts.length >= 2;

        if (!this._dockerSelectedHost || !hosts.some(h => h.id === this._dockerSelectedHost)) {
            this._dockerSelectedHost = content.activeHost || hosts[0]?.id || '';
        }

        const hostRow = (h: DockerHost) => `
            <div class="host-item${split && h.id === this._dockerSelectedHost ? ' is-selected' : ''}"
                 data-host-id="${esc(h.id)}"${split ? ' role="button" tabindex="0"' : ''}>
                <div class="host-info">
                    <span class="host-name">${esc(h.name)}</span>
                    <span class="host-meta">
                        <span class="host-tag">${h.type === 'agent' ? i18n.t('docker.host_tag_agent') : i18n.t('docker.host_type_' + h.type)}</span>
                        ${h.type === 'agent' ? `<span class="host-version" data-agent-version="${esc(h.id)}"></span>` : ''}
                    </span>
                </div>
                <div class="host-actions">
                    <button class="host-action-btn edit" data-id="${esc(h.id)}" title="${i18n.t('general.edit')}">${ICON_EDIT}</button>
                    <button class="host-action-btn delete" data-id="${esc(h.id)}" title="${i18n.t('general.delete')}">${ICON_TRASH}</button>
                </div>
            </div>`;

        const hostsList = hosts.length > 0
            ? hosts.map(hostRow).join('')
            : `<p class="no-hosts" style="color: var(--text-dim); text-align: center; padding: 12px;">${i18n.t('docker.no_hosts_configured') || 'No hosts found'}</p>`;

        // Every control below lives inside a .field-group, which is what gives
        // labels and inputs their colours, padding and focus ring. Building the
        // columns out of anything else meant restyling each property by hand,
        // and the ones that got missed rendered as bare browser defaults.
        const hostSearch = hosts.length >= WidgetConfigModal.DOCKER_HOST_SEARCH_FROM
            ? `<input type="text" id="docker-host-search"
                      placeholder="${esc(i18n.t('docker.search_hosts'))}" />`
            : '';

        const addHostBtn = `<app-button variant="ghost" id="docker-show-add-btn" style="width: 100%;">${i18n.t('docker.add_new_host') || 'Add Host'}</app-button>`;

        const containerSearch = `<input type="text" id="docker-search"
                   placeholder="${esc(i18n.t('docker.search_containers'))}" />`;

        const containerList = `
            <div id="docker-containers" class="docker-containers">
                <p class="monitor-services__state">${i18n.t('general.loading')}</p>
            </div>`;

        const hint = `<small>${i18n.t('docker.containers_desc')}</small>`;

        const body = split
            ? `
            <div class="docker-split">
                <div class="field-group">
                    <label>${i18n.t('docker.hosts') || 'Docker Hosts'}</label>
                    ${hostSearch}
                    <div class="hosts-list">${hostsList}</div>
                    ${addHostBtn}
                </div>
                <div class="field-group">
                    <label id="docker-containers-label">${i18n.t('docker.containers')}</label>
                    ${containerSearch}
                    ${containerList}
                    ${hint}
                </div>
            </div>`
            : `
            <div class="field-group">
                <label>${i18n.t('docker.hosts') || 'Docker Hosts'}</label>
                <div class="hosts-list">${hostsList}</div>
                ${addHostBtn}
            </div>
            <div class="field-group">
                <label id="docker-containers-label">${i18n.t('docker.containers')}</label>
                ${containerSearch}
                ${containerList}
                ${hint}
            </div>`;

        const generalTab = `
            <div class="field-group">
                <label>${i18n.t('widget.api.title_label')}</label>
                <input type="text" id="docker-title" value="${esc(content.title || '')}"
                       placeholder="${esc(i18n.t('widget.docker.name'))}" />
            </div>
            ${body}
            <div class="field-group row-aligned">
                <label>${i18n.t('widget.api.refresh_label')}</label>
                <app-select id="docker-refresh" value="${refresh}"></app-select>
            </div>
        `;

        return { general: generalTab, customization: renderAppearanceControls() };
    }

    /**
     * Fills the container list: every host, one section each.
     *
     * All hosts at once rather than only the active one, because the settings
     * are stored per container id regardless of which host it came from, and
     * hunting for the right host before you can tick a box is busywork. A host
     * that doesn't answer says so in its own section and leaves the rest alone.
     */
    /**
     * Fills in the version beside each agent host, once the list is drawn.
     *
     * Asked of the agent itself, so it is what is really running there, not
     * what somebody remembers installing. Each host answers on its own: one
     * that is slow or down leaves its own line blank and holds up no other.
     */
    private loadAgentVersions(content: any) {
        const hosts: DockerHost[] = content.hosts || [];
        for (const host of hosts.filter(h => h.type === 'agent')) {
            fetchAgentVersion(host, this.currentItem?.id ?? 0, this._dockerTyped[host.id]).then(version => {
                if (!version) return;
                const cell = this.shadowRoot?.querySelector<HTMLElement>(
                    `[data-agent-version="${CSS.escape(host.id)}"]`);
                if (cell) cell.textContent = version;
            });
        }
    }

    private async loadDockerContainers(content: any) {
        const box = this.shadowRoot?.getElementById('docker-containers');
        if (!box) return;

        const hosts: DockerHost[] = content.hosts || [];
        if (!hosts.length) {
            box.innerHTML = `<p class="monitor-services__state">${esc(i18n.t('docker.no_hosts_configured'))}</p>`;
            return;
        }

        const cfg: Record<string, any> = content.containerConfig || {};

        const results = await Promise.all(hosts.map(async (host) => {
            try {
                return { host, containers: await fetchContainers(host, this.currentItem?.id ?? 0, this._dockerTyped[host.id]), failed: false, errorKey: '' };
            } catch (err) {
                return { host, containers: [] as DockerContainer[], failed: true, errorKey: hostErrorKey(err) };
            }
        }));

        box.innerHTML = results.map(({ host, containers, failed, errorKey }) => {
            const body = failed
                ? `<p class="docker-host-state is-error">${esc(i18n.t(errorKey))}</p>`
                : containers.length === 0
                    ? `<p class="docker-host-state">${esc(i18n.t('docker.no_containers'))}</p>`
                    : containers.map(c => this.dockerContainerRow(c, cfg, host)).join('');

            // No heading inside: only the selected host's group is ever shown,
            // and the label above the column already names it.
            return `<div class="docker-host-group" data-host-id="${esc(host.id)}">${body}</div>`;
        }).join('');

        this.applyDockerFilters();
    }

    /**
     * Hides what the host selector and the search box exclude.
     *
     * Filtering rather than re-fetching: the rows already carry everything
     * needed to decide, so switching host or typing never asks a daemon again,
     * and nothing is lost — a hidden row is still read when saving, so settings
     * on a host you aren't looking at survive.
     */
    private applyDockerFilters() {
        const root = this.shadowRoot;
        if (!root) return;

        const host = this._dockerSelectedHost;
        const search = root.getElementById('docker-search') as HTMLInputElement | null;
        const q = (search?.value || '').trim().toLowerCase();

        root.querySelectorAll<HTMLElement>('.docker-host-group').forEach(group => {
            const thisHost = !host || group.dataset.hostId === host;

            group.querySelectorAll<HTMLElement>('.docker-container-row').forEach(row => {
                const matches = thisHost && (!q || (row.dataset.search || '').includes(q));
                row.style.display = matches ? '' : 'none';
            });

            group.style.display = thisHost ? '' : 'none';
        });

        // The right-hand column says whose containers these are, so the heading
        // above the host list doesn't have to be read to know.
        const label = root.getElementById('docker-containers-label');
        const name = root.querySelector('.host-item.is-selected .host-name')?.textContent?.trim();
        if (label) {
            label.textContent = name
                ? `${i18n.t('docker.containers')} · ${name}`
                : i18n.t('docker.containers');
        }
    }

    private dockerContainerRow(
        c: DockerContainer,
        cfg: Record<string, any>,
        host: DockerHost,
    ): string {
        const sid = shortId(c.ID);
        const entry = cfg[sid] || {};
        const name = containerName(c);

        // The derived address is the placeholder, not the value: leaving the
        // field empty means "use whatever you worked out", so a container that
        // later publishes a different port keeps working without an edit.
        const suggested = defaultContainerUrl(c, host, window.location.hostname);

        return `
            <div class="docker-container-row" data-sid="${esc(sid)}" data-search="${esc((name + ' ' + c.Image).toLowerCase())}">
                <input type="checkbox" class="docker-container" data-sid="${esc(sid)}"
                       ${entry.hidden ? '' : 'checked'}
                       title="${esc(i18n.t('docker.container_visible'))}" />
                <input type="text" class="docker-label" data-sid="${esc(sid)}"
                       value="${esc(entry.label || '')}" placeholder="${esc(name)}" />
                <input type="text" class="docker-url" data-sid="${esc(sid)}"
                       data-suggested="${esc(suggested)}"
                       value="${esc(entry.url || '')}"
                       placeholder="${esc(suggested || i18n.t('docker.container_url_none'))}"
                       title="${esc(i18n.t('docker.container_url'))}" />
            </div>`;
    }
}

customElements.define('widget-config-modal', WidgetConfigModal);
