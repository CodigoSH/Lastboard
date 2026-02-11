/**
 * NotepadWidget
 *
 * "Unified & Dynamic"
 * - Unified Icon System (Consistent 2px Stroke, Round Caps)
 * - Auto-Checklist Logic (Enter -> New Checkbox)
 * - Dynamic Spacing (40px Padding)
 */

import { dashboardStore } from '../../store/dashboardStore';
import { i18n } from '../../services/i18n';
import { WidgetContentHelper } from '../../services/widgetContentHelper';

// ============================================================================
// ICONS (Unified System - Stroke 2px, Round Caps/Joins)
// ============================================================================
// ============================================================================
// ICONS (V14: Pro Minimalist - 1.5px Stroke, Lucide Style)
// ============================================================================
const ICONS = {
    // History
    undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M5 12l6-6"/><path d="M5 12l6 6"/></svg>`, // Simpler arrow
    redo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M19 12l-6-6"/><path d="M19 12l-6 6"/></svg>`,

    // Headings (Clean Sans-Serif Paths)
    h1: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M19 18V6l-2 2"/></svg>`,
    h2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-5 4-8a2 2 0 0 0-4 0"/></svg>`,
    h3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0 0-5H20"/></svg>`,

    // Styles
    bold: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>`, // Keep bold slightly thicker (2px) for contrast
    italic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
    underline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>`,
    strike: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.3 19c-1.4 1.4-3.5 1.4-5.2-.2-1.9-1.9-1.9-5.2 0-7.2l.6-.6c2.2-2.2 6.6-2.2 9.1.5"/><line x1="4" y1="12" x2="20" y2="12"/><path d="M10.2 6c1.6-1.5 3.9-1.5 5.5.1"/></svg>`, // Stylized S with strike
    color: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`, // Droplet

    // Alignment
    alignLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
    alignCenter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>`,
    alignRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
    alignJustify: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,

    // Media
    link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,

    // Lists
    list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    ordered: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 12l2 2 4-4"/></svg>`, // Custom Square Check

    // Extras
    quote: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    eraser_clean: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"/><path d="M11 3L20 12"/></svg>`,

    // System
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
    resize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 9V6a2 2 0 0 0-2-2h-3"/><path d="M3 15v3a2 2 0 0 0 2 2h3"/><path d="M16 20h3a2 2 0 0 0 2-2v-3"/><path d="M8 4H5a2 2 0 0 0-2 2v3"/></svg>`
};

