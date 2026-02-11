
export interface WidgetDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    defaultW: number;
    defaultH: number;
    componentTag: string;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
    {
        id: 'clock',
        name: 'Clock',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        description: 'Digital clock with date',
        defaultW: 2,
        defaultH: 1,
        componentTag: 'widget-clock'
    },
    {
        id: 'notepad',
        name: 'Notepad',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
        description: 'Markdown notepad',
        defaultW: 2,
        defaultH: 2,
        componentTag: 'widget-notepad'
    },
    {
        id: 'telemetry',
        name: 'System Status',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><circle cx="6" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="17.5" r="1" fill="currentColor" stroke="none"/><line x1="10" y1="6.5" x2="18" y2="6.5"/><line x1="10" y1="17.5" x2="18" y2="17.5"/></svg>',
        description: 'CPU, RAM and Temp',
        defaultW: 2,
        defaultH: 1, // Compact row
        componentTag: 'widget-telemetry'
    },
    {
        id: 'weather',
        name: 'Weather',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="4"/><line x1="9" y1="1" x2="9" y2="3"/><line x1="1" y1="9" x2="3" y2="9"/><line x1="3.3" y1="3.3" x2="4.7" y2="4.7"/><line x1="14.7" y1="3.3" x2="13.3" y2="4.7"/><line x1="3.3" y1="14.7" x2="4.7" y2="13.3"/><path d="M10 19 Q10 15 14 15 Q14 11 18 11 Q22 11 22 15 Q24 15 24 18 Q24 21 21 21 L12 21 Q10 21 10 19Z"/></svg>',
        description: 'Current weather & forecast',
        defaultW: 2,
        defaultH: 2,
        componentTag: 'widget-weather'
    },
    {
        id: 'markdown',
        name: 'Markdown',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
        description: 'Native Markdown Editor',
        defaultW: 2,
        defaultH: 2,
        componentTag: 'widget-markdown'
    }
];
