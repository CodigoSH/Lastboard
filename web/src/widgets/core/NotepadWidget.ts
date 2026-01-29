
import { LitElement, html, css, PropertyValueMap } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

import { dashboardStore } from '../../store/dashboardStore';

// --- Icons (Lucide-style) ---
const ICONS = {
    bold: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>`,
    italic: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
    underline: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,
    strike: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,
    h1: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`,
    h2: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,
    list: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    listOrdered: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
    checklist: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2"/><path d="m9 12 2 2 4-4"/></svg>`,
    link: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    image: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    color: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>`,
    undo: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,
    redo: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>`,
    alignLeft: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
    alignCenter: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>`,
    alignRight: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
    code: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    clear: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,
    edit: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    save: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
};

@customElement('widget-notepad')
export class NotepadWidget extends LitElement {

    // External Attributes
    @property({ type: Number, attribute: 'item-id' }) itemId: number = 0;
    @property({ type: String }) content: string = '';

    // Internal State
    @state() private isInternalEditing: boolean = false;
    @state() private isDashboardEditing: boolean = false;

    // DOM Query
    @query('.editor-content') editorElement!: HTMLElement;

    private _unsubscribe: (() => void) | undefined;

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: rgba(30, 30, 35, 0.7);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            overflow: hidden;
            color: #fff;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            box-sizing: border-box;
            position: relative;
        }

        .container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
            width: 100%;
            height: 100%;
        }

        /* Toolbar */
        .toolbar {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            overflow-x: auto;
            flex-shrink: 0;
            min-height: 44px;
            /* Visual Continuity Hint */
            mask-image: linear-gradient(to right, black calc(100% - 24px), transparent 100%);
            -webkit-mask-image: linear-gradient(to right, black calc(100% - 24px), transparent 100%);
            transition: background 0.2s ease;
        }
        .toolbar:hover {
            background: rgba(255, 255, 255, 0.06);
        }
        .toolbar::-webkit-scrollbar { height: 0px; }
        
        .group {
            display: flex;
            align-items: center;
            gap: 2px;
            padding-right: 6px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            margin-right: 4px;
            flex-shrink: 0;
        }
        .group:last-child { border-right: none; }
        
        button {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
        }
        button:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
        button svg { width: 16px; height: 16px; }
        button.text-icon { font-weight: 700; font-size: 11px; width: auto; padding: 0 6px;}

        .color-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }
        .color-input { 
            position: absolute; 
            top: 0; left: 0; 
            width: 100%; height: 100%; 
            opacity: 0; 
            cursor: pointer; 
        }

        /* Content Area */
        .content-area {
            flex: 1;
            padding: 16px;
            padding-bottom: 60px;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #ffffff !important;
            word-break: break-word;
            outline: none;
            display: block;
            width: 100%;
            height: 100%;
            min-height: 0; /* Flexbox scroll fix */
        }
        
        .content-area:empty::before {
            content: 'Start writing your notes...';
            color: rgba(255, 255, 255, 0.3);
            font-style: italic;
            pointer-events: none;
        }

        /* FABs */
        .fab-btn {
            position: absolute;
            bottom: 15px;
            right: 15px;
            z-index: 100; /* Ensure it's on top */
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            /* High Visibility Style */
            background: var(--accent, #0078d4);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fab-btn:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            filter: brightness(1.1);
        }

        .edit-btn {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(4px);
            color: rgba(255,255,255,0.8);
        }
        .edit-btn:hover { background: var(--accent, #ff4757); color: white; }

        .save-btn {
            background: var(--accent, #ff4757);
            color: white;
        }
        .save-btn:hover { background: #ff6b81; }

        /* Typography Styles */
        h1 { font-size: 1.6em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.2em; margin-top:0;}
        h2 { font-size: 1.4em; margin-top:0.5em;}
        a { color: var(--accent, #ff4757); }
        blockquote { border-left: 3px solid var(--accent, #ff4757); padding-left: 1em; color: rgba(255,255,255,0.6); }
        img { max-width: 100%; border-radius: 8px; }
    `;

    connectedCallback() {
        super.connectedCallback();

        // Subscribe to store
        this._unsubscribe = dashboardStore.subscribe((state) => {
            const wasEditing = this.isDashboardEditing;
            this.isDashboardEditing = state.isEditing || false;

            if (wasEditing !== this.isDashboardEditing) {
                if (this.isDashboardEditing) {
                    // Just exit internal edit mode without saving to prevent loop
                    this.isInternalEditing = false;
                    this.requestUpdate();
                } else {
                    // Reload content when exiting dashboard edit mode
                    this.loadFromStore();
                }
            }
        });

        // Initial Load
        const state = dashboardStore.getState();
        this.isDashboardEditing = state.isEditing || false;
        this.loadFromStore();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._unsubscribe) this._unsubscribe();
    }

    // Ensure content prop is respected
    updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
        console.log('[Notepad Lifecycle] Updated:', changedProperties, 'Current Content:', this.content);

        if (changedProperties.has('content') && !this.isInternalEditing && this.editorElement) {
            // If receiving prop update from outside, sync view if not typing
            // Note: using innerHTML is safe here because we are targeting the specific content div
            // managed by Lit, but simpler to rely on Lit's binding if possible
            // However, for unsafeHTML-like behavior we use innerHTML on update
            if (this.editorElement.innerHTML !== this.content) {
                this.editorElement.innerHTML = this.content || '';
            }
        }
    }

    private loadFromStore() {
        if (!this.itemId) return;
        const state = dashboardStore.getState();
        const item = state.items.find((i: any) => i.id === this.itemId);
        if (item) {
            this.parseAndSetContent(item.content);
        }
    }

    private parseAndSetContent(rawValue: any) {
        try {
            let content = rawValue;
            if (typeof rawValue === 'string') {
                try {
                    const parsed = JSON.parse(rawValue);
                    if (parsed && typeof parsed === 'object') {
                        content = parsed.text || '';
                    }
                } catch (e) { }
            } else if (typeof rawValue === 'object') {
                content = rawValue.text || '';
            }
            this.content = content || '';
        } catch (e) {
            this.content = '';
        }
    }

    private exec(cmd: string, val?: string) {
        document.execCommand(cmd, false, val);
        if (this.editorElement) this.editorElement.focus();
    }

    private saveContent() {
        try {
            const editor = this.shadowRoot?.querySelector('.editor') || this.shadowRoot?.querySelector('[contenteditable]');
            if (!editor) throw new Error("Critical: Editor div missing");

            const newContent = editor.innerHTML;
            console.log('[Notepad] Saving:', newContent);

            // 1. Update Local State (Visual feedback)
            this.content = newContent;
            this.isInternalEditing = false;
            this.requestUpdate();

            // 2. Data Persistence (The Fix)
            setTimeout(() => {
                if (this.itemId) {
                    // A. Get current state to preserve 'widgetId' and other props
                    const currentItem = dashboardStore.getState().items.find((i: any) => i.id === this.itemId);

                    let existingContent = {};
                    try {
                        existingContent = typeof currentItem?.content === 'string'
                            ? JSON.parse(currentItem.content)
                            : currentItem?.content || {};
                    } catch (e) {
                        console.warn('Failed to parse existing content', e);
                    }

                    // B. Merge existing props (like widgetId) with new text
                    const finalContent = {
                        ...existingContent,
                        text: newContent
                    };

                    // C. Save the complete object
                    dashboardStore.updateItem({
                        id: this.itemId,
                        content: JSON.stringify(finalContent)
                    }).catch((err: any) => console.error('[Store Update Failed]', err));
                }
            }, 0);

        } catch (err) {
            console.error('[Notepad Save Error]', err);
            alert('Save Failed: ' + err);
        }
    }

    private startEditing() {
        if (this.isDashboardEditing) return; // Locked
        this.isInternalEditing = true;
        // Focus next tick
        setTimeout(() => {
            if (this.editorElement) {
                this.editorElement.focus();
                // Ensure content is there (Lit might have re-rendered)
                if (this.editorElement.innerHTML !== this.content) {
                    this.editorElement.innerHTML = this.content || ''; // Fallback to empty string
                }
            }
        }, 0);
    }

    private handleColor(e: Event) {
        const input = e.target as HTMLInputElement;
        this.exec('foreColor', input.value);
    }

    private handleToolbarWheel(e: WheelEvent) {
        e.preventDefault();
        const toolbar = e.currentTarget as HTMLElement;
        toolbar.scrollLeft += e.deltaY;
    }

    private insertChecklist() {
        // Simple HTML checklist implementation
        const id = 'chk-' + Math.random().toString(36).substr(2, 9);
        const html = `<div style="display:flex; align-items:center; margin: 4px 0;"><input type="checkbox" id="${id}" style="margin-right:8px;"><label for="${id}">New Item</label></div>`;
        this.exec('insertHTML', html);
    }

    private insertCode() {
        const html = `<pre style="background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; font-family:monospace; margin:8px 0;"><code>Code Block</code></pre><p><br></p>`;
        this.exec('insertHTML', html);
    }

    render() {
        try {
            // --- VIEW MODE ---
            // --- VIEW MODE ---
            if (!this.isInternalEditing) {
                return html`
                    <div 
                        class="viewer" 
                        style="flex: 1; width: 100%; height: 100%; min-height: 100px; color: #ffffff !important; overflow-y: auto; padding: 16px; word-wrap: break-word;"
                        .innerHTML="${this.content || '<span style=\'opacity:0.5; font-style:italic\'>Start writing...</span>'}"
                    ></div>

                    <button class="fab-btn" @click="${() => this.isInternalEditing = true}" style="position: absolute; bottom: 10px; right: 10px; z-index: 10;">
                        ${ICONS.edit}
                    </button>
                `;
            }

            // --- EDIT MODE ---
            return html`
                <div class="container">
                    <div class="toolbar" @wheel="${this.handleToolbarWheel}" title="Scroll horizontally with mouse wheel to see more tools">
                        <!-- History Group -->
                        <div class="group">
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('undo'); }}" title="Undo">${ICONS.undo}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('redo'); }}" title="Redo">${ICONS.redo}</button>
                        </div>
                        
                        <!-- Text Group -->
                        <div class="group">
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('formatBlock', 'H1'); }}" title="Heading 1">${ICONS.h1}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('formatBlock', 'H2'); }}" title="Heading 2">${ICONS.h2}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('bold'); }}" title="Bold">${ICONS.bold}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('italic'); }}" title="Italic">${ICONS.italic}</button>
                            
                            <!-- Color Picker -->
                            <div class="color-wrapper">
                                <button title="Text Color">${ICONS.color}</button>
                                <input type="color" class="color-input" @change="${this.handleColor}" title="Text Color" />
                            </div>
                        </div>

                        <!-- Paragraph Group -->
                        <div class="group">
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('justifyLeft'); }}" title="Align Left">${ICONS.alignLeft}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('justifyCenter'); }}" title="Align Center">${ICONS.alignCenter}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('justifyRight'); }}" title="Align Right">${ICONS.alignRight}</button>
                        </div>
                        
                        <div class="group">
                            <button @click="${(e: Event) => { e.preventDefault(); this.insertChecklist(); }}" title="Insert Checklist">${ICONS.checklist}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('insertUnorderedList'); }}" title="Bullet List">${ICONS.list}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('insertOrderedList'); }}" title="Numbered List">${ICONS.listOrdered}</button>
                        </div>

                        <!-- Insert Group -->
                        <div class="group">
                            <button @click="${(e: Event) => { e.preventDefault(); this.insertCode(); }}" title="Code Block">${ICONS.code}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); const u = prompt('URL:'); if (u) this.exec('createLink', u); }}" title="Insert Link">${ICONS.link}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); const u = prompt('Image URL:'); if (u) this.exec('insertImage', u); }}" title="Insert Image">${ICONS.image}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('removeFormat'); }}" title="Clear Formatting">${ICONS.clear}</button>
                        </div>
                    </div>

                    <!-- Note: using .innerHTML binding for initial content, contenteditable will manage changes -->
                    <div class="content-area editor" 
                         contenteditable="true" 
                         spellcheck="false"
                         .innerHTML="${this.content}">
                    </div>

                    <button class="fab-btn save-btn" @click="${this.saveContent}" title="Save">${ICONS.save}</button>
                </div>
            `;
        } catch (e: any) {
            return html`
                <div style="background: blue; color: white; padding: 20px; height: 100%; overflow:auto;">
                    <h3>CRITICAL ERROR</h3>
                    <pre>${e.toString()}</pre>
                    <pre>${e.stack}</pre>
                </div>
            `;
        }
    }
}