// ============================================================================
// CSS — Theme
// ============================================================================
const CSS = `
:host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    /* V10: Allow dock to overlap parent padding */
    overflow: visible !important;
    position: relative;
    
    --lb-bg: var(--bg-card, #1a1a1a);
    --lb-text: var(--text-main, #ffffff);
    --lb-text-dim: var(--text-dim, rgba(255,255,255,0.5));
    --lb-accent: var(--accent, #0078D4);
    --lb-accent-rgb: var(--accent-rgb, 0, 120, 212);
    --lb-border: var(--border, rgba(255,255,255,0.1));

    /* Clean fix - remove redundant host padding hack */
    color: var(--lb-text);
    font-family: 'Inter', system-ui, sans-serif;
}

/* ── Editor Container ──────────────────────────────────────────────── */
.editor-container {
    flex: 1;
    overflow-y: overlay;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    outline: none;
    position: relative;
    
    /* Balanced Spacing (Enough to not overlap dock, but minimal) */
    padding-bottom: 24px !important; 
}

/* Scrollbar on hover */
.editor-container::-webkit-scrollbar { width: 4px; }
.editor-container::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 2px; }
.editor-container:hover::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.15); }

/* ── ContentEditable ───────────────────────────────────────────────── */
.editor {
    background: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    
    padding: 12px 14px !important; 
    
    min-height: 100%;
    line-height: 1.6;
    font-size: 0.95rem;
    color: var(--lb-text);
    caret-color: var(--lb-accent);
    position: relative; /* Context for absolute placeholder */
}

.editor:empty::before,
.editor.is-empty::before {
    content: attr(data-placeholder);
    color: var(--lb-text-dim);
    opacity: 0.4;
    pointer-events: none;
    position: absolute;
    top: 12px;
    left: 14px;
}

/* Hide placeholder when locked */
:host(.locked) .editor::before,
.editorContext.locked .editor::before,
.editor-container.locked .editor::before {
    display: none !important;
}

.editor[contenteditable="false"] { opacity: 1; cursor: default; }


.editor a { color: var(--lb-accent); text-decoration: underline; cursor: pointer; }
.editor img { max-width: 100%; height: auto; border-radius: 8px; margin: 4px 0; }

/* Blocks */
.editor h1 { font-size: 1.7em; font-weight: 700; margin: 0.6em 0 0.3em 0; color: var(--lb-text); line-height: 1.2; }
.editor h2 { font-size: 1.4em; font-weight: 600; margin: 0.6em 0 0.3em 0; color: var(--lb-text); opacity: 0.95; }
.editor h3 { font-size: 1.15em; font-weight: 600; margin: 0.5em 0 0.3em 0; color: var(--lb-text); opacity: 0.9; }
.editor p { margin: 0.5em 0; }
.editor ul, .editor ol { margin: 0.5em 0; padding-left: 1.4em; color: var(--lb-text-dim); }
.editor li { margin-bottom: 0.2em; padding-left: 0.2em; color: var(--lb-text); }
.editor blockquote {
    border-left: 3px solid var(--lb-accent);
    margin: 0.8em 0;
    padding: 6px 12px;
    background: linear-gradient(90deg, rgba(var(--lb-accent-rgb), 0.1) 0%, transparent 100%);
    color: var(--lb-text-dim);
    font-style: italic;
    border-radius: 0 6px 6px 0;
}
.editor pre {
    background: rgba(0,0,0,0.3);
    padding: 10px;
    border-radius: 6px;
    font-family: monospace;
    overflow-x: auto;
    border: 1px solid var(--lb-border);
    margin: 0.8em 0;
    font-size: 0.9em;
}

.checkbox-char { cursor: pointer; font-family: 'Inter', sans-serif; margin-right: 6px; user-select: none; display: inline-block; vertical-align: middle; font-size: 1.1em; }
.checkbox-char.checked { color: var(--lb-accent); }

/* ── "Dock" (Transparent) ──────────────────────────────────── */
.glass-dock {
    position: absolute;
    /* V11: Extreme Negative bottom to consume parent padding */
    bottom: -25px; 
    left: 8px; right: 8px; 
    margin-bottom: 0 !important;
    
    display: flex;
    flex-wrap: wrap; 
    justify-content: center;
    align-items: center;
    gap: 2px; 
    
    background: rgba(20, 20, 20, 0.95);
    /* Reduced border radius so it sits flatter */
    border-radius: 8px; 
    border: 1px solid rgba(255,255,255,0.06); 
    /* Minimal padding */
    padding: 2px 4px;
    
    transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    opacity: 0.95;
    z-index: 100;
}
.glass-dock:hover, .glass-dock:focus-within {
    opacity: 1;
    background: rgba(20, 20, 20, 1);
    /* REMOVED translateY so it doesn't jump up */
    transform: none; 
}
.glass-dock.hidden {
    opacity: 0; pointer-events: none; transform: translateY(20px);
}

.dock-group {
    display: flex; align-items: center; gap: 0; 
    padding: 0 2px;
    border-right: 1px solid rgba(255,255,255,0.08); 
    flex-shrink: 0; 
}
.dock-group:last-child { border-right: none; }

.dock-btn {
    background: transparent; border: none; color: var(--lb-text-dim);
    width: 26px; height: 26px; 
    border-radius: 4px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.1s;
    flex-shrink: 0;
    position: relative; 
}
.dock-btn svg { width: 14px; height: 14px; }
.dock-btn:hover { background: rgba(255,255,255,0.08); color: var(--lb-text); }
.dock-btn input[type="color"] {
    position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;
}

/* ── Glass Modal ────────────────────────────────────────────────── */
.glass-modal {
    position: absolute; top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
    display: flex; align-items: center; justify-content: center;
    z-index: 500; opacity: 0; pointer-events: none; transition: opacity 0.2s;
}
.glass-modal.visible { opacity: 1; pointer-events: all; }
.modal-content {
    background: #1a1a1a; border: 1px solid var(--lb-border);
    border-radius: 10px; padding: 14px; width: 260px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.7);
    display: flex; flex-direction: column; gap: 10px;
}
.modal-title { font-weight: 600; font-size: 0.85em; margin-bottom: 2px; letter-spacing: 0.02em; text-transform: uppercase; opacity: 0.7; }
.modal-input {
    background: rgba(20,20,20,0.5); border: 1px solid var(--lb-border);
    border-radius: 6px; padding: 8px; color: var(--lb-text);
    font-family: inherit; outline: none; font-size: 0.9em;
}
.modal-input:focus { border-color: var(--lb-accent); background: rgba(0,0,0,0.2); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
.modal-btn {
    padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;
    font-size: 0.8em; font-weight: 600;
}
.modal-btn.cancel { background: transparent; color: var(--lb-text-dim); }
.modal-btn.confirm { background: var(--lb-accent); color: white; }

/* ── Lock Button ──────────────────────────────────────────────────── */
.top-lock-btn {
    position: absolute; top: 8px; right: 8px;
    width: 28px; height: 28px;
    border: none; background: rgba(0,0,0,0.2); 
    backdrop-filter: blur(4px); border-radius: 6px;
    color: var(--lb-text-dim); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; z-index: 200;
    border: 1px solid rgba(255,255,255,0.05); opacity: 0; 
}
:host(:hover) .top-lock-btn { opacity: 1; }
.top-lock-btn:hover { background: rgba(255,255,255,0.2); color: var(--lb-text); transform:scale(1.05); }
.top-lock-btn.locked { color: #ff453a; background: rgba(255, 69, 58, 0.15); border-color: rgba(255, 69, 58, 0.3); }

/* ── Sync Indicator ───────────────────────────────────────────────── */
.sync-status {
    position: absolute; bottom: 12px; right: 12px;
    display: flex; align-items: center; gap: 8px;
    pointer-events: none; opacity: 0; transition: opacity 0.3s;
}
.sync-status.visible { opacity: 1; }
.sync-dot { width: 5px; height: 5px; border-radius: 50%; background-color: var(--lb-text-dim); transition: background-color 0.3s; }
.sync-status.saving .sync-dot { background-color: var(--lb-accent); box-shadow: 0 0 6px var(--lb-accent); animation: pulse 1.5s infinite; }
.sync-status.saved .sync-dot { background-color: #2ecc71; box-shadow: 0 0 6px #2ecc71; }
.sync-status.dirty .sync-dot { background-color: #e67e22; transform: scale(0.9); }
.sync-status.error .sync-dot { background-color: #e74c3c; }

/* ── Image Resizer Button ────────────────────────────────────────── */
.img-resizer {
    position: absolute;
    width: 28px; height: 28px;
    background: rgba(var(--lb-accent-rgb), 0.95);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    color: white; cursor: pointer;
    display: none; align-items: center; justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 400;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.img-resizer.visible { display: flex; }
.img-resizer:hover { transform: scale(1.1); background: var(--lb-accent); }
.img-resizer svg { width: 14px; height: 14px; }

@keyframes pulse { 0% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.5; transform: scale(0.9); } }
`;

