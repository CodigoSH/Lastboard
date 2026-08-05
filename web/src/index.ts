import { userStore } from './store/userStore';
import { dashboardStore } from './store/dashboardStore';
import { ThemeService } from './services/ThemeService';
import { i18n } from './services/i18n';

// Import components to register them
import './components/ui/Paper/Paper';
import './components/ui/Button/Button';
import './components/ui/Avatar/Avatar';
import './components/ui/SettingsContent/SettingsContent';
import './components/ui/RightDrawer/RightDrawer';
import './components/ui/TopBar/TopBar';
import './components/ui/OfflineBadge/OfflineBadge';
import './components/dashboard/BookmarkGrid/BookmarkGrid';
import './components/ui/Notifier/Notifier';
import './components/ui/IconPicker/IconPicker';
import './components/ui/AddBookmarkModal/AddBookmarkModal';
import './components/ui/AddWidgetModal/AddWidgetModal';
import './components/ui/AddDashboardModal/AddDashboardModal';
import './components/ui/DashboardManagerModal/DashboardManagerModal';
import './components/ui/WidgetConfigModal/WidgetConfigModal';
import './components/ui/ConfirmationModal/ConfirmationModal';
import './components/ui/MoveToDashboardModal/MoveToDashboardModal';
import './components/ui/MonitorHistoryDrawer/MonitorHistoryDrawer';
import './components/ui/MonitorPage/MonitorPage';
import './components/ui/PasswordConfirmModal/PasswordConfirmModal';
import './components/ui/UpdateModal/UpdateModal';
// Widget Components
import './widgets/core/NotepadWidget';
import './widgets/core/ClockWidget';
import './widgets/core/TelemetryWidget';
import './widgets/core/WeatherWidget';
import './widgets/core/MarkdownWidget';
import './widgets/core/DockerWidget';
import './widgets/core/ApiWidget';

const topbar = document.getElementById('main-topbar') as any;
const drawer = document.getElementById('right-drawer') as any;
const dashboardRoot = document.getElementById('dashboard-root') as HTMLElement;
let addBookmarkModal: any;
let addWidgetModal: any;
let confirmationModal: any;
let moveModal: any;
let passwordConfirmModal: any;

import { bootstrap } from './core/bootstrap';

// Initialize Application
bootstrap(async () => {
    // Flash-prevention: apply a theme before the user record arrives so the
    // page does not flicker.  serveIndex already injects the correct class
    // from the DB; this call only matters for the 'system' edge case.
    ThemeService.init();

    // 3. Mount the grid immediately so skeletons appear while API calls are in-flight.
    //    BookmarkGrid starts with isLoading=true and renders skeleton cards.
    renderDashboard();

    // ── Parallel Initialization ─────────────────────────────────────
    // fetchUser and fetchDashboards run in parallel while skeletons are visible.
    // setUserId must happen before fetchItems so the localStorage key is correct.
    await Promise.all([
        userStore.fetchUser(),
        dashboardStore.fetchDashboards()
    ]);

    const u = userStore.getUser();
    if (u?.id) dashboardStore.setUserId(u.id);

    // 4. Await fetchItems: fires stale-cache notify instantly (localStorage → real content),
    //    then revalidates from backend in background.
    await dashboardStore.fetchItems();

    // ── Per-user sync ──────────────────────────────────────────────
    if (u) {
        // Language: overwrite i18n with the backend preference.
        if (u.language) {
            await i18n.setLanguage(u.language);
        }

        // Theme & Grid columns
        if (u.preferences && u.preferences.grid_columns) {
            document.documentElement.style.setProperty('--user-preferred-columns', u.preferences.grid_columns.toString());
        }

        if (u.theme === 'dark') {
            ThemeService.enableDark();
        } else if (u.theme === 'light') {
            ThemeService.enableLight();
        } else {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                ThemeService.enableDark();
            } else {
                ThemeService.enableLight();
            }
        }

        if (u.id) {
            dashboardStore.setUserId(u.id);
        }
    }

    // Inject user into topbar
    if (topbar) {
        topbar.setState({ user: u, projectLogo: u?.project_logo || '' });
        if (u && u.project_name) {
            topbar.setAttribute('title', u.project_name);
        }

        userStore.subscribe((user) => {
            if (user) {
                topbar.setState({ user, projectLogo: user.project_logo || '' });
                if (user.project_name) {
                    topbar.setAttribute('title', user.project_name);
                }
            }
        });
    }

    // renderDashboard() was already called above. statusService is started by
    // BookmarkGrid.connectedCallback() — no separate call needed here.

    // Create and append modals
    addBookmarkModal = document.createElement('add-bookmark-modal');
    document.body.appendChild(addBookmarkModal);

    addWidgetModal = document.createElement('add-widget-modal');
    document.body.appendChild(addWidgetModal);

    confirmationModal = document.createElement('confirmation-modal');
    document.body.appendChild(confirmationModal);

    passwordConfirmModal = document.createElement('password-confirm-modal');
    document.body.appendChild(passwordConfirmModal);

    const widgetConfigModal = document.createElement('widget-config-modal');
    document.body.appendChild(widgetConfigModal);

    moveModal = document.createElement('move-to-dashboard-modal');
    document.body.appendChild(moveModal);

    const monitorHistoryDrawer = document.createElement('monitor-history-drawer');
    document.body.appendChild(monitorHistoryDrawer);

    const monitorPage = document.createElement('monitor-page');
    document.body.appendChild(monitorPage);

    // Lives outside the settings panel so an update keeps running (and keeps
    // being visible) no matter what happens to the drawer behind it.
    const updateModal = document.createElement('update-modal');
    document.body.appendChild(updateModal);
});

