
export const EVENTS = {
    SHOW_CONFIRMATION: 'kashboard:show-confirmation',
    SHOW_WIDGET_CONFIG: 'kashboard:show-widget-config',
    NOTIFY: 'kashboard:notify'
};

class KashboardEventBus extends EventTarget {
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

export const eventBus = new KashboardEventBus();
