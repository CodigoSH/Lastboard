import { userStore } from './store/userStore';

// Import components to register them
import './components/ui/Paper/Paper';
import './components/ui/Button/Button';
import './components/ui/Avatar/Avatar';
import './components/ui/SettingsContent/SettingsContent';
import './components/ui/RightDrawer/RightDrawer';
import './components/ui/TopBar/TopBar';
import './components/ui/ReferenceHeader/ReferenceHeader';
import './components/dashboard/BookmarkGrid/BookmarkGrid';
import './components/dashboard/SectionGroup/SectionGroup';
import './components/ui/Notifier/Notifier';

const topbar = document.getElementById('main-topbar') as any;
const drawer = document.getElementById('right-drawer') as any;
const dashboardRoot = document.getElementById('dashboard-root') as HTMLElement;

// 1. Initialize User and Environment
document.addEventListener('DOMContentLoaded', async () => {
    await userStore.fetchUser();
    const user = userStore.getUser();

    if (user) {
        // Initialize infrastructure if needed
    }

    // Render INITIAL Dashboard State
    renderInitialDashboard();
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
        const grids = document.querySelectorAll('bookmark-grid') as NodeListOf<any>;

        grids.forEach(grid => {
            if (!grid._originalData) grid._originalData = [...grid.data];
            grid.data = query === ''
                ? grid._originalData
                : grid._originalData.filter((b: any) => b.label.toLowerCase().includes(query));

            const section = grid.closest('section-group') as HTMLElement;
            if (section) section.style.display = grid.data.length === 0 ? 'none' : 'block';
        });
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

// 3. Dashboard Logic
const infrastructureBookmarks = [
    { label: 'Proxmox', url: '#', icon: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>' },
    { label: 'TrueNAS', url: '#', icon: '<svg viewBox="0 0 24 24"><path d="M20 13H4v-2h16v2zM7 19h10v-2H7v2zM10 7h4V5h-4v2z"/></svg>' },
    { label: 'Cloudflare', url: '#', icon: '<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/></svg>' }
];

const developmentBookmarks = [
    { label: 'GitHub', url: '#', icon: '<svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.341-3.369-1.341-.454-1.152-1.11-1.459-1.11-1.459-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.851.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>' },
    { label: 'VS Code', url: '#', icon: '<svg viewBox="0 0 24 24"><path d="M23.5 7.2L19.4 3.1c-.4-.4-1-.4-1.4 0L12.5 8.6 15.4 11.5l8.1-4.3zM.5 16.8l4.1 4.1c.4.4 1 .4 1.4 0l11.5-11.5L14.6 6.5.5 16.8z"/></svg>' },
    { label: 'Documentation', url: '#', icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' }
];

function createSection(title: string, bookmarks: any[]) {
    const section = document.createElement('section-group');
    section.setAttribute('title', title);
    const grid = document.createElement('bookmark-grid') as any;
    grid.data = bookmarks;
    section.appendChild(grid);
    return section;
}

function renderInitialDashboard() {
    if (!dashboardRoot) return;
    dashboardRoot.innerHTML = '';
    dashboardRoot.appendChild(createSection('Infrastructure', infrastructureBookmarks));
    dashboardRoot.appendChild(createSection('Development', developmentBookmarks));
}