// 2. Handle Component Events (TopBar)
import { eventBus, EVENTS } from './services/EventBus';

// Centralized Event Listeners
eventBus.on(EVENTS.SHOW_CONFIRMATION, async (e: CustomEvent) => {
    const { title, message, onConfirm } = e.detail;
    if (confirmationModal) {
        const confirmed = await confirmationModal.confirm(title, message);
        if (confirmed && onConfirm) {
            onConfirm();
        }
    }
});

eventBus.on(EVENTS.SHOW_PASSWORD_CONFIRM, async (e: CustomEvent) => {
    const { title, message, onConfirm } = e.detail;
    if (passwordConfirmModal) {
        const password = await passwordConfirmModal.prompt(title, message);
        if (password !== null && onConfirm) {
            onConfirm(password);
        }
    }
});

eventBus.on(EVENTS.SHOW_MOVE_DASHBOARD, async (e: CustomEvent) => {
    const { itemId, itemIds, gridCols } = e.detail;
    if (!moveModal) return;

    const state = dashboardStore.getState();
    const targetId = await moveModal.pick(state.dashboards, state.currentDashboardId);
    if (targetId == null) return;

    // Success feedback is owned by the caller, not the store: a toast naming the
    // destination, with a "Go" action that switches to it.
    const target = state.dashboards.find((d: any) => d.id === targetId);
    const name = target ? target.name : '';
    const notifier = (window as any).notifier;
    const go = {
        label: i18n.t('general.go'),
        onClick: () => { dashboardStore.switchDashboard(targetId); },
    };

    if (Array.isArray(itemIds) && itemIds.length) {
        const moved = await dashboardStore.moveItemsToDashboard(itemIds, targetId, gridCols);
        if (!moved) return;
        dashboardStore.setSelectMode(false); // leave selection mode after a bulk move
        if (notifier) notifier.show({ message: `${i18n.t('notifier.moved_to')} «${name}» (${moved})`, action: go });
    } else {
        const ok = await dashboardStore.moveItemToDashboard(itemId, targetId, gridCols);
        if (!ok) return;
        if (notifier) notifier.show({ message: `${i18n.t('notifier.moved_to')} «${name}»`, action: go });
    }
});

eventBus.on(EVENTS.SHOW_MONITOR_HISTORY, (e: CustomEvent) => {
    const { itemId, name } = e.detail;
    const drawer = document.querySelector('monitor-history-drawer') as any;
    if (drawer) drawer.open(itemId, name);
});

eventBus.on(EVENTS.SHOW_MONITOR_OVERVIEW, () => {
    const page = document.querySelector('monitor-page') as any;
    if (page) page.open();
});

eventBus.on(EVENTS.HIDE_MONITOR_OVERVIEW, () => {
    const page = document.querySelector('monitor-page') as any;
    if (page) page.close();
});

eventBus.on(EVENTS.SHOW_WIDGET_CONFIG, (e: CustomEvent) => {
    const { item, type } = e.detail;
    if (type === 'bookmark') {
        if (addBookmarkModal) addBookmarkModal.openForEdit(item);
    } else {
        const widgetConfigModal = document.querySelector('widget-config-modal') as any;
        if (widgetConfigModal) widgetConfigModal.open(item);
    }
});

eventBus.on(EVENTS.NOTIFY, (e: CustomEvent) => {
    // Assuming Notifier component listens or we trigger it here if it's singleton
    // For now, if Notifier is web-component based and self-contained, 
    // we might need to find it and call .show().
    // Looking at index.ts imports: './components/ui/Notifier/Notifier';
    // If it's a singleton appended to body? It's not in the append list in bootstrap.
    // Let's assume there is a global notifier or we find it.
    // If not found, we can standard console log or check if 'notifier' ID exists.
    const notifier = document.querySelector('app-notifier') as any; // Guessing tag
    if (notifier) notifier.show(e.detail.message, e.detail.type);
});

