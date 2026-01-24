/**
 * TopBar Component Template
 */

interface TopBarData {
    title: string;
    editMode: boolean;
    searchActive: boolean;
    addMenuActive: boolean;
    drawerOpen: boolean;
    searchQuery: string;
}

export const template = ({ title, editMode, searchActive, addMenuActive, drawerOpen, searchQuery }: TopBarData) => `
    <div class="top-bar">
        <div class="top-bar__title">${title}</div>
        <div class="top-bar__actions">
            <!-- Search Bar -->
            <div id="search-wrapper" class="search-wrapper ${searchActive ? 'search-wrapper--active' : ''}">
                <input type="text" id="search-input" class="search-input" placeholder="SEARCH..." 
                       value="${searchQuery || ''}" onclick="event.stopPropagation()">
                <div id="search-clear" class="search-clear" style="display: ${searchQuery ? 'flex' : 'none'};">×</div>
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" stroke-width="1.2" />
                    <path d="M21 21l-4.35-4.35" stroke-width="1.2" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Item Toggle -->
            <div id="add-toggle" class="top-bar__toggle" title="Add Section or Bookmark" 
                 style="${editMode ? 'display: flex;' : 'display: none;'} margin-right: -6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="1.2" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Menu Dropdown -->
            <div id="add-menu" class="add-menu ${addMenuActive ? 'add-menu--active' : ''}">
                <div class="add-menu-item" data-action="add-bookmark">+ Bookmark</div>
                <div class="add-menu-item" data-action="add-group">+ Group</div>
                <div class="add-menu-item" data-action="add-section">+ Section</div>
            </div>

            <!-- Edit Mode Toggle -->
            <div id="edit-toggle" class="top-bar__toggle" title="Toggle Edit Mode" 
                 style="margin-right: -6px; ${editMode ? 'color: var(--accent);' : ''}">
                <svg id="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke-width="1.2" />
                    <path id="edit-slash" d="M6 6L18 18" stroke-width="1.5" stroke-linecap="round" 
                          style="${editMode ? 'display: block;' : 'display: none;'}" />
                </svg>
            </div>

            <!-- Sidebar Toggle Icon -->
            <div id="drawer-toggle" class="top-bar__toggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-opacity="0.2" />
                    <rect class="top-bar__indicator ${drawerOpen ? 'top-bar__indicator--active' : ''}" 
                          x="15" y="3" width="6" height="18" fill="white" />
                    <path d="M15 3V21" stroke-width="1.2" />
                </svg>
            </div>
        </div>
    </div>
`;