export class NotepadWidget extends HTMLElement {
    private _itemId: number = 0;
    private _content: string = '';
    private _isDirty: boolean = false;
    private _isLocked: boolean = true;
    private _isSaving: boolean = false;
    private _lastLockTime: number = 0;

    private _editor: HTMLDivElement | null = null;
    private _syncStatus: HTMLDivElement | null = null;
    private _dock: HTMLDivElement | null = null;
    private _editorContainer: HTMLDivElement | null = null;
    private _modal: HTMLDivElement | null = null;
    private _imgResizer: HTMLButtonElement | null = null;
    private _activeImage: HTMLImageElement | null = null;
    private _pendingAction: 'link' | 'image' | 'image-edit' | null = null;

    static get observedAttributes() { return ['item-id']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.loadContent();
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        i18n.subscribe(() => { if (this._editor) this._editor.dataset.placeholder = i18n.t('widget.notepad.placeholder'); });
    }

    disconnectedCallback() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    attributeChangedCallback(name: string, old: string, val: string) {
        if (name === 'item-id') {
            this._itemId = parseInt(val);
            this.loadContent();
        }
    }

    private handleBeforeUnload(e: BeforeUnloadEvent) {
        if (this._isDirty) { e.preventDefault(); e.returnValue = ''; }
    }

