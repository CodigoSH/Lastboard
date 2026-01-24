import { userStore } from './store/userStore';
import { dashboardStore } from './store/dashboardStore';

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

const topbar = document.getElementById('main-topbar') as any;
const drawer = document.getElementById('right-drawer') as any;
const dashboardRoot = document.getElementById('dashboard-root') as HTMLElement;
let addBookmarkModal: any;

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize stores
    await userStore.fetchUser();
    await dashboardStore.fetchItems();

    // Render dashboard components
    renderDashboard();

    // Create and append modal
    addBookmarkModal = document.createElement('add-bookmark-modal');
    document.body.appendChild(addBookmarkModal);
});

// 2. Handle Component Events (TopBar)
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
        dashboardRoot.classList.toggle('edit-mode', e.detail.active);
    });

    topbar.addEventListener('search-input', (e: CustomEvent) => {
        const query = e.detail.query.toLowerCase().trim();
        // TODO: Implement search filtering through dashboardStore
        // For now, search is disabled until proper store filtering is implemented
        console.log('[Search] Query:', query);
    });

    topbar.addEventListener('add-item', (e: CustomEvent) => {
        const action = e.detail.action;

        if (action === 'add-bookmark') {
            if (addBookmarkModal) {
                addBookmarkModal.open();
            }
        } else if (action === 'add-group') {
            // @ts-ignore
            if (window.notifier) window.notifier.show('Groups not yet implemented', 'info');
        } else if (action === 'add-section') {
            // @ts-ignore
            if (window.notifier) window.notifier.show('Sections not yet implemented', 'info');
        }
    });
}

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
