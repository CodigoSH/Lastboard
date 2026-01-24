/**
 * AddBookmarkModal Template
 */

interface AddBookmarkModalData {
    isOpen: boolean;
}

export const template = ({ isOpen }: AddBookmarkModalData) => `
    <div class="modal-overlay ${isOpen ? 'modal-overlay--active' : ''}" id="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Add Bookmark</h2>
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
                <div class="form-actions">
                    <button type="button" class="btn-cancel" id="btn-cancel">Cancel</button>
                    <button type="submit" class="btn-submit">Add Bookmark</button>
                </div>
            </form>
        </div>
    </div>
`;