    private render() {
        if (!this.shadowRoot) return;

        // Inverted Lock Colors (Locked = Quiet, Unlocked = Alert)
        const lockClass = this._isLocked ? 'locked' : 'unlocked';
        const containerClass = this._isLocked ? 'locked' : '';
        const dockClass = this._isLocked ? 'hidden' : '';

        this.shadowRoot.innerHTML = `
            <style>
                ${CSS}
                /* V13: Override colors for inverted logic */
                .top-lock-btn {
                    /* Default (Unlocked/Edit Mode) -> Red/Alert */
                    color: #ff453a; 
                    background: rgba(255, 69, 58, 0.15); 
                    border-color: rgba(255, 69, 58, 0.3);
                }
                .top-lock-btn.locked {
                    /* Locked (Safe Mode) -> Dim/Gray */
                    color: var(--lb-text-dim); 
                    background: rgba(0,0,0,0.2); 
                    border-color: rgba(255,255,255,0.05);
                }
                .top-lock-btn.locked:hover {
                    background: rgba(255,255,255,0.1);
                    color: var(--lb-text);
                }
            </style>
            
             <button class="top-lock-btn ${lockClass}" id="lock-btn" title="${this._isLocked ? i18n.t('widget.notepad.tool.unlock') : i18n.t('widget.notepad.tool.lock')}">
                ${this._isLocked ? ICONS.lock : ICONS.unlock}
            </button>

            <div class="editor-container ${containerClass}">
                <div class="editor" contenteditable="${!this._isLocked}" data-placeholder="${i18n.t('widget.notepad.placeholder')}"></div>
            </div>

            <div class="glass-dock ${dockClass}" id="glass-dock">
                <div class="dock-group">
                    <button class="dock-btn" data-fmt="undo" title="${i18n.t('widget.notepad.tool.undo')}">${ICONS.undo}</button>
                    <button class="dock-btn" data-fmt="redo" title="${i18n.t('widget.notepad.tool.redo')}">${ICONS.redo}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="formatBlock:H1" title="${i18n.t('widget.notepad.tool.h1')}" style="width:30px;">${ICONS.h1}</button>
                    <button class="dock-btn" data-fmt="formatBlock:H2" title="${i18n.t('widget.notepad.tool.h2')}" style="width:30px;">${ICONS.h2}</button>
                    <button class="dock-btn" data-fmt="formatBlock:H3" title="${i18n.t('widget.notepad.tool.h3')}" style="width:30px;">${ICONS.h3}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="bold" title="${i18n.t('widget.notepad.tool.bold')}">${ICONS.bold}</button>
                    <button class="dock-btn" data-fmt="italic" title="${i18n.t('widget.notepad.tool.italic')}">${ICONS.italic}</button>
                    <button class="dock-btn" data-fmt="underline" title="${i18n.t('widget.notepad.tool.underline')}">${ICONS.underline}</button>
                    <button class="dock-btn" data-fmt="strikeThrough" title="${i18n.t('widget.notepad.tool.strike')}">${ICONS.strike}</button>
                    <button class="dock-btn" title="${i18n.t('widget.notepad.tool.color')}">
                        ${ICONS.color}
                        <input type="color" id="color-picker">
                    </button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="justifyLeft" title="${i18n.t('widget.notepad.tool.left')}">${ICONS.alignLeft}</button>
                    <button class="dock-btn" data-fmt="justifyCenter" title="${i18n.t('widget.notepad.tool.center')}">${ICONS.alignCenter}</button>
                    <button class="dock-btn" data-fmt="justifyRight" title="${i18n.t('widget.notepad.tool.right')}">${ICONS.alignRight}</button>
                    <button class="dock-btn" data-fmt="justifyFull" title="${i18n.t('widget.notepad.tool.justify')}">${ICONS.alignJustify}</button>
                </div>

                <div class="dock-group">
                     <button class="dock-btn" id="btn-link" title="${i18n.t('widget.notepad.tool.link')}">${ICONS.link}</button>
                     <button class="dock-btn" id="btn-image" title="${i18n.t('widget.notepad.tool.image')}">${ICONS.image}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="insertUnorderedList" title="${i18n.t('widget.notepad.tool.bullet')}">${ICONS.list}</button>
                    <button class="dock-btn" data-fmt="insertOrderedList" title="${i18n.t('widget.notepad.tool.number')}">${ICONS.ordered}</button>
                    <button class="dock-btn" data-fmt="insertChecklist" title="${i18n.t('widget.notepad.tool.check')}">${ICONS.check}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="formatBlock:BLOCKQUOTE" title="${i18n.t('widget.notepad.tool.quote')}">${ICONS.quote}</button>
                     <button class="dock-btn" data-fmt="formatBlock:PRE" title="${i18n.t('widget.notepad.tool.code')}">${ICONS.code}</button>
                    <button class="dock-btn" data-fmt="removeFormat" title="${i18n.t('widget.notepad.tool.clear')}">${ICONS.eraser_clean}</button>
                </div>
            </div>

            <div class="glass-modal" id="glass-modal">
                <div class="modal-content">
                    <div class="modal-title" id="modal-title">${i18n.t('widget.notepad.modal.title')}</div>
                    <input type="text" class="modal-input" id="modal-input-1">
                    <input type="text" class="modal-input" id="modal-input-2" style="display:none">
                    <div class="modal-actions">
                        <button class="modal-btn cancel" id="modal-cancel">${i18n.t('general.cancel')}</button>
                        <button class="modal-btn confirm" id="modal-confirm">${i18n.t('general.confirm')}</button>
                    </div>
                </div>
            </div>

            <div class="sync-status" id="sync-status">
                <div class="sync-dot"></div>
            </div>

             <button class="img-resizer" id="img-resizer" title="${i18n.t('widget.notepad.tool.update_image')}">
                ${ICONS.resize}
             </button>
        `;

        this._editor = this.shadowRoot.querySelector('.editor');
        this._editorContainer = this.shadowRoot.querySelector('.editor-container');
        this._syncStatus = this.shadowRoot.querySelector('#sync-status');
        this._dock = this.shadowRoot.querySelector('#glass-dock');
        this._modal = this.shadowRoot.querySelector('#glass-modal');
        this._imgResizer = this.shadowRoot.querySelector('#img-resizer');

        this.bindEvents();
    }

