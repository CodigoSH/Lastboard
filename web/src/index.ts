import { userStore } from './store/userStore';
import { dashboardStore } from './store/dashboardStore';
import { statusService } from './services/StatusService';

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
import './components/ui/ConfirmationModal/ConfirmationModal';

const topbar = document.getElementById('main-topbar') as any;
const drawer = document.getElementById('right-drawer') as any;
const dashboardRoot = document.getElementById('dashboard-root') as HTMLElement;
let addBookmarkModal: any;
let confirmationModal: any;

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize stores
    await userStore.fetchUser();
    await dashboardStore.fetchItems();

    // Render dashboard components
    renderDashboard();

    // Start status monitoring
    statusService.start();

    // Create and append modals
    addBookmarkModal = document.createElement('add-bookmark-modal');
    document.body.appendChild(addBookmarkModal);

    confirmationModal = document.createElement('confirmation-modal');
    document.body.appendChild(confirmationModal);
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

    topbar.addEventListener('add-item', (e: CustomEvent) => {
        const action = e.detail.action;

        if (action === 'add-bookmark') {
            if (addBookmarkModal) {
                addBookmarkModal.open();
            }
        } else if (action === 'add-group') {
            const newItem = {
                type: 'group',
                x: 0,
                y: 0,
                w: 2,
                h: 2,
                content: JSON.stringify({ name: 'New Group' })
            };
            // @ts-ignore
            dashboardStore.addItem(newItem);
        } else if (action === 'add-section') {
            const newItem = {
                type: 'section',
                x: 0,
                y: 0,
                w: 12, // Full width by default
                h: 1,
                content: JSON.stringify({ name: 'New Section' })
            };
            // @ts-ignore
            dashboardStore.addItem(newItem);
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
