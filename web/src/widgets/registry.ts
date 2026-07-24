import { i18n } from '../services/i18n';

export interface WidgetDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    defaultW: number;
    defaultH: number;
    componentTag: string;
    /** Open the config modal right after adding — for widgets that are useless
     *  until set up (location, endpoint, host…). */
    configOnAdd?: boolean;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
    {
        id: 'clock',
        get name() { return i18n.t('widget.clock.name'); },
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        get description() { return i18n.t('widget.clock.description'); },
        defaultW: 2,
        defaultH: 1,
        componentTag: 'widget-clock',
        configOnAdd: true
    },
    {
        id: 'notepad',
        get name() { return i18n.t('widget.notepad.name'); },
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
        get description() { return i18n.t('widget.notepad.description'); },
        defaultW: 2,
        defaultH: 2,
        componentTag: 'widget-notepad'
    },
    {
        id: 'telemetry',
        get name() { return i18n.t('widget.telemetry.name'); },
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><circle cx="6" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="17.5" r="1" fill="currentColor" stroke="none"/><line x1="10" y1="6.5" x2="18" y2="6.5"/><line x1="10" y1="17.5" x2="18" y2="17.5"/></svg>',
        get description() { return i18n.t('widget.telemetry.description'); },
        defaultW: 3,
        defaultH: 1, // Compact row
        componentTag: 'widget-telemetry'
    },
    {
        id: 'weather',
        get name() { return i18n.t('widget.weather.name'); },
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="4"/><line x1="9" y1="1" x2="9" y2="3"/><line x1="1" y1="9" x2="3" y2="9"/><line x1="3.3" y1="3.3" x2="4.7" y2="4.7"/><line x1="14.7" y1="3.3" x2="13.3" y2="4.7"/><line x1="3.3" y1="14.7" x2="4.7" y2="13.3"/><path d="M10 19 Q10 15 14 15 Q14 11 18 11 Q22 11 22 15 Q24 15 24 18 Q24 21 21 21 L12 21 Q10 21 10 19Z"/></svg>',
        get description() { return i18n.t('widget.weather.description'); },
        defaultW: 3,
        defaultH: 2,
        componentTag: 'widget-weather',
        configOnAdd: true
    },
    {
        id: 'markdown',
        get name() { return i18n.t('widget.markdown.name'); },
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
        get description() { return i18n.t('widget.markdown.description'); },
        defaultW: 2,
        defaultH: 2,
        componentTag: 'widget-markdown'
    },
    {
        id: 'docker',
        get name() { return i18n.t('widget.docker.name'); },
        icon: '<svg class="solid-icon" viewBox="0 0 640 512" fill="currentColor"><path d="M349.9 236.3h-66.1v-59.4h66.1v59.4zm0-204.3h-66.1v60.7h66.1V32zm78.2 144.8H362v59.4h66.1v-59.4zm-156.3-72.1h-66.1v60.1h66.1v-60.1zm78.1 0h-66.1v60.1h66.1v-60.1zm276.8 100c-14.4-9.7-47.6-13.2-73.1-8.4-3.3-24-16.7-44.9-41.1-63.7l-14-9.3-9.3 14c-18.4 27.8-23.4 73.6-3.7 103.8-8.7 4.7-25.8 11.1-48.4 10.7H2.4c-8.7 50.8 5.8 116.8 44 162.1 37.1 43.9 92.7 66.2 165.4 66.2 157.4 0 273.9-72.5 328.4-204.2 21.4.4 67.6.1 91.3-45.2 1.5-2.5 6.6-13.2 8.5-17.1l-13.3-8.9zm-511.1-27.9h-66v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm-78.1-72.1h-66.1v60.1h66.1v-60.1z"/></svg>',
        get description() { return i18n.t('widget.docker.description'); },
        defaultW: 5,
        defaultH: 3,
        componentTag: 'widget-docker',
        configOnAdd: true
    },
    {
        id: 'api',
        get name() { return i18n.t('widget.api.name'); },
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></svg>',
        get description() { return i18n.t('widget.api.description'); },
        defaultW: 2,
        defaultH: 1,
        componentTag: 'widget-api',
        configOnAdd: true
    }
];
