
export const EVENTS = {
    SHOW_CONFIRMATION: 'lastboard:show-confirmation',
    SHOW_PASSWORD_CONFIRM: 'lastboard:show-password-confirm',
    SHOW_WIDGET_CONFIG: 'lastboard:show-widget-config',
    SHOW_MOVE_DASHBOARD: 'lastboard:show-move-dashboard',
    SHOW_MONITOR_HISTORY: 'lastboard:show-monitor-history',
    SHOW_MONITOR_OVERVIEW: 'lastboard:show-monitor-overview',
    HIDE_MONITOR_OVERVIEW: 'lastboard:hide-monitor-overview',
    /** Fired by the status page itself whenever it opens or closes ({ open }). */
    MONITOR_OVERVIEW_CHANGED: 'lastboard:monitor-overview-changed',
    MONITORING_CHANGED: 'lastboard:monitoring-changed',
    NOTIFY: 'lastboard:notify'
};

class LastboardEventBus extends EventTarget {
    emit(event: string, detail?: any) {
        this.dispatchEvent(new CustomEvent(event, { detail }));
    }

    on(event: string, callback: (e: CustomEvent) => void) {
        this.addEventListener(event, callback as EventListener);
    }

    off(event: string, callback: (e: CustomEvent) => void) {
        this.removeEventListener(event, callback as EventListener);
    }
}

export const eventBus = new LastboardEventBus();
