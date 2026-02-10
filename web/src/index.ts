import { userStore } from './store/userStore';
import { dashboardStore } from './store/dashboardStore';
import { statusService } from './services/StatusService';
import { ThemeService } from './services/ThemeService';
import { i18n } from './services/i18n';

// Import components to register them
import './components/ui/Paper/Paper';
import './components/ui/Button/Button';
import './components/ui/Avatar/Avatar';
import './components/ui/SettingsContent/SettingsContent';
import './components/ui/RightDrawer/RightDrawer';
import './components/ui/TopBar/TopBar';
import './components/ui/ReferenceHeader/ReferenceHeader';
import './components/dashboard/BookmarkGrid/BookmarkGrid';
import './components/ui/Notifier/Notifier';
import './components/ui/IconPicker/IconPicker';
import './components/ui/AddBookmarkModal/AddBookmarkModal';
import './components/ui/AddWidgetModal/AddWidgetModal';
import './components/ui/WidgetConfigModal/WidgetConfigModal';
import './components/ui/ConfirmationModal/ConfirmationModal';
// Widget Components
import './widgets/core/NotepadWidget';
import './widgets/core/ClockWidget';
import './widgets/core/TelemetryWidget';
import './widgets/core/WeatherWidget';

const topbar = document.getElementById('main-topbar') as any;
const drawer = document.getElementById('right-drawer') as any;
const dashboardRoot = document.getElementById('dashboard-root') as HTMLElement;
let addBookmarkModal: any;
let addWidgetModal: any;
let confirmationModal: any;

import { bootstrap } from './core/bootstrap';

// Initialize Application
bootstrap(async () => {
    // Flash-prevention: apply a theme before the user record arrives so the
    // page does not flicker.  serveIndex already injects the correct class
    // from the DB; this call only matters for the 'system' edge case.
    ThemeService.init();

    // Initialize stores
    await userStore.fetchUser();

    // ── Per-user sync ──────────────────────────────────────────────
    // After the authenticated user is fetched, every preference that lives in
    // browser-local storage (language, theme, item cache) must be overwritten
    // with the backend value.  Without this a second user logging into the
    // same browser would inherit the first user's language, theme and cached
    // dashboard items.
    const u = userStore.getUser();
    if (u) {
        // Language: overwrite i18n with the backend preference.
        if (u.language) {
            await i18n.setLanguage(u.language);
        }

        // Theme: apply from backend and update the cookie that serveIndex
        // reads, so the next page-load renders the correct class server-side.
        if (u.preferences && u.preferences.grid_columns) {
            document.documentElement.style.setProperty('--user-preferred-columns', u.preferences.grid_columns.toString());
        }

        if (u.theme === 'dark') {
            ThemeService.enableDark();
        } else if (u.theme === 'light') {
            ThemeService.enableLight();
        } else {
            // 'system' — honour OS preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                ThemeService.enableDark();
            } else {
                ThemeService.enableLight();
            }
        }

        // Dashboard items: scope the localStorage cache to this user so a
        // different user logging into the same browser never sees stale items.
        if (u.id) {
            dashboardStore.setUserId(u.id);
        }
    }
    // ── end per-user sync ──────────────────────────────────────────

    // Inject user into topbar for permission handling
    if (topbar) {
        topbar.setState({ user: u });
        if (u && u.project_name) {
            topbar.setAttribute('title', u.project_name);
        }

        // Dynamic update
        userStore.subscribe((user) => {
            if (user) {
                topbar.setState({ user });
                if (user.project_name) {
                    topbar.setAttribute('title', user.project_name);
                }
            }
        });
    }

    await dashboardStore.fetchItems();

    // Render dashboard components
    renderDashboard();

    // Start status monitoring
    statusService.start();

    // Create and append modals
    addBookmarkModal = document.createElement('add-bookmark-modal');
    document.body.appendChild(addBookmarkModal);

    addWidgetModal = document.createElement('add-widget-modal');
    document.body.appendChild(addWidgetModal);

    confirmationModal = document.createElement('confirmation-modal');
    document.body.appendChild(confirmationModal);

    const widgetConfigModal = document.createElement('widget-config-modal');
    document.body.appendChild(widgetConfigModal);
});

// 2. Handle Component Events (TopBar)
import { eventBus, EVENTS } from './services/EventBus';

// Centralized Event Listeners
eventBus.on(EVENTS.SHOW_CONFIRMATION, async (e: any) => {
    const { title, message, onConfirm } = e.detail;
    if (confirmationModal) {
        const confirmed = await confirmationModal.confirm(title, message);
        if (confirmed && onConfirm) {
            onConfirm();
        }
    }
});

eventBus.on(EVENTS.SHOW_WIDGET_CONFIG, (e: any) => {
    const { item, type } = e.detail;
    if (type === 'bookmark') {
        if (addBookmarkModal) addBookmarkModal.openForEdit(item);
    } else {
        const widgetConfigModal = document.querySelector('widget-config-modal') as any;
        if (widgetConfigModal) widgetConfigModal.open(item);
    }
});

eventBus.on(EVENTS.NOTIFY, (e: any) => {
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
            // @ts-ignore
            const items = currentState.items || [];
            const { collisionService } = await import('./services/collisionService');
            const slot = collisionService.findFirstAvailableSlot(1, 1, items);

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
        }
    });
}

// Widget Selection Handler
window.addEventListener('widget-selected', async (e: Event) => {
    const customEvent = e as CustomEvent;
    const widgetDef = customEvent.detail;

    const currentState = dashboardStore.getState();
    // @ts-ignore
    const items = currentState.items || [];

    const { collisionService } = await import('./services/collisionService');
    const slot = collisionService.findFirstAvailableSlot(widgetDef.defaultW, widgetDef.defaultH, items);

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
            text: widgetDef.id === 'notepad' ? '' : undefined
        })
    };
    await dashboardStore.addItem(newItem);
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
