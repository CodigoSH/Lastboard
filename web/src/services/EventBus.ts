
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
    SHOW_PROXMOX_PAGE: 'lastboard:show-proxmox-page',
    HIDE_PROXMOX_PAGE: 'lastboard:hide-proxmox-page',
    /** Fired by the Proxmox page itself whenever it opens or closes ({ open }). */
    PROXMOX_PAGE_CHANGED: 'lastboard:proxmox-page-changed',
    /** The integration was turned on or off in settings ({ enabled }). */
    PROXMOX_CHANGED: 'lastboard:proxmox-changed',
    SHOW_DOCKER_PAGE: 'lastboard:show-docker-page',
    HIDE_DOCKER_PAGE: 'lastboard:hide-docker-page',
    /** Fired by the Docker page itself whenever it opens or closes ({ open }). */
    DOCKER_PAGE_CHANGED: 'lastboard:docker-page-changed',
    /** The account's Docker hosts were saved in settings. */
    DOCKER_CHANGED: 'lastboard:docker-changed',
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
