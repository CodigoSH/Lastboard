/**
 * AddBookmarkModal Template
 */

interface AddBookmarkModalData {
    isOpen: boolean;
    isEditMode: boolean;
}

export const template = ({ isOpen, isEditMode }: AddBookmarkModalData) => `
    <div class="modal-overlay ${isOpen ? 'modal-overlay--active' : ''}" id="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">${isEditMode ? 'Edit Bookmark' : 'Add Bookmark'}</h2>
                <button class="modal-close" id="modal-close">×</button>
            </div>
            <form class="modal-form" id="bookmark-form">
                <div class="form-group">
                    <label for="bookmark-label">Label</label>
                    <input type="text" id="bookmark-label" name="label" placeholder="GitHub" required />
                </div>
                <div class="form-group">
                    <label for="bookmark-url">URL</label>
                    <input type="url" id="bookmark-url" name="url" placeholder="https://github.com" required />
                </div>
                <div class="form-group">
                    <label>Icon</label>
                    <div id="icon-picker-container"></div>
                </div>
                <div class="form-group checkbox-group" style="flex-direction: row; align-items: center; gap: 8px;">
                    <input type="checkbox" id="bookmark-status" name="statusCheck" />
                    <label for="bookmark-status" style="margin: 0; cursor: pointer;">Monitor Status (Ping)</label>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" id="btn-cancel">Cancel</button>
                    <button type="submit" class="btn-submit">Save</button>
                </div>
            </form>
        </div>
    </div>
`;
