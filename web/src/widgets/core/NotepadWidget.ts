
import { dashboardStore } from '../../store/dashboardStore';
import { i18n } from '../../services/i18n';

class NotepadWidget extends HTMLElement {
    private _itemId: number = 0;
    private _content: string = '';
    private textarea: HTMLTextAreaElement | null = null;
    private debugEl: HTMLElement | null = null;
    private saveTimeout: any;

    static get observedAttributes() {
        return ['item-id', 'content'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'item-id') {
            this._itemId = parseInt(newValue, 10);
        } else if (name === 'content') {
            if (this.textarea && this.textarea.value !== newValue) {
                this.textarea.value = newValue || '';
            }
            this._content = newValue || '';
        }
    }

    connectedCallback() {
        this.render();
        // Force init
        if (this.textarea) this.textarea.value = this._content;
    }


    private isEditing: boolean = false;
    private editor: HTMLElement | null = null;
    private view: HTMLElement | null = null;

    render() {
        if (!this.shadowRoot) return;

        // Simple toolbar for Edit Mode
        const toolbarHtml = `
            <div class="toolbar">
                <button onclick="document.execCommand('bold',false,null)" title="Bold"><b>B</b></button>
                <button onclick="document.execCommand('italic',false,null)" title="Italic"><i>I</i></button>
                <!-- Simple color picker or presets -->
                <button onclick="document.execCommand('foreColor',false,'#ff4757')" style="color:#ff4757">A</button>
                <button onclick="document.execCommand('foreColor',false,'#ffa502')" style="color:#ffa502">A</button>
                <button onclick="document.execCommand('foreColor',false,'#2ed573')" style="color:#2ed573">A</button>
                <button class="save-btn">Done</button>
            </div>
        `;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    background: var(--surface);
                    color: var(--text-main);
                    border-radius: var(--radius);
                    box-sizing: border-box;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }
                .content-view {
                    flex: 1;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    word-break: break-word;
                    cursor: pointer;
                }
                .content-view:hover {
                    box-shadow: inset 0 0 0 1px var(--border);
                    border-radius: 4px;
                }
                .editor {
                    flex: 1;
                    overflow-y: auto;
                    outline: none;
                    white-space: pre-wrap;
                    word-break: break-word;
                    border: 1px dashed var(--accent);
                    padding: 4px;
                    border-radius: 4px;
                }
                .toolbar {
                    display: flex;
                    gap: 4px;
                    margin-bottom: 8px;
                    border-bottom: 1px solid var(--border);
                    padding-bottom: 4px;
                }
                .toolbar button {
                    background: var(--bg-body);
                    border: 1px solid var(--border);
                    color: var(--text-main);
                    border-radius: 4px;
                    cursor: pointer;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                }
                .toolbar button:hover {
                    background: var(--accent);
                    color: white;
                    border-color: var(--accent);
                }
                .toolbar .save-btn {
                    width: auto;
                    padding: 0 8px;
                    margin-left: auto;
                    font-weight: bold;
                    color: var(--accent);
                }
                .status {
                    height: 14px;
                    font-size: 10px;
                    color: var(--text-dim);
                    text-align: right;
                    font-family: monospace;
                    opacity: 0.7;
                    margin-top: 4px;
                }
                .edit-hint {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    opacity: 0;
                    transition: opacity 0.2s;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 10px;
                    pointer-events: none;
                }
                :host(:hover) .edit-hint {
                    opacity: 0.5;
                }
            </style>
            
            ${this.isEditing ? toolbarHtml : `<div class="edit-hint">Click to Edit</div>`}

            ${this.isEditing
                ? `<div class="editor" contenteditable="true"></div>`
                : `<div class="content-view"></div>`
            }
            
            <div class="status"></div>
        `;

        this.debugEl = this.shadowRoot.querySelector('.status');

        if (this.isEditing) {
            this.editor = this.shadowRoot.querySelector('.editor');
            if (this.editor) {
                this.editor.innerHTML = this._content; // Use innerHTML for Rich Text
                this.editor.focus();

                // Bind Toolbar Save
                const saveBtn = this.shadowRoot.querySelector('.save-btn');
                saveBtn?.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent bubbling to other clicks
                    this.save();
                });
            }
        } else {
            this.view = this.shadowRoot.querySelector('.content-view');
            if (this.view) {
                this.view.innerHTML = this._content || '<span style="color:var(--text-dim); font-style:italic;">Empty note. Click to write...</span>';
                this.view.addEventListener('click', () => {
                    this.isEditing = true;
                    this.render();
                });
            }
        }
    }

    private async save() {
        if (!this._itemId) return;

        if (this.editor) {
            this._content = this.editor.innerHTML;
        }

        if (this.debugEl) this.debugEl.textContent = 'Saving...';

        await dashboardStore.updateItem({
            id: this._itemId,
            content: JSON.stringify({ text: this._content })
        });

        if (this.debugEl) this.debugEl.textContent = 'Saved';

        // Exit Edit Mode
        this.isEditing = false;
        this.render();
    }
}

customElements.define('widget-notepad', NotepadWidget);
