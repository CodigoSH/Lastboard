export const layout = () => `
<dialog id="icon-modal">
    <div class="modal-header">
        <h3 class="modal-title">Select Icon</h3>
        <button class="modal-close" id="close-btn" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    </div>
    <div class="modal-body">
        <icon-picker id="icon-picker-component"></icon-picker>
    </div>
</dialog>
`;
