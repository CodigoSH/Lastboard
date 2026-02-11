
import { dashboardStore } from '../../store/dashboardStore';
import { WidgetContentHelper } from '../../services/widgetContentHelper';
import { MarkdownParser } from '../../services/MarkdownParser';
import { i18n } from '../../services/i18n';

// ============================================================================
// ICONS
// ============================================================================
const ICONS = {
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
    preview: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
};

export class MarkdownWidget extends HTMLElement {
    private _itemId: number = 0;
    private _content: string = '';
    private _isPreviewMode: boolean = false;
    private _isLocked: boolean = true; // Default to locked (read-only)
    private _isDirty: boolean = false;
    private _isSaving: boolean = false;

    private _editor: HTMLTextAreaElement | null = null;
    private _preview: HTMLDivElement | null = null;
    private _headerActions: HTMLDivElement | null = null;
    private _lockBtn: HTMLButtonElement | null = null;
    private _togglePreviewBtn: HTMLButtonElement | null = null;
    // private _saveIndicator: HTMLSpanElement | null = null; // Removed

    static get observedAttributes() { return ['item-id']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.loadContent();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'item-id' && oldValue !== newValue) {
            this._itemId = parseInt(newValue, 10);
            this.loadContent();
        }
    }

    private render() {
        if (!this.shadowRoot) return;

        const lockClass = this._isLocked ? 'locked' : 'unlocked';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    background: var(--lb-bg-card);
                    color: var(--lb-text-main);
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                    --lb-accent: var(--accent, #0078D4);
                    --lb-border: var(--border, rgba(255,255,255,0.1));
                    --lb-text-dim: var(--text-dim, rgba(255,255,255,0.5));
                }

                /* Header Actions (Top Right) */
                .header-actions {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    display: flex;
                    gap: 6px; /* Closer gap */
                    z-index: 10;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                :host(:hover) .header-actions {
                    opacity: 1;
                }
                
                :host(.locked) .header-actions {
                    opacity: 1;
                }

                .action-btn {
                    /* Match Notepad .dock-btn / .top-lock-btn style base */
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    color: var(--lb-text-dim);
                    cursor: pointer;
                    width: 28px; /* Match Notepad 28px */
                    height: 28px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    backdrop-filter: blur(4px);
                }

                .action-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: var(--lb-text-main);
                    transform: scale(1.05); /* Match Notepad hover effect */
                }

                .action-btn.active {
                    background: var(--lb-accent);
                    color: #fff;
                    border-color: var(--lb-accent);
                }

                /* Lock Button Specifics - Match Notepad .top-lock-btn */
                .action-btn.lock-btn {
                    /* Default (Unlocked/Edit Mode) -> Red/Alert hint */
                    color: #ff453a; 
                    background: rgba(255, 69, 58, 0.15); 
                    border-color: rgba(255, 69, 58, 0.3);
                }
                .action-btn.lock-btn.locked {
                    /* Locked (Safe Mode) -> Dim/Gray */
                    color: var(--lb-text-dim); 
                    background: rgba(0,0,0,0.2); 
                    border-color: rgba(255,255,255,0.05);
                }
                .action-btn.lock-btn.locked:hover {
                    background: rgba(255,255,255,0.1);
                    color: var(--lb-text-main);
                }

                .action-btn svg {
                    width: 14px; /* Match Notepad icon size */
                    height: 14px;
                }

                .editor-container {
                    flex-grow: 1;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    padding-top: 20px; 
                }

                textarea.editor {
                    flex-grow: 1;
                    width: 100%;
                    height: 100%;
                    background: transparent !important;
                    background-color: transparent !important;
                    border: none !important;
                    color: var(--lb-text-main);
                    caret-color: var(--lb-accent);
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    font-size: 14px;
                    padding: 16px;
                    resize: none;
                    outline: none !important;
                    box-shadow: none !important;
                    box-sizing: border-box;
                    line-height: 1.6;
                }

                textarea.editor:disabled {
                    opacity: 0.7; 
                    cursor: default;
                }

                .preview {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    padding: 16px;
                    padding-top: 36px; 
                    overflow-y: auto;
                    box-sizing: border-box;
                    display: none;
                    font-family: var(--lb-font-sans, system-ui, sans-serif);
                    line-height: 1.6;
                    background: var(--lb-bg-card); 
                    z-index: 5;
                }

                /* Markdown Styles for Preview */
                .preview h1, .preview h2, .preview h3 { margin-top: 1em; margin-bottom: 0.5em; color: var(--lb-text-header); font-weight: 600; }
                .preview h1 { font-size: 1.6em; border-bottom: 1px solid var(--lb-border); padding-bottom: 0.3em; }
                .preview h2 { font-size: 1.4em; }
                .preview h3 { font-size: 1.2em; }
                .preview p { margin-bottom: 1em; }
                .preview ul, .preview ol { padding-left: 24px; margin-bottom: 1em; }
                .preview li { margin-bottom: 4px; }
                .preview blockquote { border-left: 3px solid var(--lb-accent); margin: 0 0 1em 0; padding-left: 12px; color: var(--lb-text-dim); font-style: italic; }
                .preview code { background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
                .preview pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; }
                .preview pre code { background: transparent; padding: 0; }
                .preview img { max-width: 100%; border-radius: 6px; margin: 8px 0; }
                .preview a { color: var(--lb-accent); text-decoration: none; }
                .preview a:hover { text-decoration: underline; }
                .preview hr { border: none; border-top: 1px solid var(--lb-border); margin: 16px 0; }
                .preview .checklist-item { display: flex; align-items: start; gap: 8px; margin-bottom: 6px; }
                .preview .checklist-item input { margin-top: 5px; cursor: default; }

                @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
            </style>

            <div class="header-actions">
                <button class="action-btn toggle-preview" title="${i18n.t('widget.markdown.tool.toggle_preview')}" style="${this._isLocked ? 'display:none' : ''}">
                    ${ICONS.preview}
                </button>
                <button class="action-btn lock-btn ${lockClass}" title="${this._isLocked ? i18n.t('widget.markdown.tool.unlock') : i18n.t('widget.markdown.tool.lock')}">
                    ${this._isLocked ? ICONS.lock : ICONS.unlock}
                </button>
            </div>

            <div class="editor-container">
                <textarea class="editor" placeholder="${i18n.t('widget.markdown.placeholder')}" style="${this._isLocked ? 'display:none' : ''}"></textarea>
                <div class="preview ${this._isLocked ? 'visible' : ''}"></div>
            </div>
        `;

        this._editor = this.shadowRoot.querySelector('.editor');
        this._preview = this.shadowRoot.querySelector('.preview');
        this._headerActions = this.shadowRoot.querySelector('.header-actions');
        this._lockBtn = this.shadowRoot.querySelector('.lock-btn');
        this._togglePreviewBtn = this.shadowRoot.querySelector('.toggle-preview');

        this.bindEvents();
    }

    private bindEvents() {
        this._editor?.addEventListener('input', () => this.handleInput());
        this._editor?.addEventListener('keydown', (e) => this.handleKeydown(e));

        this._headerActions?.addEventListener('click', (e) => {
            const btn = (e.target as Element).closest('.action-btn');
            if (!btn) return;

            if (btn.classList.contains('toggle-preview')) {
                this.togglePreview();
            } else if (btn.classList.contains('lock-btn')) {
                this.toggleLock();
            }
        });
    }

    private handleInput() {
        if (this._isLocked) return;
        this._isDirty = true;
        // No auto-save. Only save on lock.

        // Live update preview if visible (optional, keeping it manual toggle mostly for perf)
        if (this._isPreviewMode) {
            this.updatePreview();
        }
    }

    private handleKeydown(e: KeyboardEvent) {
        if (this._isLocked) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertText('  ');
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.save();
        }
    }

    private insertText(text: string) {
        if (!this._editor) return;
        const start = this._editor.selectionStart;
        const end = this._editor.selectionEnd;
        const val = this._editor.value;

        this._editor.value = val.substring(0, start) + text + val.substring(end);
        this._editor.selectionStart = this._editor.selectionEnd = start + text.length;

        this.handleInput();
    }

    private togglePreview() {
        this._isPreviewMode = !this._isPreviewMode;

        if (this._togglePreviewBtn) {
            this._togglePreviewBtn.classList.toggle('active', this._isPreviewMode);
        }

        // Apply View State
        this.applyViewState();
    }

    private updatePreview() {
        if (this._editor && this._preview) {
            try {
                this._preview.innerHTML = MarkdownParser.parse(this._editor.value);
            } catch (e) {
                console.error('Markdown parsing failed', e);
                this._preview.innerHTML = `<div class="error">${i18n.t('widget.markdown.error.preview')}</div>`;
            }
        }
    }

    private applyViewState() {
        if (this._isPreviewMode) {
            this.updatePreview();
            if (this._preview) {
                this._preview.classList.add('visible');
                this._preview.style.display = 'block';
            }
            if (this._editor) {
                this._editor.style.display = 'none';
                this._editor.style.visibility = 'hidden';
            }
        } else {
            if (this._preview) {
                this._preview.classList.remove('visible');
                this._preview.style.display = 'none';
            }
            if (this._editor) {
                this._editor.style.display = 'block';
                this._editor.style.visibility = 'visible';
            }
        }
    }

    private toggleLock() {
        this._isLocked = !this._isLocked;

        // Update Editor State
        if (this._editor) {
            this._editor.disabled = this._isLocked;
        }

        // Update Button UI
        if (this._lockBtn) {
            this._lockBtn.innerHTML = this._isLocked ? ICONS.lock : ICONS.unlock;
            this._lockBtn.title = this._isLocked ? i18n.t('widget.markdown.tool.unlock') : i18n.t('widget.markdown.tool.lock');

            if (this._isLocked) {
                this._lockBtn.classList.add('locked');
                this._lockBtn.classList.remove('unlocked');
            } else {
                this._lockBtn.classList.remove('locked');
                this._lockBtn.classList.add('unlocked');
            }
        }

        // Handle Mode Switching
        if (this._isLocked) {
            // Locked = Preview Mode Force
            this._isPreviewMode = true;
            if (this._togglePreviewBtn) this._togglePreviewBtn.style.display = 'none';
        } else {
            // Unlocked = Edit Mode Force
            this._isPreviewMode = false;
            if (this._togglePreviewBtn) {
                this._togglePreviewBtn.style.display = 'flex';
                this._togglePreviewBtn.classList.remove('active');
            }
            // Auto focus
            this._editor?.focus();
        }

        // Apply visual changes
        this.applyViewState();

        // Save if locking
        if (this._isLocked && this._isDirty) {
            this.save();
        }
    }

    private async loadContent() {
        if (!this._itemId) return;
        const state = dashboardStore.getState();
        const item = state.items.find((i: any) => i.id === this._itemId);

        if (item) {
            const content = WidgetContentHelper.getMarkdownText(item.content);
            this._content = content;
            if (this._editor) this._editor.value = content;

            // Initial Preview Render if locked
            if (this._isLocked) this.updatePreview();
        }
    }

    private async save() {
        if (!this._itemId || !this._editor) return;

        this._isSaving = true;

        const newText = this._editor.value;
        this._content = newText;

        try {
            const state = dashboardStore.getState();
            const currentItem = state.items.find((i: any) => i.id === this._itemId);

            if (currentItem) {
                const newContent = WidgetContentHelper.setMarkdownText(currentItem.content, newText);
                await dashboardStore.updateItem({ ...currentItem, content: newContent });

                this._isDirty = false;
            }
        } catch (e) {
            console.error(e);
        } finally {
            this._isSaving = false;
        }
    }
}

customElements.define('widget-markdown', MarkdownWidget);