    private bindEvents() {
        if (!this._editor) return;

        this._editor.addEventListener('input', (e) => this.handleInput(e));
        this._editor.addEventListener('keydown', (e) => this.handleKeydown(e));
        this._editor.addEventListener('paste', (e) => this.handlePaste(e));
        this._editor.addEventListener('click', (e) => this.handleEditorClick(e));

        const lockBtn = this.shadowRoot?.querySelector('#lock-btn');
        if (lockBtn) {
            lockBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();

                const now = Date.now();
                if (now - this._lastLockTime < 300) return;
                this._lastLockTime = now;

                this.toggleLock();
            });
            lockBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        this.shadowRoot?.querySelectorAll('.dock-btn[data-fmt]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (this._isLocked) return;
                const fmt = (e.currentTarget as HTMLElement).dataset.fmt;
                if (fmt) {
                    if (fmt.includes(':')) {
                        const [cmd, val] = fmt.split(':');
                        this.executeFormat(cmd, val);
                    } else {
                        // Special logic for checklist toggling or other non-native commands
                        this.executeFormat(fmt);
                    }
                }
            });
        });

        const colorPicker = this.shadowRoot?.querySelector('#color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e: Event) => {
                const color = (e.target as HTMLInputElement).value;
                this.executeFormat('foreColor', color);
            });
        }

        this.shadowRoot?.querySelector('#btn-link')?.addEventListener('click', () => this.openModal('link'));
        this.shadowRoot?.querySelector('#btn-image')?.addEventListener('click', () => this.openModal('image'));

        this.shadowRoot?.querySelector('#modal-cancel')?.addEventListener('click', () => this.closeModal());
        this.shadowRoot?.querySelector('#modal-confirm')?.addEventListener('click', () => this.handleModalConfirm());
        this._imgResizer?.addEventListener('click', () => this.openModal('image-edit'));

        this._editorContainer?.addEventListener('scroll', () => this.hideResizer());
    }

    private openModal(type: 'link' | 'image' | 'image-edit') {
        if (!this._modal || this._isLocked) return;
        this._pendingAction = type;

        const title = this.shadowRoot?.querySelector('#modal-title');
        const input1 = this.shadowRoot?.querySelector('#modal-input-1') as HTMLInputElement;
        const input2 = this.shadowRoot?.querySelector('#modal-input-2') as HTMLInputElement;

        if (input1) input1.value = '';
        if (input2) input2.value = '';

        if (type === 'link') {
            if (title) title.textContent = i18n.t('widget.notepad.modal.link_title');
            if (input1) input1.placeholder = i18n.t('widget.notepad.modal.placeholder_url');
            if (input2) input2.style.display = 'none';
        } else if (type === 'image') {
            if (title) title.textContent = i18n.t('widget.notepad.modal.image_title');
            if (input1) input1.placeholder = i18n.t('widget.notepad.modal.placeholder_img');
            if (input2) {
                input2.style.display = 'block';
                input2.placeholder = i18n.t('widget.notepad.modal.placeholder_width');
            }
        } else if (type === 'image-edit' && this._activeImage) {
            if (title) title.textContent = i18n.t('widget.notepad.modal.image_edit_title');
            if (input1) {
                input1.placeholder = i18n.t('widget.notepad.modal.placeholder_img');
                input1.value = this._activeImage.src;
            }
            if (input2) {
                input2.style.display = 'block';
                input2.placeholder = i18n.t('widget.notepad.modal.placeholder_width');
                input2.value = this._activeImage.style.width || '';
            }
        }

        this._modal.classList.add('visible');
        setTimeout(() => input1?.focus(), 50);
    }

    private closeModal() {
        if (this._modal) this._modal.classList.remove('visible');
        this._pendingAction = null;
        this._editor?.focus();
    }

    private handleModalConfirm() {
        const input1 = this.shadowRoot?.querySelector('#modal-input-1') as HTMLInputElement;
        const input2 = this.shadowRoot?.querySelector('#modal-input-2') as HTMLInputElement;
        const val1 = input1?.value;
        const val2 = input2?.value;

        if (!val1) {
            this.closeModal();
            return;
        }

        // Must restore focus to editor to execute command
        this._editor?.focus();

        if (this._pendingAction === 'link') {
            document.execCommand('createLink', false, val1);
        } else if (this._pendingAction === 'image') {
            // V14.2 Fix: Use insertHTML for reliable image insertion
            const style = val2 ? ` style="width:${val2}; max-width:100%;"` : ' style="max-width:100%;"';
            const html = `<img src="${val1}"${style} />`;
            document.execCommand('insertHTML', false, html);
        } else if (this._pendingAction === 'image-edit' && this._activeImage) {
            this._activeImage.src = val1;
            if (val2) this._activeImage.style.width = val2;
            else this._activeImage.style.width = '';
            this._isDirty = true;
            this.setStatus('dirty');
        }

        this.closeModal();
        this.hideResizer();
    }

    private executeFormat(cmd: string, val?: string) {
        this._editor?.focus();

        if (cmd === 'insertChecklist') {
            const span = `<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;`;
            document.execCommand('insertHTML', false, span);
        } else if (cmd === 'removeFormat') {
            // V14.2 Fix: Hard Clear (Strip Block Tags + Inline Styles)
            document.execCommand('removeFormat');
            document.execCommand('formatBlock', false, 'p'); // Reset to paragraph
            document.execCommand('unlink'); // Remove links
        } else {
            document.execCommand(cmd, false, val);
        }
    }

    private toggleLock() {
        this._isLocked = !this._isLocked;
        this.updateLockState();
        if (this._isLocked && this._isDirty) this.save();
    }

    private updateLockState() {
        if (this._editor) this._editor.contentEditable = this._isLocked ? 'false' : 'true';

        const lockBtn = this.shadowRoot?.querySelector('#lock-btn');
        if (lockBtn) {
            lockBtn.classList.toggle('locked', this._isLocked);
            lockBtn.innerHTML = this._isLocked ? ICONS.lock : ICONS.unlock;
            lockBtn.setAttribute('title', this._isLocked ? i18n.t('widget.notepad.tool.unlock') : i18n.t('widget.notepad.tool.lock'));
        }

        if (this._dock) {
            if (this._isLocked) this._dock.classList.add('hidden');
            else this._dock.classList.remove('hidden');
        }

        if (this._editorContainer) this._editorContainer.classList.toggle('locked', this._isLocked);

        // Auto-focus when unlocking
        if (!this._isLocked && this._editor) {
            setTimeout(() => {
                this._editor?.focus();
                // Ensure caret is at the end or start? standard focus usually puts it at start or selects all. 
                // For empty content, it will just place caret.
            }, 10);
        }
    }

    private handleInput(e: Event) {
        if (this._isLocked) return;
        this.hideResizer();
        this.checkPlaceholder();
        this._isDirty = true;
        this.setStatus('dirty');
        this.checkInputRules();
    }

    private handleEditorClick(e: MouseEvent) {
        if (this._isLocked) return;

        let target = e.target as HTMLElement;

        // Image Selection (V15)
        if (target instanceof HTMLImageElement) {
            this._activeImage = target;
            this.showResizer(target);
            return;
        } else if (!target.closest('#img-resizer')) {
            this.hideResizer();
            this._activeImage = null;
        }

        if (target.classList.contains('checkbox-char')) {
            e.preventDefault(); e.stopPropagation();
            if (target.textContent === '☐') {
                target.textContent = '☑'; target.classList.add('checked');
            } else {
                target.textContent = '☐'; target.classList.remove('checked');
            }
            this._isDirty = true; this.setStatus('dirty');
        }
    }

    private showResizer(img: HTMLImageElement) {
        if (!this._imgResizer) return;
        const rect = img.getBoundingClientRect();
        const hostRect = this.getBoundingClientRect();

        // Calculate position relative to host
        const top = rect.top - hostRect.top;
        const right = rect.right - hostRect.left;

        this._imgResizer.style.top = `${top + 8}px`;
        this._imgResizer.style.left = `${right - 36}px`;
        this._imgResizer.classList.add('visible');
    }

    private hideResizer() {
        this._imgResizer?.classList.remove('visible');
    }

    private handleKeydown(e: KeyboardEvent) {
        if (this._isLocked) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '  ');
        }

        // Robust Checklist Logic (Enter & Backspace)
        const isChecklist = (text: string) => /^[☐☑]/.test(text.trim());
        const isEmptyChecklist = (text: string) => text.replace(/[☐☑\s\u00A0\u200B]/g, '').length === 0;

        if (e.key === 'Enter') {
            const sel = this.getSelection();
            if (sel && sel.anchorNode) {
                const node = sel.anchorNode;
                const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
                const textContent = element?.textContent || "";

                if (isChecklist(textContent)) {
                    // Check if line is empty (just the checkbox) -> Remove it (end list)
                    if (isEmptyChecklist(textContent)) {
                        e.preventDefault();
                        // Clear the line completely
                        document.execCommand('delete');
                        // Force a clean break (exit list mode)
                        // If we are in a block, replace it with <br>
                        if (element.tagName === 'DIV' || element.tagName === 'P') {
                            element.innerHTML = '<br>';
                        } else {
                            document.execCommand('insertHTML', false, '<br>');
                        }
                    } else {
                        // Non-empty line: Insert new line with checkbox
                        e.preventDefault();

                        // Strategy: Create a new block element instead of using <br> which causes spacing issues
                        // Find the closest block parent
                        let block = element;
                        while (block && block !== this._editor && block.tagName !== 'DIV' && block.tagName !== 'P') {
                            block = block.parentElement as HTMLElement;
                        }

                        // If we are strictly inside the editor but no block, we wrap in div? 
                        // Or just use insertHTML with div?
                        if (!block || block === this._editor) {
                            // Fallback for messy HTML
                            const span = `<br><span class="checkbox-char" contenteditable="false">☐</span>&nbsp;`;
                            document.execCommand('insertHTML', false, span);
                        } else {
                            // Clean block insertion
                            const newBlock = document.createElement(block.tagName);
                            // V14.2: Copy alignment styles to new checklist item
                            if (block instanceof HTMLElement) {
                                newBlock.style.textAlign = block.style.textAlign;
                            }
                            newBlock.innerHTML = `<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;`;

                            if (block.nextSibling) {
                                block.parentNode?.insertBefore(newBlock, block.nextSibling);
                            } else {
                                block.parentNode?.appendChild(newBlock);
                            }

                            // Move cursor to new block
                            const range = document.createRange();
                            range.selectNodeContents(newBlock);
                            range.collapse(false);

                            const sel = this.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    }
                    return;
                }
            }
        }

        if (e.key === 'Backspace') {
            const sel = this.getSelection();
            if (sel && sel.isCollapsed && sel.anchorNode) {
                const node = sel.anchorNode;
                const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
                const textContent = element?.textContent || "";

                // Case 1: Standard Check (Empty Line)
                if (isChecklist(textContent) && isEmptyChecklist(textContent)) {
                    e.preventDefault();
                    if (element.tagName === 'DIV' || element.tagName === 'P') {
                        element.innerHTML = '<br>';
                    } else {
                        document.execCommand('delete');
                    }
                    return;
                }

                // Case 2: Zombie Check (Cursor after contenteditable=false span)
                if (sel.anchorOffset === 0) {
                    // Start of Text Node -> Check previous sibling
                    if (node.nodeType === Node.TEXT_NODE) {
                        const prev = node.previousSibling;
                        if (prev && prev.nodeType === Node.ELEMENT_NODE && (prev as Element).classList.contains('checkbox-char')) {
                            e.preventDefault();
                            prev.remove();
                            return;
                        }
                    }
                    // Start of Element -> Check previous element in childNodes?
                    // Usually if offset is 0 in element, we are at start of element content.
                }

                // Case 3: Cursor in Element after the span (offset > 0)
                if (node.nodeType === Node.ELEMENT_NODE && sel.anchorOffset > 0) {
                    const child = (node as Element).childNodes[sel.anchorOffset - 1];
                    if (child && child.nodeType === Node.ELEMENT_NODE && (child as Element).classList.contains('checkbox-char')) {
                        e.preventDefault();
                        child.remove();
                        return;
                    }
                }
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.save();
        }
    }

    private handlePaste(e: ClipboardEvent) {
        if (this._isLocked) return;
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') ?? '';
        document.execCommand('insertText', false, text);
    }

    private checkInputRules() {
        const sel = this.getSelection();
        if (!sel || !sel.isCollapsed) return;
        const anchorNode = sel.anchorNode;
        if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE) return;
        const text = anchorNode.textContent || '';
        const offset = sel.anchorOffset;
        const textBefore = text.slice(0, offset);

        const rules = [
            { match: /^#\s$/, cmd: 'formatBlock', val: 'H1' },
            { match: /^##\s$/, cmd: 'formatBlock', val: 'H2' },
            { match: /^###\s$/, cmd: 'formatBlock', val: 'H3' },
            { match: /^>\s$/, cmd: 'formatBlock', val: 'BLOCKQUOTE' },
            { match: /^-\s$/, cmd: 'insertUnorderedList', val: null },
            { match: /^\*\s$/, cmd: 'insertUnorderedList', val: null },
            { match: /^1\.\s$/, cmd: 'insertOrderedList', val: null },
            { match: /^\[\]\s$/, cmd: 'insertChecklist', val: null },
            { match: /^---\s$/, cmd: 'insertHorizontalRule', val: null }
        ];

        for (const rule of rules) {
            if (rule.match.test(textBefore)) {
                const range = document.createRange();
                range.setStart(anchorNode, 0);
                range.setEnd(anchorNode, offset);
                range.deleteContents();

                if (rule.cmd === 'insertChecklist') {
                    const span = `<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;`;
                    document.execCommand('insertHTML', false, span);
                } else if (rule.cmd === 'insertHorizontalRule') {
                    document.execCommand('insertHorizontalRule');
                } else {
                    document.execCommand(rule.cmd, false, rule.val as string);
                }
                return;
            }
        }
    }

    private checkPlaceholder() {
        if (!this._editor) return;
        // Check if content is empty or just <br>
        const text = this._editor.innerText.trim();
        const isEmpty = text === '' && this._editor.querySelectorAll('img').length === 0;

        if (isEmpty) {
            this._editor.classList.add('is-empty');
        } else {
            this._editor.classList.remove('is-empty');
        }
    }

    private async loadContent() {
        if (!this._itemId) return;
        const state = dashboardStore.getState();
        const item = state.items.find((i: any) => i.id === this._itemId);
        if (item) {
            const contentObj = WidgetContentHelper.parse(item.content);
            const html = (contentObj as any).text || '';
            if (this._editor && this._editor.innerHTML !== html) {
                this._editor.innerHTML = html;
            }
            this._content = html;
            this.checkPlaceholder();
        }
    }

    private async save(sync: boolean = false) {
        if (!this._itemId || !this._editor) return;
        const currentHTML = this._editor.innerHTML;

        this._isSaving = true;
        this.setStatus('saving');

        try {
            const state = dashboardStore.getState();
            const currentItem = state.items.find((i: any) => i.id === this._itemId);
            if (currentItem) {
                const newContent = WidgetContentHelper.setNotepadText(currentItem.content, currentHTML);
                dashboardStore.updateItem({ ...currentItem, content: newContent }).then(() => {
                    this._isDirty = false;
                    this.setStatus('saved');
                });
            }
        } catch (e) {
            console.error(e);
            this.setStatus('error');
        } finally {
            this._isSaving = false;
        }
    }

    private setStatus(state: 'saving' | 'saved' | 'error' | 'dirty' | 'idle') {
        if (!this._syncStatus) return;
        this._syncStatus.className = 'sync-status';
        this._syncStatus.classList.add('visible');

        switch (state) {
            case 'saving': this._syncStatus.classList.add('saving'); break;
            case 'saved':
                this._syncStatus.classList.add('saved');
                setTimeout(() => { this._syncStatus?.classList.remove('visible'); }, 2000);
                break;
            case 'dirty': this._syncStatus.classList.add('dirty'); break;
            case 'error': this._syncStatus.classList.add('error'); break;
            case 'idle': this._syncStatus.classList.remove('visible'); break;
        }
    }

    private getSelection() {
        const root = this.shadowRoot as any;
        return root.getSelection ? root.getSelection() : document.getSelection();
    }
}

customElements.define('widget-notepad', NotepadWidget);