if (topbar) {
    topbar.addEventListener('drawer-toggle', (e: CustomEvent) => {
        if (e.detail.action === 'open') {
            drawer.open();
            topbar.setState({ drawerOpen: true });
        } else {
            drawer.close();
            topbar.setState({ drawerOpen: false });
        }
    });

    topbar.addEventListener('edit-mode-change', (e: CustomEvent) => {
        const isActive = e.detail.active;
        dashboardRoot.classList.toggle('edit-mode', isActive);

        // If exiting edit mode, refresh the page to ensure a clean state
        if (!isActive) {
            window.location.reload();
        }
    });

    topbar.addEventListener('search-input', (e: CustomEvent) => {
        const query = e.detail.query;
        dashboardStore.setSearchQuery(query);
    });

    topbar.addEventListener('add-item', async (e: CustomEvent) => {
        const action = e.detail.action;

        if (action === 'add-bookmark') {
            if (addBookmarkModal) {
                addBookmarkModal.open();
            }
        } else if (action === 'add-widget') {
            if (addWidgetModal) {
                addWidgetModal.open();
            }
        } else if (action === 'add-section') {
            // "Section" -> Resizable Box, No Name
            // Smart Placement
            const currentState = dashboardStore.getState();
            const items = currentState.items || [];
            const gridColumns = currentState.gridColumns || 12;
            const { collisionService } = await import('./services/collisionService');
            const slot = collisionService.findCompactPosition(1, 1, items, gridColumns);

            const newItem = {
                type: 'section',
                x: slot.x,
                y: slot.y,
                w: 1,
                h: 1,
                content: JSON.stringify({ title: '' })
            };
            const createdItem = await dashboardStore.addItem(newItem);
            if (createdItem) {
                eventBus.emit(EVENTS.SHOW_WIDGET_CONFIG, { item: createdItem, type: 'section' });
            }
        } else if (action === 'add-dashboard') {
            const addDashboardModal = document.createElement('add-dashboard-modal') as any;
            document.body.appendChild(addDashboardModal);
            
            const handleClose = () => {
                addDashboardModal.removeEventListener('modal-close', handleClose);
                if (addDashboardModal.parentNode) {
                    addDashboardModal.parentNode.removeChild(addDashboardModal);
                }
            };
            
            addDashboardModal.addEventListener('modal-close', handleClose);
            // Assuming the modal auto-opens on connectedCallback or we just let it render.
            // Since AddDashboardModal.ts calls this.dialog.showModal() in render(), it will open upon connection.
        }
    });
}

// Widget Selection Handler
window.addEventListener('widget-selected', async (e: Event) => {
    const customEvent = e as CustomEvent;
    const widgetDef = customEvent.detail;

    const currentState = dashboardStore.getState();
    const items = currentState.items || [];

    const gridColumns = currentState.gridColumns || 12;
    const { collisionService } = await import('./services/collisionService');
    const slot = collisionService.findCompactPosition(widgetDef.defaultW, widgetDef.defaultH, items, gridColumns);

    const newItem = {
        type: 'widget',
        x: slot.x,
        y: slot.y,
        w: widgetDef.defaultW,
        h: widgetDef.defaultH,
        // Content stores specific widget config
        // We use 'widgetId' to identify the type of widget renderer to use
        // MUST be stringified for backend compatibility
        content: JSON.stringify({
            widgetId: widgetDef.id,
            // Default props for specific widgets could go here
            text: (widgetDef.id === 'notepad' || widgetDef.id === 'markdown') ? '' : undefined
        })
    };
    const created = await dashboardStore.addItem(newItem);

    // Widgets that need first-time setup (location, endpoint, host…) open their
    // config right away — see WidgetDefinition.configOnAdd.
    if (created && widgetDef.configOnAdd) {
        const { eventBus, EVENTS } = await import('./services/EventBus');
        eventBus.emit(EVENTS.SHOW_WIDGET_CONFIG, { item: created, type: 'widget' });
    }
});

window.addEventListener('drawer-close', () => {
    if (topbar) topbar.setState({ drawerOpen: false });
});

// Close menu on click outside (for add-menu, search is handled by topbar)
window.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const addMenu = document.getElementById('add-menu');
    const addButton = document.getElementById('add-toggle');
    if (addMenu && addMenu.classList.contains('active') && !addMenu.contains(target) && addButton && !addButton.contains(target)) {
        addMenu.classList.remove('active');
    }
});

// Render Dashboard Components
function renderDashboard() {
    if (!dashboardRoot) return;

    dashboardRoot.innerHTML = '';
    const grid = document.createElement('bookmark-grid');
    dashboardRoot.appendChild(grid);
}
